<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Developer;
use App\Models\FrameUsageLog;
use App\Models\Task;
use App\Models\TaskDevice;
use App\Models\User;
use App\Jobs\LogTaskExecution;
use App\Jobs\SendWebhookNotification;
use App\Helpers\WebSocketHelper;
use Exception;
use Swoole\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Swoole\WebSocket\Server;
use Swoole\WebSocket\Frame;
use Swoole\Timer;

class WebSocketService
{
    private ?Server $server = null;
    private array $config;
    private array $deviceConnections = [];
    private array $connectionInfo = [];
    private array $quotaExceededSet = [];
    private array $devRawWritten = [];
    private string $redisPrefix = 'ws:device:';

    public function __construct()
    {
        $this->config = [
            'host' => env('WS_HOST', '0.0.0.0'),
            'port' => env('WS_PORT', 9502),
            'worker_num' => env('WS_WORKER_NUM', 4),
            'daemonize' => env('WS_DAEMONIZE', false),
            'pid_file' => storage_path('logs/websocket.pid'),
            'log_file' => storage_path('logs/websocket.log'),
            'log_level' => env('WS_LOG_LEVEL', 0),
        ];
    }

    public function start(): void
    {
        if (!extension_loaded('swoole')) {
            throw new \RuntimeException('Swoole 扩展未安装');
        }

        $this->server = new Server($this->config['host'], $this->config['port']);

        $this->server->set([
            'worker_num' => $this->config['worker_num'],
            'daemonize' => $this->config['daemonize'],
            'pid_file' => $this->config['pid_file'],
            'log_file' => $this->config['log_file'],
            'log_level' => $this->config['log_level'],
            'max_request' => 10000,
            'heartbeat_idle_time' => 35,
            'heartbeat_check_interval' => 10,
        ]);

        $this->server->on('start', [$this, 'onStart']);
        $this->server->on('workerStart', [$this, 'onWorkerStart']);
        $this->server->on('open', [$this, 'onOpen']);
        $this->server->on('message', [$this, 'onMessage']);
        $this->server->on('close', [$this, 'onClose']);
        $this->server->on('workerStop', [$this, 'onWorkerStop']);

        echo "WebSocket 服务器启动在 {$this->config['host']}:{$this->config['port']}\n";
        $this->server->start();
    }

    public function onStart(Server $server): void
    {
        echo "Swoole WebSocket 服务器启动成功\n";
        echo "主进程 PID: {$server->master_pid}\n";
    }

    public function onWorkerStart(Server $server, int $workerId): void
    {
        echo "Worker #{$workerId} 启动\n";

        Timer::tick(1000, function () use ($server) {
            $this->processTaskQueue($server);
            $this->checkDeviceExpirations($server);
        });

        // 每 30 秒兜底修复：关闭超过 120 秒未结束的流水
        Timer::tick(30000, function () {
            $this->repairStaleStreamLogs();
        });
    }

    private function processTaskQueue(Server $server): void
    {
        foreach ($this->deviceConnections as $androidId => $fd) {
            if (!$server->isEstablished($fd)) {
                continue;
            }

            $task = WebSocketHelper::getTaskFromQueue($androidId);
            if ($task && isset($task['task_id']) && isset($task['key']) && isset($task['name'])) {
                $taskData = $task['task_data'] ?? null;
                if (is_array($taskData) && empty($taskData)) {
                    $taskData = null;
                }

                $this->sendMessage($server, $fd, [
                    'type' => 'task',
                    'task_id' => $task['task_id'],
                    'task_device_id' => $task['task_device_id'] ?? 0,
                    'key' => $task['key'],
                    'name' => $task['name'],
                    'task_data' => $taskData,
                    'reserve' => $task['reserve'] ?? false,
                ]);

                Log::info("从队列发送任务到设备", [
                    'android_id' => $androidId,
                    'fd' => $fd,
                    'task_id' => $task['task_id'],
                    'key' => $task['key'],
                    'reserve' => $task['reserve'] ?? false,
                ]);
            }

            $cmd = WebSocketHelper::getCommandFromQueue($androidId);
            if ($cmd) {
                $this->sendMessage($server, $fd, $cmd);
                Log::info("从队列发送指令到设备", [
                    'android_id' => $androidId,
                    'fd' => $fd,
                    'command' => $cmd['command'] ?? 'unknown',
                ]);
            }
        }
    }

