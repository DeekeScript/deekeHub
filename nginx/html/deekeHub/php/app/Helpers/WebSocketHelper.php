<?php

namespace App\Helpers;

use App\Models\Task;
use App\Models\Device;
use App\Services\WebSocketService;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class WebSocketHelper
{
    /**
     * Redis 键前缀
     */
    private const TASK_QUEUE_PREFIX = 'ws:task:';
    private const CMD_QUEUE_PREFIX = 'ws:cmd:';
    private const DEVICE_ONLINE_PREFIX = 'ws:device:';
    private const DEVICE_BUSY_PREFIX = 'ws:busy:device:';

    /**
     * 检查设备是否在线
     *
     * @param string $androidId 设备 Android ID
     * @return bool
     * @throws \RedisException
     */
    public static function isDeviceOnline(string $androidId): bool
    {
        $key = self::DEVICE_ONLINE_PREFIX . $androidId;
        $redis = Redis::connection()->client();
        return $redis->exists($key) > 0;
    }

    /**
     * 发送任务到设备（通过 Redis 队列）
     */
    public static function sendTaskToDevice(string $androidId, int $taskId, int $taskDeviceId, string $key, string $name, array $taskData = [], bool $reserve = false): bool
    {
        // 检查设备是否在线
        if (!self::isDeviceOnline($androidId)) {
            Log::warning("设备不在线，无法发送任务", [
                'android_id' => $androidId,
                'task_id' => $taskId,
                'key' => $key,
            ]);
            return false;
        }

        // 统一设备互斥锁：设备正在执行任务时不能下发新任务（撤回除外）
        if (!$reserve && self::isDeviceBusy($androidId)) {
            Log::warning("设备繁忙，无法发送任务", [
                'android_id' => $androidId,
                'task_id' => $taskId,
            ]);
            return false;
        }

        // 如果 taskData 为空数组，转换为 null
        $finalTaskData = empty($taskData) ? null : $taskData;

        // 标记设备繁忙（撤回操作不设锁）
        if (!$reserve) {
            self::setDeviceBusy($androidId, true, 'task:' . $taskId);
        }

        // 将任务放入 Redis 队列，WebSocket 服务器会定期检查并发送
        $queueKey = self::TASK_QUEUE_PREFIX . $androidId;
        $task = [
            'task_id' => $taskId,
            'task_device_id' => $taskDeviceId,
            'key' => $key,
            'name' => $name,
            'task_data' => $finalTaskData,
            'reserve' => $reserve,
            'created_at' => time(),
        ];

        // 使用 Redis List 存储任务（FIFO）
        $redis = Redis::connection()->client();
        $redis->rpush($queueKey, json_encode($task, JSON_UNESCAPED_UNICODE));
        
        // 设置过期时间，防止队列堆积
        $redis->expire($queueKey, 3600);

        Log::info("任务已加入队列", [
            'android_id' => $androidId,
            'task_id' => $taskId,
            'key' => $key,
            'reserve' => $reserve,
        ]);

        return true;
    }

    /**
     * 从队列获取任务（由 WebSocket 服务器调用）
     *
     * @param string $androidId 设备 Android ID
     * @return array|null 任务数据，如果没有任务则返回 null
     * @throws \RedisException
     */
    public static function getTaskFromQueue(string $androidId): ?array
    {
        $key = self::TASK_QUEUE_PREFIX . $androidId;
        $redis = Redis::connection()->client();
        $taskJson = $redis->lpop($key);

        if ($taskJson) {
            $task = json_decode($taskJson, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $task;
            }
        }

        return null;
    }

    /**
     * 获取在线设备列表
     *
     * @return array 在线设备的 Android ID 列表
     * @throws \RedisException
     */
    public static function getOnlineDevices(): array
    {
        $pattern = self::DEVICE_ONLINE_PREFIX . '*';
        $redis = Redis::connection()->client();
        $keys = $redis->keys($pattern);
        
        $devices = [];
        foreach ($keys as $key) {
            $androidId = str_replace(self::DEVICE_ONLINE_PREFIX, '', $key);
            $devices[] = $androidId;
        }

        return $devices;
    }

    /**
     * 批量检查设备在线状态
     *
     * @param array $androidIds 设备 Android ID 列表
     * @return array 返回格式：['android_id' => true/false]
     * @throws \RedisException
     */
    public static function checkDevicesOnline(array $androidIds): array
    {
        $result = [];
        foreach ($androidIds as $androidId) {
            $result[$androidId] = self::isDeviceOnline($androidId);
        }
        return $result;
    }

    /**
     * 批量下发任务到任务关联的所有设备
     *
     * @param Task $task
     * @return array 返回每个设备的发送结果：['android_id' => true/false]
     */
    public static function sendTaskToDevices(Task $task): array
    {
        $task->load(['taskDevices.device']);

        $results = [];

        // 从 task_scripts 表读取已上传的脚本 URL
        $taskData = self::buildTaskData($task);

        foreach ($task->taskDevices as $taskDevice) {
            $device = $taskDevice->device;
            if (!$device || empty($device->android_id)) {
                Log::warning("任务设备无 android_id", [
                    'task_id' => $task->id,
                    'task_device_id' => $taskDevice->id,
                ]);
                $results[$taskDevice->id] = false;
                continue;
            }

            $results[$device->android_id] = self::sendTaskToDevice(
                $device->android_id,
                $task->id,
                $taskDevice->id,
                $task->workflow->name ?? 'default',
                $task->name,
                $taskData,
                false
            );
        }

        return $results;
    }

    /**
     * 构建任务数据（从 task_scripts 取 URL，按工作流脚本排序，客户端依次执行）
     */
    private static function buildTaskData(Task $task): array
    {
        $taskScripts = \App\Models\TaskScript::where('task_id', $task->id)->get();

        if ($taskScripts->isEmpty()) {
            return [];
        }

        // 通过工作流的 workflowScripts 获取排序
        $workflowScripts = \App\Models\WorkflowScript::where('workflow_id', $task->workflow_id)
            ->orderBy('sort_order')
            ->get();

        $urlByScriptId = $taskScripts->pluck('url', 'script_id');

        $scripts = [];
        foreach ($workflowScripts as $ws) {
            $url = $urlByScriptId[$ws->script_id] ?? '';
            if (empty($url)) continue;
            $scripts[] = [
                'name'       => basename(parse_url($url, PHP_URL_PATH) ?: $url),
                'url'        => $url,
                'sort_order' => $ws->sort_order,
            ];
        }

        $workflow = $task->workflow;
        return [
            'scripts'      => $scripts,
            'fail_strategy'=> $workflow ? ($workflow->fail_strategy ?? 'stop') : 'stop',
        ];
    }

    /**
     * 发送控制指令到设备（通过 Redis 命令队列）
     */
    public static function sendCommandToDevice(string $androidId, string $command, array $data = []): bool
    {
        if (!self::isDeviceOnline($androidId)) {
            Log::warning("设备不在线，无法发送指令", [
                'android_id' => $androidId,
                'command' => $command,
            ]);
            return false;
        }

        $cmdKey = self::CMD_QUEUE_PREFIX . $androidId;
        $payload = json_encode([
            'type' => 'command',
            'command' => $command,
            'data' => $data,
            'created_at' => time(),
        ], JSON_UNESCAPED_UNICODE);

        $redis = Redis::connection()->client();
        $redis->rpush($cmdKey, $payload);
        $redis->expire($cmdKey, 3600);

        Log::info("指令已加入队列", [
            'android_id' => $androidId,
            'command' => $command,
            'data' => $data,
        ]);

        return true;
    }

    /**
     * 从指令队列取出一条指令（由 WebSocket 服务器调用）
     */
    public static function getCommandFromQueue(string $androidId): ?array
    {
        $key = self::CMD_QUEUE_PREFIX . $androidId;
        $redis = Redis::connection()->client();
        $cmdJson = $redis->lpop($key);

        if ($cmdJson) {
            $cmd = json_decode($cmdJson, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $cmd;
            }
        }

        return null;
    }

    /**
     * 清空设备命令队列（设备重连时清除残留的旧指令，避免自动触发 stream_start 等）
     */
    public static function clearCommandQueue(string $androidId): void
    {
        $key = self::CMD_QUEUE_PREFIX . $androidId;
        Redis::connection()->client()->del($key);
    }

    /**
     * 检查设备是否繁忙（正在执行调试或正式任务）
     */
    public static function isDeviceBusy(string $androidId): bool
    {
        $key = self::DEVICE_BUSY_PREFIX . $androidId;
        return Redis::connection()->client()->exists($key) > 0;
    }

    /**
     * 标记设备繁忙状态
     */
    public static function setDeviceBusy(string $androidId, bool $busy, string $taskInfo = ''): void
    {
        $key = self::DEVICE_BUSY_PREFIX . $androidId;
        $redis = Redis::connection()->client();
        if ($busy) {
            $redis->setex($key, 600, $taskInfo ?: '1'); // 10分钟超时兜底
        } else {
            $redis->del($key);
        }
    }
}


