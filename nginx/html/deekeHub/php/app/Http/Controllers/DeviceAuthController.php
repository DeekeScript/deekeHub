<?php

namespace App\Http\Controllers;

use App\Models\CardKey;
use App\Models\Device;
use App\Models\Developer;
use App\Models\Option;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Android 设备认证控制器
 * 处理设备卡密激活、心跳、状态上报
 */
class DeviceAuthController extends Controller
{
    private string $secret;
    private string $token;
    private string $androidId;
    private string $timestamp;
    private string $limitKey = 'device_api_limit';

    public function __construct(Request $request)
    {
        $this->secret = (string)$request->input('secret', '');
        $this->token = (string)$request->input('token', '');
        $this->androidId = (string)$request->input('android_id', '');
        $this->timestamp = (string)$request->input('timestamp', '0');

        // 限流
        if (cacheLimit($this->limitKey, 60, 30, $this->androidId)) {
            exit(json_encode(['code' => 101, 'success' => false, 'msg' => '系统繁忙'], JSON_UNESCAPED_UNICODE));
        }

        // 部分接口不需要鉴权
        $route = $request->route();
        if (!$route) return;
        $action = $route->getActionMethod();
        if (!in_array($action, ['login', 'bind', 'checkBind', 'livekitToken'])) {
            if (!$this->androidId || !$this->secret || !$this->timestamp) {
                exit(json_encode(['code' => 101, 'success' => false, 'msg' => '系统繁忙'], JSON_UNESCAPED_UNICODE));
            }
            $res = $this->verifySecret();
            if ($res['code'] !== 0) {
                exit(json_encode($res, JSON_UNESCAPED_UNICODE));
            }
        }
    }

    /**
     * 设备绑定（卡密激活）
     * Android 端通过 deekeScript.json 中 type=bind 的地址调用
     * 设备需由开发者/超管在后台预先创建，激活只是绑定卡密到已有设备
     */
    public function bind(Request $request): JsonResponse
    {
        $androidId = (string)$request->input('android_id', '');
        $code = (string)$request->input('code', '');

        if (empty($androidId) || empty($code)) {
            return $this->error(['msg' => '参数不完整'], 101);
        }

        // 查找卡密（未使用的）
        $cardKey = CardKey::where('key_code', $code)
            ->where('status', CardKey::STATUS_UNUSED)
            ->first();

        if (!$cardKey) {
            return $this->error(['msg' => '卡密无效或已使用'], 101);
        }

        // 查找已有设备
        $device = Device::where('card_key', $code)->first();
        if (!$device) {
            return $this->error(['msg' => '设备不存在'], 101);
        }

        // 如果设备已激活且未过期，不允许重复激活
        if ($device->android_id && $device->card_key && $device->status == 1 && !$device->isExpired()) {
            Log::warning('设备已激活且未过期，拒绝重复激活', [
                'android_id' => $device->android_id,
                'device_id' => $device->id,
                'card_key' => $device->card_key,
            ]);
            return $this->error(['msg' => '设备已激活且未过期，无法重复激活'], 101);
        }

        // 检查同一 android_id 是否已有其他活跃设备
        if (!empty($androidId)) {
            $existing = Device::where('android_id', $androidId)
                ->where('id', '!=', $device->id)
                ->whereNotNull('card_key')
                ->first();
            if ($existing && !$existing->isExpired()) {
                Log::warning('同一android_id已有活跃设备', [
                    'android_id' => $androidId,
                    'existing_device_id' => $existing->id,
                ]);
                return $this->error(['msg' => '该设备已激活且未过期'], 101);
            }
        }

        $brand = (string)$request->input('device_brand', '');
        $model = (string)$request->input('device_model', '');
        $androidVersion = (string)$request->input('android_version', '');

        // 绑定卡密到设备
        $device->developer_id = $cardKey->developer_id;
        $device->card_key = $code;
        $device->name = ($brand || $model) ? trim(($brand ?: '') . ' ' . ($model ?: '')) : $device->name;
        $device->status = Device::STATUS_ONLINE;
        $device->brand = $brand ?: $device->brand;
        $device->model = $model ?: $device->model;
        $device->android_version = $androidVersion ?: $device->android_version;
        $device->android_id = $androidId;
        $device->last_seen_at = now();
        if (empty($device->livekit_room_name)) {
            $device->livekit_room_name = 'device_' . $androidId;
        }
        $device->save();

        // 标记卡密为已使用
        $cardKey->update([
            'status' => CardKey::STATUS_USED,
            'used_device_id' => $device->id,
            'used_at' => now(),
        ]);

        Log::info('设备绑定成功', [
            'android_id' => $androidId,
            'developer_id' => $cardKey->developer_id,
            'device_id' => $device->id,
            'card_key' => $code,
        ]);

        return $this->success([
            'device_id' => $device->id,
            'card_key' => $code,
            'room_name' => $device->livekit_room_name,
        ]);
    }