    protected function verifySecret(Request $request): array
    {
        try {
            $androidId = $request->get['android_id'] ?? '';
            $token = $request->get['token'] ?? '';

            if (empty($androidId) || empty($token)) {
                return ['code' => 1, 'msg' => '参数不完整'];
            }

            $device = Device::where('android_id', $androidId)->first();

            if (!$device) {
                return ['code' => 1, 'msg' => '设备未绑定'];
            }

            if ($device->card_key !== $token) {
                return ['code' => 1, 'msg' => 'token 验证失败'];
            }

            if ($device->expired_at && $device->expired_at->isPast()) {
                return ['code' => 1, 'msg' => '设备已过期'];
            }

            return ['code' => 0, 'msg' => '验证通过', 'device' => $device];
        } catch (Exception $e) {
            return ['code' => 1, 'msg' => $e->getMessage()];
        }
    }

    public function onOpen(Server $server, $request): void
    {
        $fd = $request->fd;
        echo "客户端连接: FD #{$fd}\n";

        $androidId = $request->get['android_id'] ?? '';
        $res = $this->verifySecret($request);
        if (!isset($res['code']) || $res['code'] === 1 || !isset($res['device'])) {
            $this->sendMessage($server, $fd, [
                'type' => 'error',
                'message' => $res['msg'] ?? 'token 验证失败',
            ]);
            $server->close($fd);
            return;
        }

        $device = $res['device'];

        $this->connectionInfo[$fd] = [
            'android_id' => $androidId,
            'device_id' => $device->id,
            'user_id' => $device->user_id,
        ];

        if (isset($this->deviceConnections[$androidId])) {
            $oldFd = $this->deviceConnections[$androidId];
            if ($server->isEstablished($oldFd)) {
                $server->close($oldFd);
            }
            unset($this->connectionInfo[$oldFd]);
        }

        $this->deviceConnections[$androidId] = $fd;

        // 清空残留的命令队列，避免设备重连时自动触发旧的 stream_start 等指令
        WebSocketHelper::clearCommandQueue($androidId);

        $this->setDeviceOnline($androidId);

        $this->sendMessage($server, $fd, [
            'type' => 'connected',
            'message' => '连接成功',
            'android_id' => $androidId,
        ]);

        // 设备上线通知
        if ($device->developer_id) {
            $devName = $device->name ?: $device->android_id;
            SendWebhookNotification::dispatch(
                $device->developer_id, 'device_online', '设备上线',
                $device->android_id, $devName, '设备已上线'
            );
        }

        Log::info("设备连接成功", [
            'fd' => $fd,
            'android_id' => $androidId,
        ]);
    }

    public function onMessage(Server $server, Frame $frame): void
    {
        $fd = $frame->fd;
        $data = json_decode($frame->data, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendMessage($server, $fd, [
                'type' => 'error',
                'message' => '无效的 JSON 数据',
            ]);
            return;
        }

        if (!isset($data['type'])) {
            $this->sendMessage($server, $fd, [
                'type' => 'error',
                'message' => '缺少 type 字段',
            ]);
            return;
        }

        if (!isset($this->connectionInfo[$fd])) {
            $this->sendMessage($server, $fd, [
                'type' => 'error',
                'message' => '连接未认证',
            ]);
            return;
        }

        $connectionInfo = $this->connectionInfo[$fd];
        $androidId = $connectionInfo['android_id'];
        $userId = $connectionInfo['user_id'];
        $deviceId = $connectionInfo['device_id'];

        switch ($data['type']) {
            case 'heartbeat':
                $this->setDeviceOnline($androidId);
                $this->sendMessage($server, $fd, [
                    'type' => 'heartbeat',
                    'message' => 'pong',
                ]);
                break;

            case 'task_result':
                $this->handleTaskResult($server, $fd, $data, $deviceId);
                break;

            case 'task_received':
                $this->handleTaskReceived($server, $fd, $data, $deviceId);
                break;

            case 'task_log':
                $this->handleTaskLog($server, $fd, $data, $deviceId);
                break;

            case 'stream_heartbeat':
                $this->handleStreamHeartbeat($deviceId, $data);
                break;

            case 'stream_end':
                $this->handleStreamEnd($deviceId, $data);
                break;

            default:
                $this->sendMessage($server, $fd, [
                    'type' => 'error',
                    'message' => '未知的消息类型: ' . $data['type'],
                ]);
        }
    }

    private const STREAM_ALIVE_PREFIX = 'ws:stream:alive:';
    private const STREAM_LOG_PREFIX = 'ws:stream:log:';
    private const KB_PER_FPS_PER_SEC = 3;

    private int $lastExpirationCheck = 0;