    /**
     * 检查设备绑定状态
     */
    public function checkBind(): JsonResponse
    {
        $device = Device::where('android_id', $this->androidId)->first();

        if (!$device) {
            Log::warning('checkBind: 设备未找到', ['android_id' => $this->androidId]);
            return $this->error(['msg' => '设备未绑定'], 101);
        }

        // 设备已解绑或未激活
        if (empty($device->card_key) || $device->status == Device::STATUS_PENDING) {
            Log::warning('checkBind: 设备已解绑', [
                'android_id' => $this->androidId,
                'device_id' => $device->id,
                'has_card_key' => !empty($device->card_key),
                'status' => $device->status,
            ]);
            return $this->error(['msg' => '设备已解绑', 'is_bound' => false, 'status' => $device->status], 101);
        }

        return $this->success([
            'device_id' => $device->id,
            'is_bound' => true,
            'status' => $device->status,
            'expired_at' => $device->expired_at,
            'is_expired' => $device->isExpired(),
        ]);
    }

    /**
     * 设备心跳上报
     */
    public function heartbeat(): JsonResponse
    {
        $res = $this->verifySecret();
        if ($res['code'] !== 0) {
            return $this->error($res, 101);
        }

        Device::where('android_id', $this->androidId)->update([
            'last_seen_at' => now(),
        ]);

        return $this->success(null);
    }

    /**
     * 上传任务执行日志
     */
    public function uploadLog(Request $request): JsonResponse
    {
        $res = $this->verifySecret();
        if ($res['code'] !== 0) {
            return $this->error($res, 101);
        }

        $taskDeviceId = $request->input('task_device_id');
        $taskId = $request->input('task_id');
        $logs = $request->input('logs', []);
        if (!$taskId || !$taskDeviceId) return $this->error(['msg' => '缺少参数'], 101);

        $dir = storage_path('logs/tasks');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $path = $dir . '/' . $taskId . '_' . $taskDeviceId . '.log';

        foreach ($logs as $log) {
            $line = sprintf("[%s] [%s] %s\n", now()->format('Y-m-d H:i:s.u'), strtoupper($log['level'] ?? 'info'), $log['message'] ?? '');
            file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
        }

        return $this->success(null);
    }

    /**
     * 获取 LiveKit 连接 Token（设备端调用）
     */
    public function livekitToken(Request $request): JsonResponse
    {
        $androidId = (string)$request->input('android_id', '');
        $token = (string)$request->input('token', '');

        if (empty($androidId) || empty($token)) {
            return $this->error(['msg' => '参数不完整'], 101);
        }

        $device = Device::where('android_id', $androidId)->first();
        if (!$device) {
            return $this->error(['msg' => '设备未绑定'], 101);
        }

        if ($device->card_key !== $token) {
            return $this->error(['msg' => 'token 验证失败'], 101);
        }

        if ($device->expired_at && $device->expired_at->isPast()) {
            return $this->error(['msg' => '设备已过期'], 101);
        }

        $apiKey = Option::getValue('livekit_api_key', 'devkey');
        $apiSecret = Option::getValue('livekit_api_secret', 'devsecret');

        $roomName = $device->livekit_room_name ?: ('device_room_' . $device->id);
        if (empty($device->livekit_room_name)) {
            $device->livekit_room_name = $roomName;
            $device->save();
        }

        $jwt = $this->generateLiveKitToken(
            $apiKey,
            $apiSecret,
            $roomName,
            'device_' . $device->id,
            $device->name ?: 'Device',
            86400
        );

        return $this->success([
            'token' => $jwt,
            'room' => $roomName,
        ]);
    }

    private function generateLiveKitToken($apiKey, $apiSecret, $room, $identity, $name, $ttl = 86400, $canPublish = true, $canSubscribe = true)
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $now = time();
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $apiKey,
            'sub' => $identity,
            'name' => $name,
            'nbf' => $now,
            'exp' => $now + $ttl,
            'video' => [
                'room' => $room,
                'roomJoin' => true,
                'canPublish' => $canPublish,
                'canSubscribe' => $canSubscribe,
            ],
        ]));
        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $apiSecret, true)
        );
        return "$header.$payload.$signature";
    }

    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * 设备加入 LiveKit 房间通知
     */
    public function livekitJoin(Request $request): JsonResponse
    {
        $participantSid = $request->input('participant_sid');

        Device::where('android_id', $this->androidId)->update([
            'livekit_participant_sid' => $participantSid,
            'last_seen_at' => now(),
        ]);

        return $this->success(null);
    }

    // ==================== 鉴权 ====================

    protected function verifySecret(): array
    {
        try {
            if (time() - (int)$this->timestamp > 60) {
                return ['code' => 1, 'success' => false, 'msg' => '请求已过期'];
            }

            $device = Device::where('android_id', $this->androidId)->first();
            if (!$device) {
                return ['code' => 1, 'success' => false, 'msg' => '设备未注册'];
            }

            if ($device->expired_at && $device->expired_at->isPast()) {
                return ['code' => 1, 'success' => false, 'msg' => '卡密已过期'];
            }

            // 使用设备 android_id + card_key 生成校验秘钥
            $expectedSecret = md5($this->androidId . $this->timestamp . ($device->card_key ?? ''));
            if ($this->secret !== $expectedSecret) {
                return ['code' => 1, 'success' => false, 'msg' => '签名验证失败'];
            }

            return ['code' => 0, 'success' => true];
        } catch (\Exception $e) {
            return ['code' => 1, 'success' => false, 'msg' => '验证异常'];
        }
    }
}