    private function checkDeviceExpirations(Server $server): void
    {
        $now = time();
        if ($now - $this->lastExpirationCheck < 30) return;
        $this->lastExpirationCheck = $now;

        if (empty($this->connectionInfo)) return;

        $deviceIds = [];
        foreach ($this->connectionInfo as $info) {
            if (!empty($info['device_id'])) {
                $deviceIds[] = $info['device_id'];
            }
        }
        if (empty($deviceIds)) return;

        try {
            $expiredIds = Device::whereIn('id', $deviceIds)
                ->whereNotNull('expired_at')
                ->where('expired_at', '<=', now())
                ->pluck('id')
                ->toArray();

            foreach ($this->connectionInfo as $fd => $info) {
                $deviceId = $info['device_id'] ?? null;
                if ($deviceId && in_array($deviceId, $expiredIds)) {
                    if ($server->isEstablished($fd)) {
                        $this->sendMessage($server, $fd, [
                            'type' => 'error',
                            'message' => '设备已过期，即将断开连接',
                        ]);
                        $server->close($fd);
                    }
                    Log::info('过期设备已断开', [
                        'device_id' => $deviceId,
                        'android_id' => $info['android_id'] ?? '',
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::warning('checkDeviceExpirations 异常: ' . $e->getMessage());
        }
    }

    private function handleStreamHeartbeat(int $deviceId, array $data): void
    {
        try {
            $device = Device::find($deviceId);
            if (!$device) return;
            if ($device->expired_at && $device->expired_at->isPast()) return;

            $redis = Redis::connection()->client();
            $redis->setex(self::STREAM_ALIVE_PREFIX . $deviceId, 60, '1');

            $logKey = self::STREAM_LOG_PREFIX . $deviceId;
            $logId = $redis->get($logKey);
            if (!$logId) {
                // Redis key 丢失时，先查 DB 是否有未关闭的 log，避免重复创建
                $existing = FrameUsageLog::where('device_id', $deviceId)
                    ->whereNull('ended_at')
                    ->orderByDesc('id')
                    ->first();
                if ($existing) {
                    $logId = $existing->id;
                    $redis->setex($logKey, 3600, $logId);
                } else {
                    $log = FrameUsageLog::create([
                        'developer_id' => $device->developer_id,
                        'user_id' => $device->user_id,
                        'device_id' => $deviceId,
                        'started_at' => now(),
                        'frames_consumed' => 0,
                    ]);
                    $logId = $log->id;
                    $redis->setex($logKey, 3600, $logId);
                }
            }

            // 累加 Android 上报的真实 TX 字节
            $delta = (int)($data['tx_bytes_delta'] ?? 0);
            if ($delta > 0 && $logId) {
                $log = FrameUsageLog::find($logId);
                if ($log && !$log->ended_at) {
                    $log->increment('frames_consumed', $delta);
                }
            }
        } catch (\Exception $e) {
            Log::warning('处理 stream_heartbeat 失败: ' . $e->getMessage());
        }
    }

    private function handleStreamEnd(int $deviceId, array $data): void
    {
        try {
            $redis = Redis::connection()->client();
            $logKey = self::STREAM_LOG_PREFIX . $deviceId;
            $logId = $redis->get($logKey);

            // 清理 Redis 标记
            $redis->del(self::STREAM_ALIVE_PREFIX . $deviceId);
            $redis->del($logKey);

            // 优先用 Redis 记录的 logId，降级到 DB 查询
            $log = $logId ? FrameUsageLog::find($logId) : null;
            if (!$log || $log->ended_at) {
                $log = FrameUsageLog::where('device_id', $deviceId)
                    ->whereNull('ended_at')
                    ->orderByDesc('id')
                    ->first();
                if ($log) {
                    $logId = $log->id;
                }
            }

            if (!$log || $log->ended_at) return;

            // 流量：优先用 heartbeat 累加的真实字节，其次用 stream_end 上报值，最后估算
            $frameBytes = (int)$log->frames_consumed;
            if ($frameBytes <= 0) {
                $frameBytes = (int)($data['tx_bytes'] ?? 0);
            }
            if ($frameBytes <= 0) {
                $frameBytes = 10 * self::KB_PER_FPS_PER_SEC * 1024; // 先设最小兜底，update 后由 SQL 重算
            }

            $log->update([
                'ended_at' => now(),
                'frames_consumed' => $frameBytes,
            ]);

            $log->refresh();
            $this->deductBalance($log, (int)$log->frames_consumed);

            Log::info("stream_end 计费完成", [
                'device_id' => $deviceId,
                'frame_bytes' => (int)$log->frames_consumed,
            ]);
        } catch (\Exception $e) {
            Log::warning('处理 stream_end 失败: ' . $e->getMessage());
        }
    }

    private function maxQualityFromLog(FrameUsageLog $log): int
    {
        return 10;
    }

    private function repairStaleStreamLogs(): void
    {
        try {
            $staleLogs = FrameUsageLog::whereNull('ended_at')
                ->where('started_at', '<', now()->subSeconds(120))
                ->get();

            foreach ($staleLogs as $log) {
                $log->update([
                    'ended_at' => now(),
                    'frames_consumed' => DB::raw('IF(frames_consumed > 0, frames_consumed, GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, NOW())) * ' . (10 * self::KB_PER_FPS_PER_SEC * 1024) . ')'),
                ]);
                $log->refresh();
                $this->deductBalance($log, (int)$log->frames_consumed);
            }
        } catch (\Exception $e) {
            Log::warning('repairStaleStreamLogs 异常: ' . $e->getMessage());
        }
    }

    private function deductBalance(FrameUsageLog $log, int $trafficKb): void
    {
        if ($log->user_id) {
            $user = User::find($log->user_id);
            if ($user) {
                $deduct = min($user->device_frame_balance, $trafficKb);
                if ($deduct > 0) {
                    $user->decrement('device_frame_balance', $deduct);
                }
            }
        }
        if ($log->developer_id) {
            // 从池子消费（FIFO by expiry），并同步余额
            \App\Models\FrameBalancePool::consume($log->developer_id, $trafficKb);
            \App\Models\FrameBalancePool::syncDeveloperBalance($log->developer_id);
        }
    }

    private function checkStreamTimeouts(): void
    {
        try {
            $redis = Redis::connection()->client();
            $pattern = self::STREAM_LOG_PREFIX . '*';
            $keys = $redis->keys($pattern);

            foreach ($keys as $logKey) {
                $deviceId = str_replace(self::STREAM_LOG_PREFIX, '', $logKey);
                $aliveKey = self::STREAM_ALIVE_PREFIX . $deviceId;

                if ($redis->exists($aliveKey)) continue;

                $logId = $redis->get($logKey);
                $redis->del($aliveKey);
                $redis->del($logKey);

                if (!$logId) continue;

                $log = FrameUsageLog::find($logId);
                if (!$log || $log->ended_at) continue;

                $log->update([
                    'ended_at' => now(),
                    'frames_consumed' => DB::raw('IF(frames_consumed > 0, frames_consumed, GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, NOW())) * ' . (10 * self::KB_PER_FPS_PER_SEC * 1024) . ')'),
                ]);

                $log->refresh();
                $this->deductBalance($log, (int)$log->frames_consumed);

                Log::info("推流心跳超时，强制结束", [
                    'device_id' => $deviceId,
                    'frame_bytes' => (int)$log->frames_consumed,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('checkStreamTimeouts 异常: ' . $e->getMessage());
        }
    }

    private function closeOpenStreamLog(int $deviceId): void
    {
        try {
            $redis = Redis::connection()->client();
            $logKey = self::STREAM_LOG_PREFIX . $deviceId;
            $logId = $redis->get($logKey);

            $redis->del(self::STREAM_ALIVE_PREFIX . $deviceId);
            $redis->del($logKey);

            if (!$logId) return;

            $log = FrameUsageLog::find($logId);
            if (!$log || $log->ended_at) return;

            $log->update([
                'ended_at' => now(),
                'frames_consumed' => DB::raw('IF(frames_consumed > 0, frames_consumed, GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, NOW())) * ' . (10 * self::KB_PER_FPS_PER_SEC * 1024) . ')'),
            ]);

            $log->refresh();
            $this->deductBalance($log, (int)$log->frames_consumed);

            Log::info("设备断开，推流账单结束", [
                'device_id' => $deviceId,
                'frame_bytes' => (int)$log->frames_consumed,
            ]);
        } catch (\Exception $e) {
            Log::warning('closeOpenStreamLog 异常: ' . $e->getMessage());
        }
    }

    private function handleTaskReceived(Server $server, int $fd, array $data, int $deviceId): void
    {
        if (!isset($data['task_id'])) {
            return;
        }

        $taskId = $data['task_id'];

        $task = Task::query()->where('id', $taskId)->first();
        if ($task) {
            LogTaskExecution::dispatch($task->id, $deviceId, TaskDevice::STATUS_RUNNING);
            $device = Device::find($deviceId);
            $devId = $device ? ($device->android_id ?: '') : '';
            $devName = $device ? ($device->name ?: $device->android_id) : '设备#' . $deviceId;
            SendWebhookNotification::dispatch(
                $task->developer_id, 'task_start', '任务开始执行',
                $devId, $devName,
                sprintf('任务「%s」已开始执行', $task->name)
            );
        }
    }

    private function handleTaskLog(Server $server, int $fd, array $data, int $deviceId): void
    {
        if (empty($data['task_id']) || !isset($data['message']) || $data['message'] === '') {
            Log::warning('task_log 缺少参数', ['data' => $data, 'device_id' => $deviceId]);
            return;
        }

        $taskId = $data['task_id'];
        $taskDeviceId = $data['task_device_id'] ?? 0;
        $level = $data['level'] ?? 'info';
        $message = $data['message'];

        // 优先用 task_device_id 直接查
        $taskDevice = null;
        if ($taskDeviceId > 0) {
            $taskDevice = TaskDevice::find($taskDeviceId);
        }
        // fallback: device_id + task_id
        if (!$taskDevice) {
            $taskDevice = TaskDevice::where('task_id', $taskId)->where('device_id', $deviceId)->first();
        }
        if (!$taskDevice) {
            Log::warning('task_log 找不到 TaskDevice', [
                'task_id' => $taskId, 'task_device_id' => $taskDeviceId, 'device_id' => $deviceId,
            ]);
            return;
        }

        $maxChars = (int)\App\Models\Option::getValue('storage_log_max_chars', 1024);
        if (mb_strlen($message) > $maxChars) {
            $message = sprintf('本条记录超过%d字符，无法上传', $maxChars);
        }

        $dir = storage_path('logs/tasks');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $logPath = $dir . '/' . $taskId . '_' . $taskDevice->id . '.log';

        $microtime = $data['timestamp'] ?? microtime(true);
        $ts = is_numeric($microtime) ? (float) $microtime : microtime(true);
        if ($ts > 1e12) $ts = $ts / 1000;
        $dt = \DateTime::createFromFormat('U.u', sprintf('%.6f', $ts));
        $timeStr = $dt ? $dt->format('Y-m-d H:i:s.u') : now()->format('Y-m-d H:i:s.u');

        $line = sprintf("[%s] [%s] %s\n", $timeStr, strtoupper($level), $message);

        $task = Task::find($taskId);
        $dailyQuotaChars = (int)\App\Models\Option::getValue('storage_log_daily_quota_chars', 0);
        if ($dailyQuotaChars > 0 && $task && $task->developer_id) {
            $devId = (string)$task->developer_id;
            if (isset($this->quotaExceededSet[$devId])) return;

            $this->devRawWritten[$devId] = ($this->devRawWritten[$devId] ?? 0) + mb_strlen($line);

            // 重新计算：DB 中已导出的 + 内存中正在累积的
            $dbChars = (int)\App\Models\TaskLogFile::whereDate('created_at', today())
                ->whereIn('task_id', Task::where('developer_id', $task->developer_id)->pluck('id'))
                ->sum('raw_chars');
            $totalChars = $dbChars + $this->devRawWritten[$devId];

            if ($totalChars >= $dailyQuotaChars) {
                $this->quotaExceededSet[$devId] = true;
                $capLine = sprintf("[%s] [INFO] 日志已达到日上限 %s 字符，后续日志已丢弃\n",
                    now()->format('Y-m-d H:i:s.u'), number_format($dailyQuotaChars));
                file_put_contents($logPath, $capLine, FILE_APPEND | LOCK_EX);
                return;
            }
        }

        file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
    }

    private function handleTaskResult(Server $server, int $fd, array $data, int $deviceId): void
    {
        if (!isset($data['task_id'])) {
            $this->sendMessage($server, $fd, ['type' => 'error', 'message' => '缺少 task_id 字段']);
            return;
        }

        $taskId = $data['task_id'];
        $status = $data['status'] ?? null;
        $errorMessage = $data['error_message'] ?? null;

        if ($status !== 'success' && $status !== 'failed') {
            $this->sendMessage($server, $fd, ['type' => 'error', 'message' => 'status 必须是 success 或 failed']);
            return;
        }

        $task = Task::query()->where('id', $taskId)->first();
        if (!$task) {
            $this->sendMessage($server, $fd, ['type' => 'error', 'message' => '任务不存在: ' . $taskId]);
            return;
        }

        $dbStatus = $status === 'success' ? TaskDevice::STATUS_COMPLETED : TaskDevice::STATUS_FAILED;

        // 同步更新 TaskDevice 状态（必须在 checkAndUpdateTaskStatus 之前执行）
        $taskDevice = TaskDevice::where('task_id', $task->id)
            ->where('device_id', $deviceId)
            ->first();
        if ($taskDevice) {
            $taskDevice->update([
                'status'       => $dbStatus,
                'error_reason' => $errorMessage,
                'finished_at'  => now(),
            ]);
        }

        // 更新任务级统计
        if ($status === 'success') {
            $task->increment('success_count');
        } else {
            $task->increment('fail_count');
        }

        $connInfo = $this->connectionInfo[$fd] ?? [];
        $androidId = $connInfo['android_id'] ?? '';
        if ($androidId) WebSocketHelper::setDeviceBusy($androidId, false);

        $this->updateDeviceTaskStats($deviceId, $status);

        $this->checkAndUpdateTaskStatus($task->id);

        // 任务完成通知
        $device = Device::find($deviceId);
        $devId = $device ? ($device->android_id ?: '') : '';
        $devName = $device ? ($device->name ?: $device->android_id) : '设备#' . $deviceId;
        $label = $status === 'success' ? '执行成功' : '执行失败';
        $detail = sprintf('任务「%s」上%s', $task->name, $label);
        if ($errorMessage) $detail .= '，原因: ' . $errorMessage;
        SendWebhookNotification::dispatch(
            $task->developer_id, 'task_complete', '任务' . $label,
            $devId, $devName, $detail
        );

        $this->sendMessage($server, $fd, [
            'type' => 'task_result_received',
            'message' => '任务执行结果已收到',
            'task_id' => $taskId,
            'status' => $status,
        ]);

        // 自动导出日志文件到对象存储
        $this->autoExportTaskLog($task->id, $taskDevice->id ?? null, $deviceId);

        Log::info("任务执行结果已接收", ['fd' => $fd, 'device_id' => $deviceId, 'task_id' => $task->id, 'status' => $status]);
    }

    private function autoExportTaskLog(int $taskId, ?int $taskDeviceId, int $deviceId): void
    {
        if (!$taskDeviceId) {
            $taskDevice = TaskDevice::where('task_id', $taskId)->where('device_id', $deviceId)->first();
            $taskDeviceId = $taskDevice ? $taskDevice->id : null;
        }
        if (!$taskDeviceId) return;

        $task = Task::find($taskId);
        if (!$task || !$task->developer_id) return;

        $logPath = storage_path('logs/tasks/' . $taskId . '_' . $taskDeviceId . '.log');
        if (!file_exists($logPath)) return;

        $raw = file_get_contents($logPath);
        if ($raw === false || $raw === '') return;

        $gz = gzencode($raw, 6);
        if ($gz === false) return;

        $storage = new \App\Services\ObjectStorageService();
        if (!$storage->isConfigured()) return;

        $filename = sprintf('task_%d_device_%d_%d.log.gz', $taskId, $taskDeviceId, time());
        $url = $storage->upload('task-logs/' . $filename, $gz, 'application/gzip');
        if (!$url) return;

        \App\Models\TaskLogFile::create([
            'task_id'        => $taskId,
            'task_device_id' => $taskDeviceId,
            'url'            => $url,
            'raw_chars'      => mb_strlen($raw),
            'size'           => strlen($gz),
            'created_at'     => now(),
        ]);

        // 导出成功后重置内存计数器，避免与 DB 记录重复计数
        $this->devRawWritten[(string)$task->developer_id] = 0;

        Log::info('任务日志已自动导出', ['task_id' => $taskId, 'task_device_id' => $taskDeviceId, 'url' => $url]);
    }

    private function updateDeviceTaskStats(int $deviceId, string $status): void
    {
        try {
            $device = Device::find($deviceId);
            if (!$device || !$device->user_id) return;

            if ($status === 'success') {
                User::query()->where('id', $device->user_id)->increment('task_success_count');
            } else {
                User::query()->where('id', $device->user_id)->increment('task_fail_count');
            }
        } catch (\Exception $e) {
            Log::warning('更新设备执行统计失败: ' . $e->getMessage());
        }
    }

    public function onClose(Server $server, int $fd): void
    {
        echo "客户端断开连接: FD #{$fd}\n";

        if (isset($this->connectionInfo[$fd])) {
            $connectionInfo = $this->connectionInfo[$fd];
            $androidId = $connectionInfo['android_id'];
            $userId = $connectionInfo['user_id'] ?? null;

            if (isset($this->deviceConnections[$androidId]) && $this->deviceConnections[$androidId] === $fd) {
                unset($this->deviceConnections[$androidId]);
            }

            $this->setDeviceOffline($androidId);
            WebSocketHelper::setDeviceBusy($androidId, false);

            $deviceId = $connectionInfo['device_id'] ?? null;
            if ($deviceId) {
                $this->handleStreamEnd($deviceId, []); // 优先走 stream_end 流程，用 SQL 计算时长
                $this->handleDeviceDisconnect($deviceId);
            }

            // 设备离线通知
            if ($deviceId) {
                $dev = Device::find($deviceId);
                if ($dev && $dev->developer_id) {
                    $devName = $dev->name ?: $dev->android_id;
                    SendWebhookNotification::dispatch(
                        $dev->developer_id, 'device_offline', '设备离线',
                        $dev->android_id, $devName, '设备已离线'
                    );
                }
            }

            unset($this->connectionInfo[$fd]);

            Log::info("设备断开连接", [
                'fd' => $fd,
                'android_id' => $androidId,
                'user_id' => $userId,
            ]);
        }
    }

    public function onWorkerStop(Server $server, int $workerId): void
    {
        echo "Worker #{$workerId} 停止\n";
    }

    private function sendMessage(Server $server, int $fd, array $message): void
    {
        if ($server->isEstablished($fd)) {
            $server->push($fd, json_encode($message, JSON_UNESCAPED_UNICODE));
        }
    }

    private function setDeviceOnline(string $androidId): void
    {
        $key = $this->redisPrefix . $androidId;
        $redis = Redis::connection()->client();
        $redis->setex($key, 35, '1');
    }

    private function setDeviceOffline(string $androidId): void
    {
        $key = $this->redisPrefix . $androidId;
        $redis = Redis::connection()->client();
        $redis->del($key);
    }

    public function getServer(): ?Server
    {
        return $this->server;
    }

    public function getOnlineDevices(): array
    {
        return array_keys($this->deviceConnections);
    }

    private function handleDeviceDisconnect(int $deviceId): void
    {
        try {
            $runningTaskDevices = TaskDevice::query()
                ->where('device_id', $deviceId)
                ->whereIn('status', [TaskDevice::STATUS_PENDING, TaskDevice::STATUS_RUNNING])
                ->get();

            foreach ($runningTaskDevices as $taskDevice) {
                $taskDevice->update([
                    'status'       => TaskDevice::STATUS_FAILED,
                    'error_reason' => '设备连接中断',
                    'finished_at'  => now(),
                ]);

                $task = Task::find($taskDevice->task_id);
                if ($task) {
                    $task->increment('fail_count');
                    $this->checkAndUpdateTaskStatus($taskDevice->task_id);
                }
            }
        } catch (\Exception $e) {
            Log::error('处理设备断开连接任务状态失败: ' . $e->getMessage(), [
                'device_id' => $deviceId,
                'exception' => $e,
            ]);
        }
    }

    private function checkAndUpdateTaskStatus(int $taskId): void
    {
        try {
            $task = Task::query()->where('id', $taskId)->first();

            if (!$task) {
                return;
            }

            if ($task->status == Task::STATUS_COMPLETED) {
                return;
            }

            if ($task->status != Task::STATUS_RUNNING) {
                return;
            }

            $taskDevices = TaskDevice::query()->where('task_id', $taskId)->get();

            if ($taskDevices->isEmpty()) {
                return;
            }

            $allCompleted = true;
            $success = 0;
            $fail = 0;
            foreach ($taskDevices as $taskDevice) {
                if ($taskDevice->status == TaskDevice::STATUS_COMPLETED) $success++;
                elseif ($taskDevice->status == TaskDevice::STATUS_FAILED) $fail++;
                else { $allCompleted = false; break; }
            }

            if ($allCompleted) {
                $task->success_count = $success;
                $task->fail_count = $fail;
                $task->status = ($success === 0 && $fail > 0) ? Task::STATUS_FAILED : Task::STATUS_COMPLETED;
                $task->finished_at = now();
                $task->updated_at = now();
                $task->save();
            }
        } catch (\Exception $e) {
            Log::error('检查并更新任务状态失败: ' . $e->getMessage(), [
                'task_id' => $taskId,
                'exception' => $e,
            ]);
        }
    }
}