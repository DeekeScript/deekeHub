<?php

namespace App\Http\Controllers;

use App\Helpers\WebSocketHelper;
use App\Models\AdminUser;
use App\Models\Developer;
use App\Models\DeveloperLog;
use App\Models\User;
use App\Models\Device;
use App\Models\Tag;
use App\Models\Script;
use App\Models\ScriptVersion;
use App\Models\Workflow;
use App\Models\WorkflowScript;
use App\Models\Task;
use App\Models\TaskDevice;
use App\Models\Plan;
use App\Models\DeviceOrder;
use App\Models\FrameOrder;
use App\Models\CardKey;
use App\Models\FrameUsageLog;
use App\Models\Notification;
use App\Models\Option;
use App\Models\LoginLog;
use App\Helpers\JwtHelper;
use App\Services\CaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Alipay\EasySDK\Kernel\Factory as AlipayFactory;

class ApiController extends Controller
{
    // 首次注册赠送: 1台设备、1小时流畅画面(5fps × 3600秒 = 18000点)
    const TRIAL_DEVICE_COUNT = 1;
    const TRIAL_FRAME_POINTS = 104857600; // 100MB

    private function authUser(Request $request): object
    {
        return $request->attributes->get('auth_user');
    }

    // ==================== 公共接口 ====================

    /**
     * 设备激活码绑定 — Android 端调用，使用激活码将设备关联到开发者
     */
    public function deviceActivate(Request $request)
    {
        $code = $request->input('code', '');
        $androidId = $request->input('android_id', '');
        $brand = $request->input('device_brand', '');
        $model = $request->input('device_model', '');
        $androidVersion = $request->input('android_version', '');

        if (empty($code)) return $this->error('激活码不能为空');
        if (empty($androidId)) return $this->error('设备ID不能为空');

        // 查找激活码（card_keys 表）
        $cardKey = CardKey::where('key_code', $code)->first();
        if (!$cardKey) return $this->error('激活码不存在');
        if ($cardKey->status !== CardKey::STATUS_UNUSED) return $this->error('激活码已被使用');

        // 查找或创建设备
        $device = Device::where('android_id', $androidId)->first();

        $roomName = 'device_' . $androidId;

        if ($device) {
            $device->developer_id = $cardKey->developer_id;
            $device->status = Device::STATUS_ONLINE;
            $device->card_key = $code;
            $device->brand = $brand ?: $device->brand;
            $device->model = $model ?: $device->model;
            $device->android_version = $androidVersion ?: $device->android_version;
            $device->livekit_room_name = $device->livekit_room_name ?: $roomName;
            $device->last_seen_at = now();
            $device->save();
        } else {
            $device = Device::create([
                'developer_id' => $cardKey->developer_id,
                'name' => ($brand ?: 'Unknown') . ' ' . ($model ?: 'Device'),
                'android_id' => $androidId,
                'card_key' => $code,
                'brand' => $brand,
                'model' => $model,
                'android_version' => $androidVersion,
                'status' => Device::STATUS_ONLINE,
                'livekit_room_name' => $roomName,
                'last_seen_at' => now(),
            ]);
        }

        // 标记激活码已使用
        $cardKey->status = CardKey::STATUS_USED;
        $cardKey->used_device_id = $device->id;
        $cardKey->used_at = now();
        $cardKey->save();

        return $this->success([
            'device_id' => $device->id,
            'name' => $device->name,
        ], '设备激活成功');
    }

    public function login(Request $request)
    {
        $params = $request->all();
        $roleType = $params['role_type'] ?? '';

        // IP 频控
        $ip = $request->ip();
        if ($this->checkIpRateLimit('login', $ip)) return $this->error('登录次数已达上限，请稍后再试');

        // 验证码检查（超管和短信验证码登录跳过）
        $loginMode = $params['login_mode'] ?? 'password';

        if ($loginMode == 'password' && empty($params['password'])) {
            return $this->error('密码不能为空');
        }

        if ($roleType !== 'super_admin' && $loginMode !== 'sms') {
            $captchaCode = $params['captcha_code'] ?? '';
            $captchaKey = $params['captcha_key'] ?? '';
            if (empty($captchaCode)) return $this->error('请输入验证码');
            if (!CaptchaService::check($captchaCode, $captchaKey)) return $this->error('验证码错误');
        }

        // 记录登录日志
        $logData = ['role_type' => $roleType, 'ip' => $request->ip(), 'user_agent' => $request->header('user-agent', ''), 'status' => 0];

        if ($roleType === 'super_admin') {
            return $this->superAdminLogin($params, $logData);
        } elseif ($roleType === 'developer') {
            return $this->developerLogin($params, $logData);
        } elseif ($roleType === 'user') {
            return $this->userLogin($params, $logData);
        }

        return $this->error('无效的角色类型');
    }

    private function superAdminLogin($params, $logData)
    {
        $admin = AdminUser::where('username', $params['username'] ?? '')->first();
        if (!$admin || !Hash::check($params['password'], $admin->password)) {
            LoginLog::create(array_merge($logData, ['phone' => $params['username'] ?? '', 'status' => 0]));
            return $this->error('账号或密码错误');
        }
        if (!$admin->status) {
            return $this->error('账号已被停用');
        }

        $token = JwtHelper::generateToken([
            'id' => $admin->id, 'role_type' => 'super_admin', 'username' => $admin->username, 'name' => $admin->name,
        ]);

        LoginLog::create(array_merge($logData, ['user_id' => $admin->id, 'phone' => $admin->username, 'status' => 1]));

        return $this->success([
            'token' => $token, 'id' => $admin->id, 'name' => $admin->name,
            'username' => $admin->username, 'role_type' => 'super_admin',
        ]);
    }

    private function developerLogin($params, $logData)
    {
        if (empty($params['phone'])) return $this->error('手机号不能为空');
        $developer = Developer::where('phone', $params['phone'])->first();
        if (!$developer) {
            LoginLog::create(array_merge($logData, ['phone' => $params['phone'] ?? '', 'status' => 0]));
            return $this->error('手机号未注册');
        }
        if (!$developer->status) {
            return $this->error('账号已被停用，请联系管理员');
        }

        // 支持短信验证码登录
        $loginMode = $params['login_mode'] ?? 'password';
        if ($loginMode === 'sms') {
            $smsCode = $params['sms_code'] ?? '';
            if (empty($smsCode)) return $this->error('请输入短信验证码');
            $cachedCode = Cache::get('sms_code_' . $params['phone']);
            if (!$cachedCode || $cachedCode !== $smsCode) {
                LoginLog::create(array_merge($logData, ['phone' => $params['phone'] ?? '', 'status' => 0]));
                return $this->error('验证码错误或已过期');
            }
            Cache::forget('sms_code_' . $params['phone']);
        } else {
            if (empty($params['password']) || !Hash::check($params['password'], $developer->password)) {
                LoginLog::create(array_merge($logData, ['phone' => $params['phone'] ?? '', 'status' => 0]));
                return $this->error('手机号或密码错误');
            }
        }

        $token = JwtHelper::generateToken([
            'id' => $developer->id, 'role_type' => 'developer', 'phone' => $developer->phone, 'name' => $developer->name,
        ]);

        LoginLog::create(array_merge($logData, ['user_id' => $developer->id, 'phone' => $developer->phone, 'status' => 1]));

        return $this->success([
            'token' => $token, 'id' => $developer->id, 'name' => $developer->name,
            'phone' => $developer->phone, 'role_type' => 'developer',
        ]);
    }

    private function userLogin($params, $logData)
    {
        $userPhone = $params['phone'] ?? '';

        if (empty($userPhone)) return $this->error('手机号不能为空');

        $user = User::where('phone', $userPhone)->first();
        if (!$user || !Hash::check($params['password'] ?? '', $user->password)) {
            LoginLog::create(array_merge($logData, ['phone' => $userPhone, 'status' => 0]));
            return $this->error('手机号或密码错误');
        }
        if (!$user->status) {
            return $this->error('账号已被停用');
        }
        if (!$user->developer || !$user->developer->status) {
            LoginLog::create(array_merge($logData, ['phone' => $userPhone, 'status' => 0]));
            return $this->error('所属开发者已停用');
        }

        $token = JwtHelper::generateToken([
            'id' => $user->id, 'role_type' => 'user', 'phone' => $user->phone,
            'name' => $user->name, 'developer_id' => $user->developer_id,
        ]);

        LoginLog::create(array_merge($logData, ['user_id' => $user->id, 'phone' => $user->phone, 'status' => 1]));

        return $this->success([
            'token' => $token, 'id' => $user->id, 'name' => $user->name,
            'phone' => $user->phone, 'role_type' => 'user', 'developer_id' => $user->developer_id,
        ]);
    }

    public function outLogin(Request $request)
    {
        return $this->success(null, '已退出');
    }

    public function config()
    {
        $siteName = Option::getValue('site_name', '设备管理平台');
        $pageLogo = Option::getValue('page_logo', '/logo.png');
        return $this->success([
            'name' => $siteName, 'page_logo' => $pageLogo,
        ]);
    }

    public function captcha()
    {
        return CaptchaService::create();
    }

    public function sendSmsCode(Request $request)
    {
        $phone = $request->input('phone', '');
        if (empty($phone)) return $this->error('手机号不能为空');

        // 图片验证码校验
        $captchaCode = $request->input('captcha_code', '');
        $captchaKey = $request->input('captcha_key', '');
        if (empty($captchaCode)) return $this->error('请输入图片验证码');
        if (!CaptchaService::check($captchaCode, $captchaKey)) return $this->error('图片验证码错误');

        // IP 频控
        $ip = $request->ip();
        if ($this->checkIpRateLimit('sms', $ip)) return $this->error('短信发送次数已达上限，请稍后再试');

        // 60秒内不能重复发送
        $cacheKey = 'sms_last_' . $phone;
        if (Cache::get($cacheKey)) return $this->error('60秒内已发送过验证码，请稍后再试');

        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // 存储验证码，有效期5分钟
        Cache::put('sms_code_' . $phone, $code, 300);
        Cache::put($cacheKey, true, 60);

        \App\Helpers\AliyunSms::send($phone, $code);

        if (config('app.debug')) {
            return $this->success(['debug_code' => $code], '验证码已发送');
        }
        return $this->success(null, '验证码已发送');
    }

    public function developerRegister(Request $request)
    {
        $ip = $request->ip();
        if ($this->checkIpRateLimit('register', $ip)) return $this->error('注册次数已达上限，请稍后再试');

        $phone = $request->input('phone', '');
        $name = $request->input('name', '');
        $password = $request->input('password', '');
        $smsCode = $request->input('sms_code', '');

        if (empty($phone) || empty($password) || empty($smsCode)) return $this->error('请填写完整信息');
        if (Developer::where('phone', $phone)->exists()) return $this->error('该手机号已注册');

        // 验证短信验证码
        $cachedCode = Cache::get('sms_code_' . $phone);
        if (!$cachedCode || $cachedCode !== $smsCode) return $this->error('验证码错误或已过期');
        Cache::forget('sms_code_' . $phone);

        $developer = Developer::create([
            'name' => $name ?: '开发者' . substr($phone, -4),
            'phone' => $phone,
            'password' => Hash::make($password),
            'status' => 1,
            'device_frame_balance' => self::TRIAL_FRAME_POINTS,
            'total_points' => self::TRIAL_FRAME_POINTS,
            'trial_granted' => 1,
        ]);

        // 创建试用设备订单
        $trialOrderNo = 'TRIAL_' . date('YmdHis') . '_' . $developer->id;
        DeviceOrder::create([
            'order_no' => $trialOrderNo,
            'order_type' => DeviceOrder::ORDER_TYPE_TRIAL,
            'developer_id' => $developer->id,
            'device_count' => self::TRIAL_DEVICE_COUNT,
            'total_price' => 0,
            'status' => DeviceOrder::STATUS_PAID,
            'paid_at' => now(),
            'plan_id' => Plan::devicePlans()->active()->orderBy('price')->value('id'),
        ]);
        FrameOrder::create([
            'order_no' => 'TRIAL_FRAME_' . date('YmdHis') . '_' . $developer->id,
            'order_type' => FrameOrder::ORDER_TYPE_TRIAL,
            'developer_id' => $developer->id,
            'frame_count' => self::TRIAL_FRAME_POINTS,
            'total_price' => 0,
            'status' => FrameOrder::STATUS_PAID,
            'paid_at' => now(),
            'plan_id' => Plan::framePlans()->active()->orderBy('price')->value('id'),
        ]);

        // 创建试用设备（默认1台，过期时间3天）
        $expiredAt = now()->addDays(3);
        for ($i = 0; $i < self::TRIAL_DEVICE_COUNT; $i++) {
            $keyCode = strtoupper(substr(md5(uniqid() . $developer->id . $i . time()), 0, 16));
            CardKey::create([
                'developer_id' => $developer->id,
                'key_code' => $keyCode,
                'status' => CardKey::STATUS_UNUSED,
            ]);
            Device::create([
                'developer_id' => $developer->id,
                'name' => '试用设备',
                'card_key' => $keyCode,
                'status' => Device::STATUS_PENDING,
                'view_quality' => 10,
                'expired_at' => $expiredAt,
            ]);
        }

        // 试用额度创建池子（7天过期）
        \App\Models\FrameBalancePool::create([
            'developer_id' => $developer->id,
            'amount'       => self::TRIAL_FRAME_POINTS,
            'remaining'    => self::TRIAL_FRAME_POINTS,
            'expired_at'   => now()->addDays(3),
            'created_at'   => now(),
        ]);

        return $this->success(null, '注册成功');
    }

    private function checkIpRateLimit(string $action, string $ip): bool
    {
        $limits = [
            'per_minute' => (int)Option::getValue("rate_limit_{$action}_per_minute", 10),
            'per_hour' => (int)Option::getValue("rate_limit_{$action}_per_hour", 100),
            'per_day' => (int)Option::getValue("rate_limit_{$action}_per_day", 500),
        ];

        $now = (int)(microtime(true) * 1000);
        $windowKey = fn($win) => "rate_{$action}:{$ip}:" . floor($now / ($win * 1000));

        foreach ([['minute', 60], ['hour', 3600], ['day', 86400]] as [$label, $sec]) {
            $limit = $limits["per_{$label}"];
            if ($limit <= 0) continue;
            $key = "rate_{$action}:{$ip}:{$label}:" . floor(time() / $sec);
            $count = (int)Cache::get($key, 0);
            if ($count >= $limit) return true;
            Cache::put($key, $count + 1, $sec + 5);
        }

        return false;
    }

    public function currentUser(Request $request)
    {
        $authUser = $this->authUser($request);
        if (!$authUser) return $this->error('未登录');

        $roleType = $authUser->role_type;
        $permissions = [];

        if ($roleType === 'super_admin') {
            $admin = AdminUser::find($authUser->id);
            $data = ['id' => $admin->id, 'username' => $admin->username, 'name' => $admin->name, 'phone' => $admin->phone, 'role_type' => 'super_admin'];
        } elseif ($roleType === 'developer') {
            $dev = Developer::find($authUser->id);
            $data = ['id' => $dev->id, 'name' => $dev->name, 'phone' => $dev->phone, 'role_type' => 'developer', 'status' => $dev->status, 'device_frame_balance' => $dev->device_frame_balance, 'dingtalk_webhook' => $dev->dingtalk_webhook, 'wecom_webhook' => $dev->wecom_webhook, 'notify_events' => $dev->notify_events ?: []];
        } else {
            $user = User::find($authUser->id);
            $data = ['id' => $user->id, 'name' => $user->name, 'phone' => $user->phone, 'role_type' => 'user', 'developer_id' => $user->developer_id, 'status' => $user->status, 'device_frame_balance' => $user->device_frame_balance];
        }

        $data['permissions'] = $permissions;
        return $this->success($data);
    }

    public function editPassword(Request $request)
    {
        $authUser = $this->authUser($request);
        $oldPwd = $request->input('old_password');
        $newPwd = $request->input('password');

        if (empty($oldPwd) || empty($newPwd)) return $this->error('密码不能为空');

        if ($authUser->role_type === 'super_admin') {
            $model = AdminUser::find($authUser->id);
        } elseif ($authUser->role_type === 'developer') {
            $model = Developer::find($authUser->id);
        } else {
            $model = User::find($authUser->id);
        }

        if (!Hash::check($oldPwd, $model->password)) return $this->error('原密码错误');
        $model->password = Hash::make($newPwd);
        $model->save();

        return $this->success(null, '密码修改成功');
    }

    // ==================== 超管接口 ====================

    public function adminDashboard(Request $request)
    {
        $totalDevelopers = Developer::count();
        $activeDevelopers = Developer::where('status', 1)->count();
        $totalDevices = Device::count();
        try {
            $keys = Redis::connection()->client()->keys('ws:device:*') ?: [];
            $onlineDevices = count(array_filter($keys, fn($k) => !str_contains($k, ':apps:')));
        } catch (\Exception $e) {
            $onlineDevices = 0;
        }

        $totalUsers = User::count();
        $totalTasks = Task::count();
        $totalRunningTasks = Task::where('status', 1)->count();
        $totalWorkflows = Workflow::count();
        $totalScripts = Script::count();

        // 最近7天新增
        $weekAgo = now()->subDays(7);
        $newDevsWeek = Developer::where('created_at', '>=', $weekAgo)->count();
        $newDevicesWeek = Device::where('created_at', '>=', $weekAgo)->count();
        $newUsersWeek = User::where('created_at', '>=', $weekAgo)->count();

        // 今日新增
        $today = now()->startOfDay();
        $newDevsToday = Developer::where('created_at', '>=', $today)->count();
        $newDevicesToday = Device::where('created_at', '>=', $today)->count();
        $newUsersToday = User::where('created_at', '>=', $today)->count();

        // 额度统计
        $totalFrameBalance = Developer::sum('device_frame_balance');
        $totalAllocated = User::sum('device_frame_balance');
        $totalConsumed = FrameUsageLog::sum('frames_consumed');
        $systemTotalPoints = Developer::sum('total_points');

        return $this->success([
            'developer_count' => $totalDevelopers,
            'device_count' => $totalDevices,
            'online_device_count' => $onlineDevices,
            'user_count' => $totalUsers,
            'task_count' => $totalTasks,
            'running_task_count' => $totalRunningTasks,
            'workflow_count' => $totalWorkflows,
            'script_count' => $totalScripts,
            'new_developers_week' => $newDevsWeek, 'new_devices_week' => $newDevicesWeek,
            'new_users_week' => $newUsersWeek,
            'total_points' => (int)$systemTotalPoints,
            'allocated_points' => (int)$totalAllocated,
            'available_points' => (int)$totalFrameBalance,
            'consumed_points' => (int)$totalConsumed,
            'new_developers_today' => $newDevsToday, 'new_devices_today' => $newDevicesToday,
            'new_users_today' => $newUsersToday,
        ]);
    }

    public function adminDeveloperList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Developer::query();
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        if ($phone = $request->get('phone')) $query->where('phone', 'like', "%{$phone}%");
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);

        $total = $query->count();
        $data = $query->orderBy('id', 'desc')
            ->offset(($request->page - 1) * $request->limit)->limit($request->limit)
            ->get()->map(function ($dev) {
                $dev->user_count = User::where('developer_id', $dev->id)->count();
                $dev->device_count = Device::where('developer_id', $dev->id)->count();
                $dev->allocated_points = (int)User::where('developer_id', $dev->id)->sum('device_frame_balance');
                $dev->consumed_points = (int)FrameUsageLog::where('developer_id', $dev->id)->sum('frames_consumed');
                return $dev;
            });

        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function adminDeveloperAdd(Request $request)
    {
        $params = $request->all();
        if (empty($params['phone']) || empty($params['password'])) return $this->error('手机号和密码不能为空');
        if (Developer::where('phone', $params['phone'])->exists()) return $this->error('手机号已存在');

        $initialBalance = (int)($params['device_frame_balance'] ?? 0);

        $developer = Developer::create([
            'name'                  => $params['name'] ?? '',
            'phone'                 => $params['phone'],
            'password'              => Hash::make($params['password']),
            'status'                => 1,
            'email'                 => $params['email'] ?? null,
            'device_frame_balance'  => $initialBalance,
            'total_points'          => $initialBalance,
            'trial_granted'         => 0,
        ]);

        if ($initialBalance > 0) {
            \App\Models\FrameBalancePool::create([
                'developer_id' => $developer->id,
                'amount'       => $initialBalance,
                'remaining'    => $initialBalance,
                'expired_at'   => null,
                'created_at'   => now(),
            ]);
            \App\Models\FrameBalancePool::syncDeveloperBalance($developer->id);
        }

        return $this->success($developer, '创建成功');
    }

    public function adminDeveloperUpdate(Request $request, $id)
    {
        $dev = Developer::findOrFail($id);
        $params = $request->only(['name', 'phone', 'email']);
        if (!empty($params['phone']) && Developer::where('phone', $params['phone'])->where('id', '<>', $id)->exists()) {
            return $this->error('手机号已被其他开发者使用');
        }
        if ($password = $request->input('password')) {
            $dev->password = Hash::make($password);
        }
        $dev->fill($params)->save();
        return $this->success($dev, '更新成功');
    }

    public function adminDeveloperToggleStatus(Request $request, $id)
    {
        $dev = Developer::findOrFail($id);
        $oldStatus = $dev->status;
        $dev->status = $dev->status ? 0 : 1;
        $dev->save();
        $opUser = $this->authUser($request);
        $opName = $opUser->name ?? $opUser->username ?? '系统';
        $this->logDeveloperOp($id, DeveloperLog::ACTION_TOGGLE_STATUS, $oldStatus, $dev->status, $dev->status - $oldStatus, $request->get('reason', ''), $opName);
        return $this->success(null, $dev->status ? '已启用' : '已停用');
    }

    public function adminDeveloperAdjust(Request $request, $id)
    {
        $dev = Developer::findOrFail($id);
        $authUser = $this->authUser($request);
        $field = $request->input('field'); // device_frame_balance
        $amount = (int)$request->input('amount', 0);
        $reason = $request->input('reason', '');

        $allowedFields = ['device_frame_balance'];
        if (!in_array($field, $allowedFields)) return $this->error('无效的调整字段');
        if ($amount === 0) return $this->error('调整数量不能为0');
        if (empty(trim($reason))) return $this->error('请填写操作原因');

        $before = (int)$dev->$field;
        $after = $before + $amount;
        if ($after < 0) $after = 0;

        if ($amount > 0) {
            \App\Models\FrameBalancePool::create([
                'developer_id' => $id,
                'amount'       => $amount,
                'remaining'    => $amount,
                'expired_at'   => null,
                'created_at'   => now(),
            ]);
            $dev->total_points += $amount;
        } elseif ($amount < 0) {
            \App\Models\FrameBalancePool::consume($id, abs($amount));
        }
        \App\Models\FrameBalancePool::syncDeveloperBalance($id);
        $dev->save();

        $opName = $authUser->name ?? $authUser->username ?? '系统';
        $this->logDeveloperOp($id, DeveloperLog::ACTION_ADJUST_POINTS, $before, $after, $amount, $reason, $opName);

        $opt = $amount > 0 ? '+' : '';
        return $this->success(['after' => $after], "实时画面额度 {$opt}{$amount}，已更新为 {$after}");
    }

    public function adminAssignDevices(Request $request, $id)
    {
        $dev = Developer::findOrFail($id);
        $count = (int)$request->input('count', 0);
        $expiredAt = $request->input('expired_at');

        if ($count < 1 || $count > 500) return $this->error('设备数量需在1-500之间');
        if (empty($expiredAt)) return $this->error('请选择过期时间');

        DB::transaction(function () use ($dev, $count, $expiredAt) {
            for ($i = 0; $i < $count; $i++) {
                $keyCode = $this->generateUniqueCardKey();
                CardKey::create([
                    'developer_id' => $dev->id,
                    'key_code' => $keyCode,
                    'status' => CardKey::STATUS_UNUSED,
                ]);
                Device::create([
                    'developer_id' => $dev->id,
                    'name' => '未命名设备',
                    'card_key' => $keyCode,
                    'status' => Device::STATUS_PENDING,
                    'view_quality' => 10,
                    'expired_at' => $expiredAt,
                ]);
            }
        });

        return $this->success(['count' => $count, 'expired_at' => $expiredAt], "成功分配 {$count} 台设备，过期时间 {$expiredAt}");
    }

    public function adminDeveloperLogs(Request $request, $id)
    {
        $logs = DeveloperLog::where('developer_id', $id)
            ->orderBy('id', 'desc')
            ->offset(($request->page - 1) * $request->limit)
            ->limit($request->limit)
            ->get();
        $total = DeveloperLog::where('developer_id', $id)->count();
        return $this->success(['total' => $total, 'data' => $logs]);
    }

    public function adminAllDeveloperLogs(Request $request)
    {
        $query = DeveloperLog::with('developer:id,name,phone');
        if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        if ($action = $request->get('action')) $query->where('action', $action);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    private function logDeveloperOp(int $developerId, string $action, int $before, int $after, int $change, string $reason = '', string $operator = '系统')
    {
        DeveloperLog::create([
            'developer_id'  => $developerId,
            'action'        => $action,
            'before_value'  => $before,
            'after_value'   => $after,
            'change_amount' => $change,
            'reason'        => $reason,
            'operator'      => $operator,
        ]);
    }

    public function adminDeveloperStats(Request $request, $id)
    {
        $dev = Developer::findOrFail($id);
        $allocated = User::where('developer_id', $id)->sum('device_frame_balance');
        $consumed = FrameUsageLog::where('developer_id', $id)->sum('frames_consumed');
        // 总画面额度 = 待用余额 + 已消耗量，反映开发者历史累计获取的总额度
        $currentBalance = (int)$dev->device_frame_balance;
        return $this->success([
            'developer' => $dev,
            'user_count' => User::where('developer_id', $id)->count(),
            'device_count' => Device::where('developer_id', $id)->count(),
            'active_device_count' => Device::where('developer_id', $id)->where('status', 1)->count(),
            'task_count' => Task::where('developer_id', $id)->count(),
            'total_points' => $currentBalance + $consumed,
            'allocated_points' => (int)$allocated,
            'consumed_points' => (int)$consumed,
        ]);
    }

    public function adminDeveloperCleanup(Request $request, $id)
    {
        if (app()->environment('production')) {
            return $this->error('生产环境不支持此操作');
        }

        Developer::findOrFail($id);

        DB::transaction(function () use ($id) {
            $userIds = DB::table('users')->where('developer_id', $id)->pluck('id')->toArray();
            $deviceIds = DB::table('devices')->where('developer_id', $id)->pluck('id')->toArray();
            $scriptIds = DB::table('scripts')->where('developer_id', $id)->pluck('id')->toArray();
            $workflowIds = DB::table('workflows')->where('developer_id', $id)->pluck('id')->toArray();
            $taskIds = DB::table('tasks')->where('developer_id', $id)->pluck('id')->toArray();

            // 任务 + 任务设备 + 任务日志
            if (!empty($taskIds)) {
                $taskDeviceIds = DB::table('task_devices')->whereIn('task_id', $taskIds)->pluck('id')->toArray();
                if (!empty($taskDeviceIds)) {
                    DB::table('task_log_files')->whereIn('task_device_id', $taskDeviceIds)->delete();
                }
                DB::table('task_devices')->whereIn('task_id', $taskIds)->delete();
            }
            DB::table('tasks')->where('developer_id', $id)->delete();

            // 工作流 + 工作流脚本关联
            if (!empty($workflowIds)) {
                DB::table('workflow_scripts')->whereIn('workflow_id', $workflowIds)->delete();
            }
            DB::table('workflows')->where('developer_id', $id)->delete();

            // 脚本 + 脚本版本（script_versions 可能已被迁移删除）
            if (!empty($scriptIds)) {
                if (Schema::hasTable('script_versions')) {
                    DB::table('script_versions')->whereIn('script_id', $scriptIds)->delete();
                }
            }
            DB::table('scripts')->where('developer_id', $id)->delete();

            // 设备 + 设备标签关联
            if (!empty($deviceIds)) {
                DB::table('device_tag')->whereIn('device_id', $deviceIds)->delete();
            }
            DB::table('devices')->where('developer_id', $id)->delete();

            // 账单 + 订单 + 卡密
            DB::table('frame_usage_logs')->where('developer_id', $id)->delete();
            DB::table('device_orders')->where('developer_id', $id)->delete();
            DB::table('frame_orders')->where('developer_id', $id)->delete();
            DB::table('card_keys')->where('developer_id', $id)->delete();

            // 操作日志
            DB::table('developer_logs')->where('developer_id', $id)->delete();

            // 登录日志（开发者 + 其下所有运营）
            DB::table('login_logs')->where('role_type', 'developer')->where('user_id', $id)->delete();
            if (!empty($userIds)) {
                DB::table('login_logs')->where('role_type', 'user')->whereIn('user_id', $userIds)->delete();
            }

            // 标签 + 通知（多态关联）
            DB::table('tags')->where('owner_id', $id)->where('owner_type', 'developer')->delete();
            if (!empty($userIds)) {
                DB::table('tags')->whereIn('owner_id', $userIds)->where('owner_type', 'user')->delete();
            }
            DB::table('notifications')->where('recipient_id', $id)->where('recipient_type', 'developer')->delete();
            if (!empty($userIds)) {
                DB::table('notifications')->whereIn('recipient_id', $userIds)->where('recipient_type', 'user')->delete();
            }

            // 运营用户
            DB::table('users')->where('developer_id', $id)->delete();

            // 开发者
            DB::table('developers')->where('id', $id)->delete();
        });

        return $this->success(null, '清理成功');
    }

    public function adminDeviceList(Request $request)
    {
        $query = Device::with(['developer:id,name,phone', 'user:id,name,phone', 'tags']);
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        if ($androidId = $request->get('android_id')) $query->where('android_id', 'like', "%{$androidId}%");
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);
        if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);

        $total = $query->count();
        $devices = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $this->mergeOnlineStatus($devices);

        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function adminDeviceUpdate(Request $request, $id)
    {
        $device = Device::findOrFail($id);
        $device->fill($request->only(['name', 'remark']))->save();
        return $this->success($device, '更新成功');
    }

    public function adminDeviceUnbind(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::findOrFail($id);

        // 通过 WebSocket 通知设备已被解绑
        if ($device->android_id) {
            \App\Helpers\WebSocketHelper::sendCommandToDevice($device->android_id, 'device_unbind', ['message' => '设备已被解绑']);
        }

        // 重置旧卡密为未使用
        if ($device->card_key) {
            CardKey::where('key_code', $device->card_key)->update([
                'status' => CardKey::STATUS_UNUSED,
                'used_device_id' => null,
                'used_at' => null,
            ]);
        }

        // 生成新激活码
        $developerId = $device->developer_id;
        $newCode = $this->generateUniqueCardKey();

        CardKey::create([
            'developer_id' => $developerId,
            'key_code' => $newCode,
            'status' => CardKey::STATUS_UNUSED,
        ]);

        $device->card_key = $newCode;
        $device->user_id = null;
        $device->status = Device::STATUS_PENDING;
        $device->brand = null;
        $device->model = null;
        $device->android_version = null;
        $device->save();

        Log::info('超管解绑设备', ['device_id' => $device->id, 'admin_id' => $authUser->id ?? 0]);
        return $this->success($device, '解绑成功，已生成新激活码');
    }

    // ==================== 套餐管理（超管） ====================

    public function adminPlanList(Request $request)
    {
        $query = Plan::query();
        if ($type = $request->get('type')) $query->where('type', $type);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function adminPlanAdd(Request $request)
    {
        $plan = Plan::create($request->only(['type', 'name', 'billing_cycle', 'unit_count', 'quota', 'price', 'slogan', 'bonus_days', 'status']));
        return $this->success($plan, '创建成功');
    }

    public function adminPlanUpdate(Request $request, $id)
    {
        $plan = Plan::findOrFail($id);
        $plan->fill($request->only(['type', 'name', 'billing_cycle', 'unit_count', 'quota', 'price', 'slogan', 'bonus_days', 'status']))->save();
        return $this->success($plan, '更新成功');
    }

    public function adminPlanDelete($id)
    {
        Plan::findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    public function adminDeviceOrderList(Request $request)
    {
        $query = DeviceOrder::with('developer:id,name,phone')->with('plan:id,name,billing_cycle,unit_count,bonus_days');
        if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get()
            ->map(function ($order) {
                $plan = $order->plan;
                $duration = '';
                if ($plan) {
                    $days = ['day' => 1, 'month' => 30, 'year' => 365][$plan->billing_cycle] ?? 30;
                    $totalDays = $days + ($plan->bonus_days ?? 0);
                    $duration = $totalDays . '天' . ($plan->bonus_days ? "（含赠{$plan->bonus_days}天）" : '');
                }
                return $order->toArray() + ['plan_duration' => $duration];
            });
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function adminFrameOrderList(Request $request)
    {
        $query = FrameOrder::with('developer:id,name,phone')->with('plan:id,name');
        if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function adminOptionList()
    {
        $options = Option::getAllAsArray();
        // 证书内容不回显（安全），只标记是否已配置
        $certKeys = ['alipay_cert_content', 'alipay_root_cert_content', 'app_cert_content', 'merchant_private_key_content'];
        foreach ($certKeys as $k) {
            unset($options[$k]);
        }
        $dir = public_path('alipay');
        $options['_cert_status'] = [
            'alipay_cert'      => is_dir($dir) && file_exists($dir . '/alipayCertPublicKey_RSA2.crt'),
            'alipay_root_cert' => is_dir($dir) && file_exists($dir . '/alipayRootCert.crt'),
            'app_cert'         => is_dir($dir) && !empty(glob($dir . '/appCertPublicKey_*.crt')),
            'merchant_private' => is_dir($dir) && file_exists($dir . '/merchant_private_key.pem'),
        ];
        return $this->success($options);
    }

    public function adminOptionUpdate(Request $request)
    {
        $dir = public_path('alipay');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // 证书内容 → 写入文件
        $certMap = [
            'alipay_cert_content'           => 'alipayCertPublicKey_RSA2.crt',
            'alipay_root_cert_content'      => 'alipayRootCert.crt',
            'merchant_private_key_content'  => 'merchant_private_key.pem',
        ];

        $appId = $request->input('alipay_app_id', Option::getValue('alipay_app_id'));

        foreach ($certMap as $key => $filename) {
            $content = $request->input($key);
            if ($content !== null && $content !== '') {
                file_put_contents($dir . '/' . $filename, $content);
            }
        }

        // app_cert 特殊处理：文件名需拼 APPID
        $appCertContent = $request->input('app_cert_content');
        if ($appCertContent !== null && $appCertContent !== '' && $appId) {
            // 清理旧的 appCertPublicKey_*.crt
            foreach (glob($dir . '/appCertPublicKey_*.crt') as $old) {
                @unlink($old);
            }
            file_put_contents($dir . '/appCertPublicKey_' . $appId . '.crt', $appCertContent);
        }

        // 保存其他配置到 options 表（排除证书内容，避免表膨胀）
        foreach ($request->all() as $key => $value) {
            if (str_ends_with($key, '_cert_content') || str_ends_with($key, '_private_key_content')) {
                continue;
            }
            Option::setValue($key, is_array($value) ? json_encode($value) : $value);
        }

        return $this->success(null, '配置已更新');
    }

    // ==================== 开发者接口 ====================

    public function developerDashboard(Request $request)
    {
        $authUser = $this->authUser($request);
        $devId = $authUser->id;

        $dev = Developer::find($devId);
        $userCount = User::where('developer_id', $devId)->count();
        $allocatedPoints = User::where('developer_id', $devId)->sum('device_frame_balance');
        $consumedPoints = FrameUsageLog::where('developer_id', $devId)->sum('frames_consumed');
        $deviceCount = Device::where('developer_id', $devId)->count();
        $unassignedCount = Device::where('developer_id', $devId)->whereNull('user_id')->count();

        $devAndroidIds = Device::where('developer_id', $devId)->whereNotNull('android_id')->pluck('android_id')->toArray();
        $devOnlineMap = WebSocketHelper::checkDevicesOnline($devAndroidIds);
        $devOnlineCount = count(array_filter($devOnlineMap));

        return $this->success([
            'user_count' => $userCount,
            'device_count' => $deviceCount,
            'unassigned_device_count' => $unassignedCount,
            'online_device_count' => $devOnlineCount,
            'script_count' => Script::where('developer_id', $devId)->count(),
            'workflow_count' => Workflow::where('developer_id', $devId)->count(),
            'task_count' => Task::where('developer_id', $devId)->count(),
            'running_task_count' => Task::where('developer_id', $devId)->where('status', 1)->count(),
            'frame_balance' => (int)$dev->device_frame_balance,
            'allocated_points' => (int)$allocatedPoints,
            'consumed_points' => (int)$consumedPoints,
            'total_points' => (int)$dev->total_points,
        ]);
    }

    // ==================== 开发者 - 运营管理 ====================

    public function developerUserList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = User::query();
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } else {
            $query = User::where('developer_id', $authUser->id);
        }
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        if ($phone = $request->get('phone')) $query->where('phone', 'like', "%{$phone}%");
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);

        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)
            ->get()->map(function ($user) {
                $user->device_count = Device::where('user_id', $user->id)->count();
                $user->consumed_points = (int)FrameUsageLog::where('user_id', $user->id)
                    ->whereNotNull('ended_at')->sum('frames_consumed');
                return $user;
            });

        $devId = $authUser->role_type === 'super_admin'
            ? ($request->get('developer_id') ?: null)
            : $authUser->id;

        $statsQuery = User::query();
        $deviceStatsQuery = Device::query();
        $consumedQuery = FrameUsageLog::whereNotNull('ended_at');
        if ($devId) {
            $statsQuery->where('developer_id', $devId);
            $deviceStatsQuery->where('developer_id', $devId)->whereNotNull('user_id');
            $consumedQuery->where('developer_id', $devId)->whereNotNull('user_id');
        } else {
            $deviceStatsQuery->whereNotNull('user_id');
            $consumedQuery->whereNotNull('user_id');
        }

        $stats = [
            'user_count'           => $total,
            'user_device_count'    => $deviceStatsQuery->count(),
            'user_frame_balance'   => (int)$statsQuery->sum('device_frame_balance'),
            'user_consumed_points' => (int)$consumedQuery->sum('frames_consumed'),
        ];

        return $this->success(['total' => $total, 'data' => $data, 'stats' => $stats]);
    }

    public function developerUserAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $devId = $authUser->id;
        $developer = Developer::find($devId);

        if (empty($request->phone) || empty($request->password)) return $this->error('手机号和密码不能为空');
        if (User::where('phone', $request->phone)->exists()) return $this->error('该手机号已存在');

        $initialPoints = (int)($request->device_frame_balance ?? 0);
        $deviceIds = $request->input('device_ids', []);

        if ($initialPoints > 0 && $developer->fresh()->device_frame_balance < $initialPoints) {
            return $this->error('实时画面额度不足，当前剩余 ' . $developer->fresh()->device_frame_balance);
        }

        // verify devices belong to developer and are unassigned
        if (!empty($deviceIds)) {
            $validCount = Device::where('developer_id', $devId)->whereNull('user_id')->whereIn('id', $deviceIds)->count();
            if ($validCount !== count($deviceIds)) {
                return $this->error('选中的设备不合法或已被分配');
            }
        }

        $user = null;
        DB::transaction(function () use ($devId, $request, $developer, $initialPoints, $deviceIds, &$user) {
            $user = User::create([
                'developer_id' => $devId,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'name' => $request->name ?? '',
                'status' => 1,
                'device_frame_balance' => $initialPoints,
            ]);

            if ($initialPoints > 0) {
                \App\Models\FrameBalancePool::consume($devId, $initialPoints);
                \App\Models\FrameBalancePool::syncDeveloperBalance($devId);
            }
            if (!empty($deviceIds)) {
                Device::whereIn('id', $deviceIds)->update(['user_id' => $user->id]);
            }
        });

        return $this->success($user, '创建成功');
    }

    public function developerUserUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $user = User::where('developer_id', $authUser->id)->findOrFail($id);

        if ($phone = $request->input('phone')) {
            if (User::where('phone', $phone)->where('id', '<>', $id)->exists()) {
                return $this->error('手机号已被使用');
            }
        }

        $user->fill($request->only(['phone', 'name']));
        if ($password = $request->input('password')) {
            $user->password = Hash::make($password);
        }
        $user->save();
        return $this->success($user, '更新成功');
    }

    public function developerUserToggleStatus(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $user = User::where('developer_id', $authUser->id)->findOrFail($id);
        $user->status = $user->status ? 0 : 1;
        $user->save();
        return $this->success(null, $user->status ? '已启用' : '已停用');
    }

    public function developerUserFrameBalance(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $user = User::where('developer_id', $authUser->id)->findOrFail($id);
        $amount = (int)$request->input('amount', 0);
        if ($amount === 0) return $this->success(null, '无变化');

        if ($amount > 0) {
            // 分配：从开发者池子消费
            $consumed = \App\Models\FrameBalancePool::consume($authUser->id, $amount);
            if ($consumed <= 0) return $this->error('实时画面额度余额不足');
            \App\Models\FrameBalancePool::syncDeveloperBalance($authUser->id);
            $user->increment('device_frame_balance', $consumed);
        } else {
            // 回收：从运营收回额度，创建新池子
            $deduct = abs($amount);
            if ($user->device_frame_balance < $deduct) return $this->error('运营实时画面额度不足');
            DB::transaction(function () use ($authUser, $user, $deduct) {
                $user->decrement('device_frame_balance', $deduct);
                \App\Models\FrameBalancePool::create([
                    'developer_id' => $authUser->id,
                    'amount'       => $deduct,
                    'remaining'    => $deduct,
                    'expired_at'   => null,
                    'created_at'   => now(),
                ]);
                \App\Models\FrameBalancePool::syncDeveloperBalance($authUser->id);
            });
        }

        $developer = Developer::find($authUser->id);
        return $this->success([
            'developer_balance' => $developer->device_frame_balance,
            'user_balance'      => $user->fresh()->device_frame_balance,
        ], $amount > 0 ? '分配成功' : '回收成功');
    }

    public function developerUserAssignDevices(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $user = User::where('developer_id', $authUser->id)->findOrFail($id);
        $deviceIds = $request->input('device_ids', []);

        // check selected devices are valid (unassigned or already assigned to this user)
        $invalidCount = Device::where('developer_id', $authUser->id)
            ->whereIn('id', $deviceIds)
            ->whereNotNull('user_id')
            ->where('user_id', '<>', $user->id)
            ->count();
        if ($invalidCount > 0) return $this->error('选中的设备已被其他运营占用');

        DB::transaction(function () use ($authUser, $user, $deviceIds) {
            // unassign currently assigned devices of this user
            Device::where('developer_id', $authUser->id)->where('user_id', $user->id)
                ->whereNotIn('id', $deviceIds)->update(['user_id' => null]);
            // assign selected devices
            if (!empty($deviceIds)) {
                Device::where('developer_id', $authUser->id)->whereIn('id', $deviceIds)
                    ->update(['user_id' => $user->id]);
            }
        });

        return $this->success(null, '设备分配已更新');
    }

    // ==================== 脚本管理 ====================

    public function scriptList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = Script::query()->select(['id', 'developer_id', 'name', 'remark', 'content', 'created_at', 'updated_at']);
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } else {
            $query = Script::where('developer_id', $authUser->id)->select(['id', 'developer_id', 'name', 'remark', 'content', 'created_at', 'updated_at']);
        }
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");

        $total = $query->count();
        $list = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $list->map(function ($item) {
            $content = $item->content ?? '';
            $arr = $item->toArray();
            unset($arr['content']);
            return $arr + [
                'code_lines' => $content === '' ? 0 : substr_count($content, "\n") + 1,
                'code_size' => strlen($content),
            ];
        });
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function scriptDetail(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $script = Script::where('developer_id', $authUser->id)->findOrFail($id);
        return $this->success($script);
    }

    public function scriptAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $script = Script::create([
            'developer_id' => $authUser->id,
            'name' => $request->name,
            'remark' => $request->remark ?? '',
            'content' => $request->content ?? '',
        ]);
        return $this->success($script, '创建成功');
    }

    public function scriptUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $script = Script::where('developer_id', $authUser->id)->findOrFail($id);
        $script->fill($request->only(['name', 'remark', 'content']))->save();
        return $this->success($script, '更新成功');
    }

    public function scriptDelete(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        Script::where('developer_id', $authUser->id)->findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    // ==================== 工作流管理 ====================

    public function workflowList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = Workflow::query()->with(['workflowScripts.script' => function ($q) {
                $q->select(['id', 'developer_id', 'name', 'remark', 'created_at']);
            }]);
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } else {
            $query = Workflow::where('developer_id', $authUser->id)->with(['workflowScripts.script' => function ($q) {
                $q->select(['id', 'developer_id', 'name', 'remark', 'created_at']);
            }]);
        }
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function workflowAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $workflow = Workflow::create([
            'developer_id' => $authUser->id,
            'name' => $request->name,
            'description' => $request->description ?? '',
            'fail_strategy' => $request->fail_strategy ?? 'stop',
        ]);

        $scripts = $request->input('scripts', []); // [{script_id, sort_order}]
        foreach ($scripts as $i => $item) {
            WorkflowScript::create([
                'workflow_id' => $workflow->id,
                'script_id' => $item['script_id'],
                'sort_order' => $item['sort_order'] ?? $i,
            ]);
        }

        return $this->success($workflow->load('workflowScripts.script'), '创建成功');
    }

    public function workflowUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $workflow = Workflow::where('developer_id', $authUser->id)->findOrFail($id);
        $workflow->fill($request->only(['name', 'description', 'fail_strategy']))->save();

        if ($scripts = $request->input('scripts')) {
            $workflow->workflowScripts()->delete();
            foreach ($scripts as $i => $item) {
                WorkflowScript::create([
                    'workflow_id' => $workflow->id,
                    'script_id' => $item['script_id'],
                    'sort_order' => $item['sort_order'] ?? $i,
                ]);
            }
        }

        return $this->success($workflow->load('workflowScripts.script'), '更新成功');
    }

    public function workflowDelete(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        Workflow::where('developer_id', $authUser->id)->findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    // ==================== 设备管理（开发者） ====================

    public function deviceAdd(Request $request)
    {
        return $this->error('开发者不能直接创建设备，请联系管理员分配或购买套餐');
    }

    public function deviceExpirations(Request $request)
    {
        return $this->success([]);
    }

    public function deviceList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Device::where('developer_id', $authUser->id)->with('tags');
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        if ($androidId = $request->get('android_id')) $query->where('android_id', 'like', "%{$androidId}%");
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);
        if ($tagId = $request->get('tag_id')) $query->whereHas('tags', function ($q) use ($tagId) { $q->where('tag_id', $tagId); });

        $total = $query->count();
        $devices = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $this->mergeOnlineStatus($devices);
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function deviceUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        $device->fill($request->only(['name', 'remark', 'view_quality']))->save();
        return $this->success($device, '更新成功');
    }

    public function deviceUpdateTags(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        $tagIds = $request->input('tag_ids', []);
        $device->tags()->sync($tagIds);
        return $this->success($device->load('tags'), '标签已更新');
    }

    public function deviceDelete(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $query = Device::query();
        if ($authUser->role_type !== 'super_admin') {
            $query->where('developer_id', $authUser->id);
        }
        $query->findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    public function deviceUnbind(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);

        // 通过 WebSocket 通知设备已被解绑
        if ($device->android_id) {
            \App\Helpers\WebSocketHelper::sendCommandToDevice($device->android_id, 'device_unbind', ['message' => '设备已被解绑']);
        }

        // 重置旧卡密为未使用
        if ($device->card_key) {
            CardKey::where('key_code', $device->card_key)->update([
                'status' => CardKey::STATUS_UNUSED,
                'used_device_id' => null,
                'used_at' => null,
            ]);
        }

        // 生成新激活码
        $newCode = $this->generateUniqueCardKey();
        CardKey::create([
            'developer_id' => $authUser->id,
            'key_code' => $newCode,
            'status' => CardKey::STATUS_UNUSED,
        ]);

        $device->card_key = $newCode;
        $device->user_id = null;
        $device->status = Device::STATUS_PENDING;
        $device->brand = null;
        $device->model = null;
        $device->android_version = null;
        $device->save();

        Log::info('开发者解绑设备', ['device_id' => $device->id, 'developer_id' => $authUser->id]);
        return $this->success(null, '解绑成功');
    }

    public function deviceLivekitToken(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);

        if ($device->android_id && !WebSocketHelper::isDeviceOnline($device->android_id)) {
            return $this->error('设备不在线');
        }

        $livekitApiKey = Option::getValue('livekit_api_key', 'devkey');
        $livekitApiSecret = Option::getValue('livekit_api_secret', 'devsecret');
        $livekitHost = Option::getValue('livekit_host', 'ws://localhost:7880');

        $roomName = $device->livekit_room_name ?: ('device_room_' . $device->id);
        if (empty($device->livekit_room_name)) {
            $device->livekit_room_name = $roomName;
            $device->save();
        }

        $token = $this->generateLiveKitToken(
            $livekitApiKey,
            $livekitApiSecret,
            $roomName,
            'device_' . $device->id,
            $device->name,
            3600 // 1 hour expiry
        );

        return $this->success([
            'token' => $token,
            'url' => $livekitHost,
            'room' => $roomName,
        ]);
    }

    private function generateLiveKitToken($apiKey, $apiSecret, $room, $identity, $name, $ttl = 3600, $canPublish = true, $canSubscribe = true)
    {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));

        $now = time();
        $payload = self::base64UrlEncode(json_encode([
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

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $apiSecret, true)
        );

        return "$header.$payload.$signature";
    }

    private function makeLivekitViewerToken($device): array
    {
        $apiKey = Option::getValue('livekit_api_key', 'devkey');
        $apiSecret = Option::getValue('livekit_api_secret', 'devsecret');
        $livekitHost = Option::getValue('livekit_host', 'ws://192.168.31.150:7880');

        $roomName = $device->livekit_room_name ?: ('device_room_' . $device->id);

        $token = $this->generateLiveKitToken(
            $apiKey,
            $apiSecret,
            $roomName,
            'viewer_' . uniqid(),
            'Viewer',
            3600,
            false,
            true
        );

        return [
            'token' => $token,
            'url' => $livekitHost,
            'room' => $roomName,
        ];
    }

    public function adminDeviceLivekitToken(Request $request, $id)
    {
        $device = Device::findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        return $this->success($this->makeLivekitViewerToken($device));
    }

    public function adminDeviceStreamStart(Request $request, $id)
    {
        $device = Device::findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        if ($device->android_id && !WebSocketHelper::isDeviceOnline($device->android_id)) {
            return $this->error('设备不在线');
        }
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_start', [
                'quality' => $device->view_quality ?? 10,
            ]);
        }
        return $this->success(null, '已通知设备开始推流');
    }

    public function adminDeviceStreamStop(Request $request, $id)
    {
        $device = Device::findOrFail($id);
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_stop', []);
        }
        return $this->success(null, '已通知设备停止推流');
    }

    public function deviceLivekitViewerToken(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        return $this->success($this->makeLivekitViewerToken($device));
    }

    public function userDeviceLivekitViewerToken(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        return $this->success($this->makeLivekitViewerToken($device));
    }

    public function deviceStreamStart(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        if ($device->android_id && !WebSocketHelper::isDeviceOnline($device->android_id)) {
            return $this->error('设备不在线');
        }
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_start', [
                'quality' => $device->view_quality ?? 10,
            ]);
        }
        return $this->success(null, '已通知设备开始推流');
    }

    public function deviceStreamStop(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_stop', []);
        }
        return $this->success(null, '已通知设备停止推流');
    }

    public function userDeviceStreamStart(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        if ($device->android_id && !WebSocketHelper::isDeviceOnline($device->android_id)) {
            return $this->error('设备不在线');
        }
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_start', [
                'quality' => $device->view_quality ?? 10,
            ]);
        }
        return $this->success(null, '已通知设备开始推流');
    }

    public function userDeviceStreamStop(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'stream_stop', []);
        }
        return $this->success(null, '已通知设备停止推流');
    }

    private static function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public function deviceSetQuality(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $quality = (int)$request->input('quality', 10);
        if (!in_array($quality, [1, 5, 10])) return $this->error('画质参数无效');

        $device = Device::where('developer_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        $device->view_quality = $quality;
        $device->save();

        Log::info('画质设置', ['device_id' => $id, 'quality' => $quality, 'android_id' => $device->android_id, 'operator' => $authUser->id]);

        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'quality_change', ['quality' => $quality]);
        }

        return $this->success($device, '画质设置成功');
    }

    public function deviceBatchQuality(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceIds = $request->input('device_ids', []);
        $quality = (int)$request->input('quality', 10);
        if (!in_array($quality, [1, 5, 10])) return $this->error('画质参数无效');

        Device::where('developer_id', $authUser->id)->whereIn('id', $deviceIds)->update(['view_quality' => $quality]);
        return $this->success(null, '批量设置成功');
    }

    // ==================== 标签管理（开发者） ====================

    public function tagList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = Tag::query();
            if ($devId = $request->get('developer_id')) $query->where('owner_id', $devId)->where('owner_type', 'developer');
        } else {
            $query = Tag::forOwner($authUser->id, 'developer');
        }
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function tagAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $tag = Tag::create(['owner_id' => $authUser->id, 'owner_type' => 'developer', 'name' => $request->name, 'color' => $request->input('color', '#1890ff')]);
        return $this->success($tag, '创建成功');
    }

    public function tagUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $tag = Tag::forOwner($authUser->id, 'developer')->findOrFail($id);
        $tag->fill($request->only(['name', 'color']))->save();
        return $this->success($tag, '更新成功');
    }

    public function tagDelete(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        Tag::forOwner($authUser->id, 'developer')->findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    // ==================== 任务管理 ====================

    public function taskList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = Task::query()->with('workflow:id,name');
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } else {
            $query = Task::where('developer_id', $authUser->id)->with('workflow:id,name');
        }
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);

        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)
            ->get()->map(function ($task) {
                $task->device_count = TaskDevice::where('task_id', $task->id)->count();
                $task->success_count = TaskDevice::where('task_id', $task->id)->where('status', 2)->count();
                $task->fail_count = TaskDevice::where('task_id', $task->id)->where('status', 3)->count();
                return $task;
            });

        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function taskAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceIds = $request->input('device_ids', []);
        if (empty($deviceIds)) return $this->error('请选择设备');
        if (empty($request->workflow_id)) return $this->error('请选择工作流');

        $task = Task::create([
            'developer_id' => $authUser->id,
            'user_id' => $request->input('user_id'),
            'workflow_id' => $request->workflow_id,
            'name' => $request->name,
            'status' => Task::STATUS_PENDING,
        ]);

        foreach ($deviceIds as $deviceId) {
            TaskDevice::create(['task_id' => $task->id, 'device_id' => $deviceId, 'status' => 0]);
        }

        return $this->success($task->load('taskDevices'), '任务创建成功');
    }

    public function taskExecute(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = $authUser->role_type === 'super_admin'
            ? Task::findOrFail($id)
            : Task::where('developer_id', $authUser->id)->findOrFail($id);

        $isRerun = in_array($task->status, [Task::STATUS_FAILED, Task::STATUS_CANCELLED, Task::STATUS_COMPLETED]);

        if ($isRerun) {
            $task->update([
                'status'        => Task::STATUS_RUNNING,
                'success_count' => 0,
                'fail_count'    => 0,
                'finished_at'   => null,
            ]);
            TaskDevice::where('task_id', $task->id)->update([
                'status'       => TaskDevice::STATUS_PENDING,
                'error_reason' => null,
                'started_at'   => null,
                'finished_at'  => null,
            ]);
        } else {
            $task->status = Task::STATUS_RUNNING;
            $task->save();
        }

        \App\Jobs\DispatchTaskToDevices::dispatch($task->id);

        return $this->success(null, $isRerun ? '任务已重新执行' : '任务已开始执行');
    }

    public function taskCancel(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = $authUser->role_type === 'super_admin'
            ? Task::findOrFail($id)
            : Task::where('developer_id', $authUser->id)->findOrFail($id);
        if (!in_array($task->status, [0, 1])) return $this->error('当前状态不可取消');
        $task->status = Task::STATUS_CANCELLED;
        $task->save();
        return $this->success(null, '任务已取消');
    }

    private function syncTaskStatus(Task $task): void
    {
        if ($task->status != Task::STATUS_RUNNING) return;

        $taskDevices = TaskDevice::where('task_id', $task->id)->get();
        if ($taskDevices->isEmpty()) return;

        $allDone = true;
        $success = 0;
        $fail = 0;
        foreach ($taskDevices as $td) {
            if ($td->status == TaskDevice::STATUS_COMPLETED) $success++;
            elseif ($td->status == TaskDevice::STATUS_FAILED) $fail++;
            else { $allDone = false; break; }
        }

        $task->success_count = $success;
        $task->fail_count = $fail;

        if ($allDone) {
            $task->finished_at = now();
            // 全部失败才算失败，否则完成
            $task->status = ($success === 0 && $fail > 0) ? Task::STATUS_FAILED : Task::STATUS_COMPLETED;
        }
        $task->save();
    }

    public function taskDetail(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $query = Task::with(['workflow', 'taskDevices.device', 'taskLogFiles']);
        $task = $authUser->role_type === 'super_admin'
            ? $query->findOrFail($id)
            : $query->where('developer_id', $authUser->id)->findOrFail($id);
        return $this->success($task);
    }

    public function taskLogs(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = $authUser->role_type === 'super_admin'
            ? Task::findOrFail($id)
            : Task::where('developer_id', $authUser->id)->findOrFail($id);
        return $this->doTaskLogs($task, $request);
    }

    public function taskLogExport(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = $authUser->role_type === 'super_admin'
            ? Task::findOrFail($id)
            : Task::where('developer_id', $authUser->id)->findOrFail($id);
        return $this->doTaskLogExport($authUser, $task, $request);
    }

    private function doTaskLogs(Task $task, $request): \Illuminate\Http\JsonResponse
    {
        $taskDeviceId = $request->get('task_device_id');
        if (!$taskDeviceId) {
            $taskDeviceIds = TaskDevice::where('task_id', $task->id)->pluck('id');
            $total = 0;
            foreach ($taskDeviceIds as $tdId) {
                $path = storage_path('logs/tasks/' . $task->id . '_' . $tdId . '.log');
                if (file_exists($path)) $total += $this->countLines($path);
            }
            return $this->success(['total' => $total, 'data' => []]);
        }

        $path = storage_path('logs/tasks/' . $task->id . '_' . (int)$taskDeviceId . '.log');
        if (!file_exists($path)) return $this->success(['total' => 0, 'data' => []]);

        $page = max(1, (int)$request->get('page', 1));
        $pageSize = min(100, max(1, (int)$request->get('pageSize', 100)));
        $total = $this->countLines($path);
        $offset = ($page - 1) * $pageSize;
        $lines = [];
        $handle = fopen($path, 'r');
        if ($handle) {
            $i = 0;
            while (($line = fgets($handle)) !== false) {
                if ($i >= $offset && $i < $offset + $pageSize) {
                    $parsed = $this->parseLogLine(rtrim($line, "\n\r"));
                    $parsed['id'] = $i + 1;
                    $lines[] = $parsed;
                }
                $i++;
                if ($i >= $offset + $pageSize) break;
            }
            fclose($handle);
        }

        return $this->success(['total' => $total, 'data' => $lines]);
    }

    private function doTaskLogExport($authUser, Task $task, $request): \Illuminate\Http\JsonResponse
    {
        $taskDeviceId = $request->get('task_device_id');
        if (!$taskDeviceId) return $this->error('请选择设备');

        $path = storage_path('logs/tasks/' . $task->id . '_' . (int)$taskDeviceId . '.log');
        if (!file_exists($path)) return $this->error('暂无日志文件');

        $dailyQuotaChars = (int)\App\Models\Option::getValue('storage_log_daily_quota_chars', 0);
        if ($dailyQuotaChars > 0) {
            $devId = $authUser->role_type === 'super_admin' ? $task->developer_id : $authUser->id;
            $todayChars = (int)\App\Models\TaskLogFile::whereDate('created_at', today())
                ->whereIn('task_id', Task::where('developer_id', $devId)->pluck('id'))
                ->sum('raw_chars');
            if ($todayChars >= $dailyQuotaChars) {
                return $this->error(sprintf('当日日志字符累计已达 %s，不支持上传', number_format($dailyQuotaChars)));
            }
        }

        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') return $this->error('日志文件为空');

        $gz = gzencode($raw, 9);
        if ($gz === false) return $this->error('压缩日志失败');

        $storage = new \App\Services\ObjectStorageService();
        if (!$storage->isConfigured()) return $this->error('对象存储未配置');

        $filename = sprintf('task_%d_device_%d_%d.log.gz', $task->id, $taskDeviceId, time());
        $url = $storage->upload('task-logs/' . $filename, $gz, 'application/gzip');
        if (!$url) return $this->error('上传失败');

        \App\Models\TaskLogFile::create([
            'task_id'        => $task->id,
            'task_device_id' => (int)$taskDeviceId,
            'url'            => $url,
            'raw_chars'      => mb_strlen($raw),
            'size'           => strlen($gz),
            'created_at'     => now(),
        ]);

        return $this->success(['url' => $url], '日志已导出');
    }

    private function countLines(string $path): int
    {
        $handle = fopen($path, 'r');
        if (!$handle) return 0;
        $count = 0;
        while (!feof($handle)) { if (fgets($handle) !== false) $count++; }
        fclose($handle);
        return $count;
    }

    private function parseLogLine(string $line): array
    {
        $data = ['level' => 'info', 'message' => $line, 'created_at' => ''];
        if (preg_match('/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/', $line, $m)) {
            $data['created_at'] = $m[1];
            $data['level'] = strtolower($m[2]);
            $data['message'] = $m[3];
        }
        return $data;
    }

    // ==================== 订单与卡密 ====================

    public function developerPlanList(Request $request)
    {
        return $this->success(Plan::active()->get());
    }

    public function deviceOrderCreate(Request $request)
    {
        $authUser = $this->authUser($request);
        $planId = $request->input('plan_id');
        $plan = Plan::findOrFail($planId);

        $orderNo = date('YmdHis') . mt_rand(1000, 9999);
        $totalAmount = (string)$plan->price;

        // 调用支付宝预下单获取二维码
        $qrCode = '';
        try {
            AlipayFactory::setOptions(AlipayController::getOptions());
            $result = AlipayFactory::payment()->faceToFace()->preCreate(
                $plan->name,
                $orderNo,
                $totalAmount
            );
            Log::info('支付宝预下单返回', [
                'order_no' => $orderNo,
                'qr_code' => $result->qrCode ?? 'NULL',
                'http_body' => $result->httpBody ?? 'NULL',
                'code' => $result->code ?? 'NULL',
                'msg' => $result->msg ?? 'NULL',
                'sub_code' => $result->subCode ?? 'NULL',
                'sub_msg' => $result->subMsg ?? 'NULL',
                'raw' => method_exists($result, 'toMap') ? json_encode($result->toMap(), JSON_UNESCAPED_UNICODE) : json_encode($result),
            ]);
            $qrCode = $result->qrCode;
            if (!empty($result->code) && $result->code !== '10000') {
                Log::error('支付宝预下单失败', ['code' => $result->code, 'sub_msg' => $result->subMsg ?? $result->msg]);
                return $this->error(['msg' => $result->subMsg ?: $result->msg ?: '支付宝预下单失败']);
            }
        } catch (\Exception $e) {
            Log::error('支付宝预下单失败: ' . $e->getMessage());
            return $this->error(['msg' => '创建支付订单失败']);
        }

        $order = DeviceOrder::create([
            'order_no' => $orderNo,
            'order_type' => DeviceOrder::ORDER_TYPE_PURCHASE,
            'developer_id' => $authUser->id,
            'plan_id' => $plan->id,
            'device_ids' => $request->input('device_ids') ?: null,
            'device_count' => $request->input('device_count', $plan->unit_count),
            'total_price' => $totalAmount,
            'status' => DeviceOrder::STATUS_UNPAID,
        ]);

        return $this->success([
            'id' => $order->id,
            'order_no' => $orderNo,
            'qr_code' => $qrCode,
            'total_price' => $totalAmount,
        ], '订单已创建，请扫码支付');
    }

    /**
     * 检查设备订单支付状态
     */
    public function checkDeviceOrderStatus(Request $request)
    {
        $orderNo = $request->get('order_no');
        $order = DeviceOrder::where('order_no', $orderNo)->first();
        if (!$order) {
            $order = FrameOrder::where('order_no', $orderNo)->first();
        }
        if (!$order) return $this->error(['msg' => '订单不存在']);

        $paid = $order->status == DeviceOrder::STATUS_PAID;
        return $this->success(['paid' => $paid, 'status' => $order->status]);
    }

    public function frameOrderCreate(Request $request)
    {
        $authUser = $this->authUser($request);
        $planId = $request->input('plan_id');
        $plan = Plan::findOrFail($planId);

        $order = FrameOrder::create([
            'developer_id' => $authUser->id,
            'plan_id' => $plan->id,
            'frame_count' => $plan->unit_count,
            'total_price' => $plan->price,
            'status' => FrameOrder::STATUS_UNPAID,
        ]);

        return $this->success($order, '订单已创建，请支付');
    }

    public function developerDeviceOrderList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = DeviceOrder::where('developer_id', $authUser->id)->with('plan:id,name,billing_cycle,unit_count,bonus_days');
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get()
            ->map(function ($order) {
                $plan = $order->plan;
                $duration = '';
                if ($plan) {
                    $cycleMap = ['day' => '天', 'month' => '月', 'year' => '年'];
                    $unit = $cycleMap[$plan->billing_cycle] ?? '月';
                    $days = ['day' => 1, 'month' => 30, 'year' => 365][$plan->billing_cycle] ?? 30;
                    $totalDays = $days + ($plan->bonus_days ?? 0);
                    $duration = $totalDays . '天' . ($plan->bonus_days ? "（含赠{$plan->bonus_days}天）" : '');
                }
                return $order->toArray() + ['plan_duration' => $duration];
            });

        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function developerFrameOrderList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = FrameOrder::where('developer_id', $authUser->id)->with('plan:id,name');
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function cardKeyList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = CardKey::query();
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } else {
            $query = CardKey::where('developer_id', $authUser->id);
        }
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function cardKeyGenerate(Request $request)
    {
        $authUser = $this->authUser($request);
        $count = (int)$request->input('count', 1);
        if ($count < 1 || $count > 100) return $this->error('生成数量需在1-100之间');

        $keys = [];
        for ($i = 0; $i < $count; $i++) {
            $keyCode = strtoupper(substr(md5(uniqid() . $authUser->id . $i), 0, 16));
            $keys[] = CardKey::create([
                'developer_id' => $authUser->id,
                'key_code' => $keyCode,
                'status' => CardKey::STATUS_UNUSED,
            ]);
        }

        return $this->success(['keys' => $keys, 'count' => $count], "成功生成{$count}个卡密");
    }

    // ==================== 开发者日志 ====================

    public function logList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = \App\Models\TaskLogFile::with(['taskDevice' => function ($q) {
            $q->with(['task:id,name', 'device:id,name,android_id']);
        }]);

        if ($authUser->role_type === 'super_admin') {
            $taskQuery = Task::query();
            if ($devId = $request->get('developer_id')) $taskQuery->where('developer_id', $devId);
            $query->whereIn('task_id', $taskQuery->pluck('id'));
        } else {
            $query->whereIn('task_id', Task::where('developer_id', $authUser->id)->pluck('id'));
        }

        $total = $query->count();
        $raw = $query->orderBy('id', 'desc')
            ->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $raw->map(function ($f) {
            return [
                'id'      => $f->id,
                'url'     => $f->url,
                'size'    => $f->size,
                'raw_chars' => $f->raw_chars ?? 0,
                'created_at' => $f->created_at,
                'task_name'  => $f->taskDevice->task->name ?? '-',
                'task_id'    => $f->taskDevice->task->id ?? null,
                'device_name'=> $f->taskDevice->device->name ?? '-',
                'android_id' => $f->taskDevice->device->android_id ?? null,
            ];
        });
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function logExport(Request $request)
    {
        // 日志现在通过 tasks/{id}/log-export 导出，不再提供全局 CSV 导出
        return $this->error('请通过任务详情导出日志');
    }

    // ==================== 额度消耗 ====================

    public function frameUsageStart(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceId = $request->input('device_id');
        $device = Device::where('developer_id', $authUser->id)->findOrFail($deviceId);
        if ($device->isExpired()) return $this->error('设备已过期');

        // 检查实时画面额度是否充足（从 DB 重新读取确保最新）
        if (Developer::find($authUser->id)->device_frame_balance <= 0) {
            return $this->error('实时画面额度不足，请充值后重试');
        }

        $log = FrameUsageLog::create([
            'developer_id' => $authUser->id,
            'device_id' => $deviceId,
            'quality' => $device->view_quality,
            'started_at' => now(),
        ]);

        return $this->success(['id' => $log->id], '已开始计费');
    }

    public function frameUsageEnd(Request $request)
    {
        $authUser = $this->authUser($request);
        $logId = $request->input('id');
        $log = FrameUsageLog::where('developer_id', $authUser->id)->findOrFail($logId);

        $now = now();
        $seconds = max(1, $now->diffInSeconds($log->started_at));
        $framesConsumed = $seconds * $log->quality;

        $log->update(['ended_at' => $now, 'frames_consumed' => $framesConsumed]);

        // 从池子消费开发者额度，不能为负数
        \App\Models\FrameBalancePool::consume($authUser->id, $framesConsumed);
        \App\Models\FrameBalancePool::syncDeveloperBalance($authUser->id);

        return $this->success(['frames_consumed' => $framesConsumed, 'seconds' => $seconds], '计费完成');
    }

    public function frameUsageList(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') {
            $query = FrameUsageLog::query()->with('device:id,name,android_id');
            if ($devId = $request->get('developer_id')) $query->where('developer_id', $devId);
        } elseif ($authUser->role_type === 'user') {
            $query = FrameUsageLog::where('user_id', $authUser->id)->with('device:id,name,android_id');
        } else {
            $query = FrameUsageLog::where('developer_id', $authUser->id)->with('device:id,name,android_id');
        }
        if ($deviceId = $request->get('device_id')) $query->where('device_id', $deviceId);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)
            ->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    /** 额度账单汇总 */
    public function frameUsageStats(Request $request)
    {
        $authUser = $this->authUser($request);
        $isSuperAdmin = $authUser->role_type === 'super_admin';

        // 超管看全部，开发者看自己的
        $devId = $isSuperAdmin ? $request->get('developer_id') : $authUser->id;

        $byDeviceQuery = FrameUsageLog::whereNotNull('ended_at');
        $byDayQuery = FrameUsageLog::whereNotNull('ended_at');
        $totalQuery = FrameUsageLog::whereNotNull('ended_at');
        $monthQuery = FrameUsageLog::whereNotNull('ended_at');

        if ($devId) {
            $byDeviceQuery->where('developer_id', $devId);
            $byDayQuery->where('developer_id', $devId);
            $totalQuery->where('developer_id', $devId);
            $monthQuery->where('developer_id', $devId);
        }

        // 按设备汇总
        $byDevice = (clone $byDeviceQuery)
            ->selectRaw('device_id, sum(frames_consumed) as total_points, sum(GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))) as total_seconds, count(*) as sessions')
            ->groupBy('device_id')
            ->with('device:id,name,android_id')
            ->orderByDesc('total_points')
            ->get();

        // 按天汇总（最近30天）
        $byDay = (clone $byDayQuery)
            ->where('ended_at', '>=', now()->subDays(30))
            ->selectRaw("DATE(ended_at) as date, sum(frames_consumed) as total_points, sum(GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))) as total_seconds, count(*) as sessions")
            ->groupBy('date')
            ->orderByDesc('date')
            ->get();

        // 总计
        $totalPoints = (clone $totalQuery)->sum('frames_consumed');
        $totalSeconds = (clone $totalQuery)->sum(DB::raw('GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))'));

        // 当前月
        $monthPoints = (clone $monthQuery)
            ->whereMonth('ended_at', now()->month)->whereYear('ended_at', now()->year)->sum('frames_consumed');
        $monthSeconds = (clone $monthQuery)
            ->whereMonth('ended_at', now()->month)->whereYear('ended_at', now()->year)->sum(DB::raw('GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))'));

        return $this->success([
            'by_device'     => $byDevice,
            'by_day'        => $byDay,
            'total_points'  => (int)$totalPoints,
            'total_seconds' => (int)$totalSeconds,
            'month_points'  => (int)$monthPoints,
            'month_seconds' => (int)$monthSeconds,
            'balance'       => $devId
                ? (Developer::find($devId)->device_frame_balance ?? 0)
                : Developer::sum('device_frame_balance'),
        ]);
    }

    // ==================== 通知 ====================

    public function notificationList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Notification::forRecipient($authUser->id, $authUser->role_type);
        if ($request->get('unread')) $query->unread();
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $unreadCount = Notification::forRecipient($authUser->id, $authUser->role_type)->unread()->count();
        return $this->success(['total' => $total, 'data' => $data, 'unread_count' => $unreadCount]);
    }

    public function notificationRead(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $notification = Notification::forRecipient($authUser->id, $authUser->role_type)->findOrFail($id);
        $notification->update(['is_read' => 1]);
        return $this->success(null, '已标记已读');
    }

    public function notificationSettings(Request $request)
    {
        $authUser = $this->authUser($request);
        $developer = Developer::find($authUser->id);
        $developer->fill($request->only(['dingtalk_webhook', 'wecom_webhook', 'notify_events']))->save();
        return $this->success($developer, '通知设置已更新');
    }

    // ==================== 设备端接口 ====================

    public function deviceHeartbeat(Request $request)
    {
        $androidId = $request->input('android_id');
        Device::where('android_id', $androidId)->update(['last_seen_at' => now()]);
        return $this->success(null);
    }

    public function deviceLogUpload(Request $request)
    {
        $taskDeviceId = $request->input('task_device_id');
        $taskId = $request->input('task_id');
        $messages = $request->input('logs', []);
        if (!$taskId || !$taskDeviceId) return $this->error('缺少 task_id 或 task_device_id');

        $dir = storage_path('logs/tasks');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $path = $dir . '/' . $taskId . '_' . $taskDeviceId . '.log';

        foreach ($messages as $msg) {
            $line = sprintf("[%s] [%s] %s\n", now()->format('Y-m-d H:i:s.u'), strtoupper($msg['level'] ?? 'info'), $msg['message'] ?? '');
            file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
        }

        return $this->success(null);
    }

    public function deviceLivekitJoin(Request $request)
    {
        $androidId = $request->input('android_id');
        $participantSid = $request->input('participant_sid');
        Device::where('android_id', $androidId)->update(['livekit_participant_sid' => $participantSid, 'last_seen_at' => now()]);
        return $this->success(null);
    }

    // ==================== 运营端接口 ====================

    private function getUserDevOwner(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type !== 'user') return null;
        return $authUser->developer_id;
    }

    public function userResetPassword(Request $request)
    {
        $authUser = $this->authUser($request);
        $user = User::find($authUser->id);
        if (!Hash::check($request->input('old_password'), $user->password)) return $this->error('原密码错误');
        $user->password = Hash::make($request->input('password'));
        $user->save();
        return $this->success(null, '密码修改成功');
    }

    public function userDashboard(Request $request)
    {
        $authUser = $this->authUser($request);
        $userId = $authUser->id;

        $userAndroidIds = Device::where('user_id', $userId)->whereNotNull('android_id')->pluck('android_id')->toArray();
        $userOnlineMap = WebSocketHelper::checkDevicesOnline($userAndroidIds);
        $userOnlineCount = count(array_filter($userOnlineMap));

        $user = User::find($userId);
        $consumedPoints = FrameUsageLog::where('user_id', $userId)->whereNotNull('ended_at')->sum('frames_consumed');

        return $this->success([
            'device_count' => Device::where('user_id', $userId)->count(),
            'online_device_count' => $userOnlineCount,
            'task_count' => Task::where('user_id', $userId)->count(),
            'running_task_count' => Task::where('user_id', $userId)->where('status', Task::STATUS_RUNNING)->count(),
            'frame_balance' => (int)($user->device_frame_balance ?? 0),
            'total_points' => (int)(($user->device_frame_balance ?? 0) + $consumedPoints),
            'consumed_points' => (int)$consumedPoints,
        ]);
    }

    public function userDeviceList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Device::where('user_id', $authUser->id)->with('tags');
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        $total = $query->count();
        $devices = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $this->mergeOnlineStatus($devices);
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function userDeviceUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        $device->fill($request->only(['name', 'remark']))->save();
        return $this->success($device, '更新成功');
    }

    public function userDeviceUpdateTags(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        $tagIds = $request->input('tag_ids', []);
        $device->tags()->sync($tagIds);
        return $this->success($device->load('tags'), '标签已更新');
    }

    public function userDeviceLivekitToken(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        $token = 'livekit_token_placeholder_' . $device->id;
        return $this->success(['token' => $token, 'room_name' => $device->livekit_room_name]);
    }

    public function userDeviceSetQuality(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $quality = (int)$request->input('quality', 10);
        if (!in_array($quality, [1, 5, 10])) return $this->error('画质参数无效');
        $device = Device::where('user_id', $authUser->id)->findOrFail($id);
        if ($device->isExpired()) return $this->error('设备已过期');
        $device->view_quality = $quality;
        $device->save();

        Log::info('画质设置(运营)', ['device_id' => $id, 'quality' => $quality, 'android_id' => $device->android_id, 'operator' => $authUser->id]);

        if ($device->android_id) {
            WebSocketHelper::sendCommandToDevice($device->android_id, 'quality_change', ['quality' => $quality]);
        }
        return $this->success($device, '画质设置成功');
    }

    // ==================== 运营端标签 ====================

    public function userTagList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Tag::forOwner($authUser->id, 'user');
        if ($name = $request->get('name')) $query->where('name', 'like', "%{$name}%");
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function userTagAdd(Request $request)
    {
        $authUser = $this->authUser($request);
        $tag = Tag::create(['owner_id' => $authUser->id, 'owner_type' => 'user', 'name' => $request->name, 'color' => $request->input('color', '#1890ff')]);
        return $this->success($tag, '创建成功');
    }

    public function userTagUpdate(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $tag = Tag::forOwner($authUser->id, 'user')->findOrFail($id);
        $tag->fill($request->only(['name', 'color']))->save();
        return $this->success($tag, '更新成功');
    }

    public function userTagDelete(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        Tag::forOwner($authUser->id, 'user')->findOrFail($id)->delete();
        return $this->success(null, '删除成功');
    }

    // ==================== 运营端工作流&任务&日志 ====================

    public function userWorkflowList(Request $request)
    {
        $authUser = $this->authUser($request);
        $workflows = Workflow::where('developer_id', $authUser->developer_id)
            ->with(['workflowScripts.scriptVersion.script'])
            ->orderBy('id', 'desc')->get();
        return $this->success($workflows);
    }

    public function userTaskList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Task::where('user_id', $authUser->id)->with('workflow:id,name');
        if (($status = $request->get('status')) !== null && $status !== '') $query->where('status', (int)$status);
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)
            ->get()->map(function ($task) {
                $task->device_count = TaskDevice::where('task_id', $task->id)->count();
                return $task;
            });
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function userTaskDetail(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = Task::where('user_id', $authUser->id)->with(['workflow', 'taskDevices.device'])->findOrFail($id);
        return $this->success($task);
    }

    public function userTaskExecute(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = Task::where('user_id', $authUser->id)->findOrFail($id);
        $task->status = Task::STATUS_RUNNING;
        $task->save();
        return $this->success(null, '任务已开始执行');
    }

    public function userTaskLogs(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = Task::where('user_id', $authUser->id)->findOrFail($id);
        return $this->doTaskLogs($task, $request);
    }

    public function userTaskLogExport(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $task = Task::where('user_id', $authUser->id)->findOrFail($id);
        return $this->doTaskLogExport($authUser, $task, $request);
    }

    public function userLogList(Request $request)
    {
        $authUser = $this->authUser($request);
        $taskIds = Task::where('user_id', $authUser->id)->pluck('id');
        $query = TaskLogFile::whereIn('task_id', $taskIds)->with(['taskDevice' => function ($q) {
            $q->with(['task:id,name', 'device:id,name,android_id']);
        }]);

        $total = $query->count();
        $raw = $query->orderBy('id', 'desc')
            ->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $data = $raw->map(function ($f) {
            return [
                'id'      => $f->id,
                'url'     => $f->url,
                'size'    => $f->size,
                'raw_chars' => $f->raw_chars ?? 0,
                'created_at' => $f->created_at,
                'task_name'  => $f->taskDevice->task->name ?? '-',
                'task_id'    => $f->taskDevice->task->id ?? null,
                'device_name'=> $f->taskDevice->device->name ?? '-',
                'android_id' => $f->taskDevice->device->android_id ?? null,
            ];
        });
        return $this->success(['total' => $total, 'data' => $data]);
    }

    public function userLogExport(Request $request)
    {
        return $this->error('请通过任务详情导出日志');
    }

    // ==================== 运营端额度消耗 ====================

    public function userFrameUsageStart(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceId = $request->input('device_id');
        $device = Device::where('user_id', $authUser->id)->findOrFail($deviceId);
        if ($device->isExpired()) return $this->error('设备已过期');

        // 检查运营实时画面额度余额
        $user = User::find($authUser->id);
        if ($user->device_frame_balance <= 0) return $this->error('实时画面额度不足，请充值后重试');

        $log = FrameUsageLog::create([
            'developer_id' => $authUser->developer_id,
            'user_id' => $authUser->id,
            'device_id' => $deviceId,
            'quality' => $device->view_quality,
            'started_at' => now(),
        ]);

        return $this->success(['id' => $log->id], '已开始计费');
    }

    public function userFrameUsageEnd(Request $request)
    {
        $authUser = $this->authUser($request);
        $logId = $request->input('id');
        $log = FrameUsageLog::where('user_id', $authUser->id)->findOrFail($logId);

        $now = now();
        $seconds = max(1, $now->diffInSeconds($log->started_at));
        $framesConsumed = $seconds * $log->quality;

        $log->update(['ended_at' => $now, 'frames_consumed' => $framesConsumed]);

        // 扣除运营额度余额，不能为负数
        $user = User::find($authUser->id);
        $deduct = min($user->device_frame_balance, $framesConsumed);
        if ($deduct > 0) {
            $user->decrement('device_frame_balance', $deduct);
        }

        return $this->success(['frames_consumed' => $framesConsumed, 'seconds' => $seconds], '计费完成');
    }

    /** 运营额度账单汇总 */
    public function userFrameUsageStats(Request $request)
    {
        $authUser = $this->authUser($request);
        $userId = $authUser->id;

        $byDevice = FrameUsageLog::where('user_id', $userId)
            ->whereNotNull('ended_at')
            ->selectRaw('device_id, sum(frames_consumed) as total_points, sum(GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))) as total_seconds, count(*) as sessions')
            ->groupBy('device_id')
            ->with('device:id,name,android_id')
            ->orderByDesc('total_points')
            ->get();

        $byDay = FrameUsageLog::where('user_id', $userId)
            ->whereNotNull('ended_at')
            ->where('ended_at', '>=', now()->subDays(30))
            ->selectRaw("DATE(ended_at) as date, sum(frames_consumed) as total_points, sum(GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))) as total_seconds, count(*) as sessions")
            ->groupBy('date')
            ->orderByDesc('date')
            ->get();

        $totalPoints = FrameUsageLog::where('user_id', $userId)->whereNotNull('ended_at')->sum('frames_consumed');
        $totalSeconds = FrameUsageLog::where('user_id', $userId)->whereNotNull('ended_at')->sum(DB::raw('GREATEST(1, TIMESTAMPDIFF(SECOND, started_at, ended_at))'));

        return $this->success([
            'by_device'     => $byDevice,
            'by_day'        => $byDay,
            'total_points'  => (int)$totalPoints,
            'total_seconds' => (int)$totalSeconds,
            'balance'       => User::find($userId)->device_frame_balance ?? 0,
        ]);
    }

    // ==================== 运营端通知 ====================

    public function userNotificationList(Request $request)
    {
        $authUser = $this->authUser($request);
        $query = Notification::forRecipient($authUser->id, 'user');
        if ($request->get('unread')) $query->unread();
        $total = $query->count();
        $data = $query->orderBy('id', 'desc')->offset(($request->page - 1) * $request->limit)->limit($request->limit)->get();
        $unreadCount = Notification::forRecipient($authUser->id, 'user')->unread()->count();
        return $this->success(['total' => $total, 'data' => $data, 'unread_count' => $unreadCount]);
    }

    public function userNotificationRead(Request $request, $id)
    {
        $authUser = $this->authUser($request);
        $notification = Notification::forRecipient($authUser->id, 'user')->findOrFail($id);
        $notification->update(['is_read' => 1]);
        return $this->success(null, '已标记已读');
    }

    // success/error 方法继承自 Controller

    /**
     * 合并 Redis 实时在线状态到设备数据
     */
    private function mergeOnlineStatus($devices): array
    {
        $androidIds = [];
        foreach ($devices as $d) {
            if (!empty($d->android_id)) {
                $androidIds[] = $d->android_id;
            }
        }

        $onlineMap = [];
        if (!empty($androidIds)) {
            try {
                $onlineMap = WebSocketHelper::checkDevicesOnline($androidIds);
            } catch (\Exception $e) {
                Log::warning('查询设备在线状态失败: ' . $e->getMessage());
            }
        }

        $data = [];
        foreach ($devices as $d) {
            $item = $d->toArray();
            $aid = $d->android_id ?? '';
            $redisOnline = !empty($aid) && !empty($onlineMap[$aid]);

            // 过期设备强制设为离线，不受 Redis 在线状态影响
            if ($d->isExpired()) {
                $item['status'] = Device::STATUS_OFFLINE;
            } elseif ($redisOnline) {
                // 设备通过 WebSocket 实时在线 → 设置为在线
                $item['status'] = Device::STATUS_ONLINE;
            } else {
                // Redis 中没有在线记录 → DB 状态为在线时修正为离线
                if ($d->status == Device::STATUS_ONLINE) {
                    $item['status'] = Device::STATUS_OFFLINE;
                }
            }

            $data[] = $item;
        }

        return $data;
    }

    /**
     * 批量查询设备在线状态（轻量接口，仅返回 id -> status 映射）
     */
    private function batchDeviceStatus(array $deviceIds, $scopeField = null, $scopeValue = null): array
    {
        if (empty($deviceIds)) {
            return [];
        }
        $query = Device::whereIn('id', $deviceIds);
        if ($scopeField) {
            $query->where($scopeField, $scopeValue);
        }
        $devices = $query->get();
        $data = $this->mergeOnlineStatus($devices);
        $result = [];
        foreach ($data as $item) {
            $result[(int)$item['id']] = (int)$item['status'];
        }
        return $result;
    }

    public function adminDeviceStatus(Request $request)
    {
        $deviceIds = $request->input('device_ids', []);
        return $this->success($this->batchDeviceStatus($deviceIds));
    }

    public function deviceStatus(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceIds = $request->input('device_ids', []);
        return $this->success($this->batchDeviceStatus($deviceIds, 'developer_id', $authUser->id));
    }

    public function userDeviceStatus(Request $request)
    {
        $authUser = $this->authUser($request);
        $deviceIds = $request->input('device_ids', []);
        return $this->success($this->batchDeviceStatus($deviceIds, 'user_id', $authUser->id));
    }

    /**
     * 生成平台唯一的激活码
     */
    private function generateUniqueCardKey(): string
    {
        do {
            $code = strtoupper(substr(md5(uniqid() . mt_rand() . time()), 0, 16));
        } while (CardKey::where('key_code', $code)->exists());

        return $code;
    }

    // ==================== 统一接口（角色自适应委托） ====================

    private function delegate(Request $request, string $adminMethod, string $developerMethod, string $userMethod, ...$args)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') return $this->$adminMethod($request, ...$args);
        if ($authUser->role_type === 'user') return $this->$userMethod($request, ...$args);
        return $this->$developerMethod($request, ...$args);
    }

    private function denyUnlessAdmin(Request $request, string $method, ...$args)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type !== 'super_admin') return $this->error('无权限', 403);
        return $this->$method($request, ...$args);
    }

    private function denyUnlessAdminOrDeveloper(Request $request, string $method, ...$args)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'user') return $this->error('无权限', 403);
        return $this->$method($request, ...$args);
    }

    // 仪表盘
    public function unifiedDashboard(Request $request)
    {
        $authUser = $this->authUser($request);
        if ($authUser->role_type === 'super_admin') return $this->adminDashboard($request);
        if ($authUser->role_type === 'user') return $this->userDashboard($request);
        return $this->developerDashboard($request);
    }

    // 设备管理
    public function unifiedDeviceList(Request $request) { return $this->delegate($request, 'adminDeviceList', 'deviceList', 'userDeviceList'); }
    public function unifiedDeviceAdd(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'deviceAdd'); }
    public function unifiedDeviceStatus(Request $request) { return $this->delegate($request, 'adminDeviceStatus', 'deviceStatus', 'userDeviceStatus'); }
    public function unifiedDeviceBatchQuality(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'deviceBatchQuality'); }
    public function unifiedDeviceUpdate(Request $request, $id) { return $this->delegate($request, 'adminDeviceUpdate', 'deviceUpdate', 'userDeviceUpdate', $id); }
    public function unifiedDeviceDelete(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'deviceDelete', $id); }
    public function unifiedDeviceUnbind(Request $request, $id) { return $this->delegate($request, 'adminDeviceUnbind', 'deviceUnbind', 'deviceUnbind', $id); }
    public function unifiedDeviceLivekitToken(Request $request, $id) { return $this->delegate($request, 'adminDeviceLivekitToken', 'deviceLivekitToken', 'userDeviceLivekitToken', $id); }
    public function unifiedDeviceLivekitViewerToken(Request $request, $id) { return $this->delegate($request, 'adminDeviceLivekitToken', 'deviceLivekitViewerToken', 'userDeviceLivekitViewerToken', $id); }
    public function unifiedDeviceSetQuality(Request $request, $id) { return $this->delegate($request, 'adminDeviceUpdate', 'deviceSetQuality', 'userDeviceSetQuality', $id); }
    public function unifiedDeviceUpdateTags(Request $request, $id) { return $this->delegate($request, 'adminDeviceUpdate', 'deviceUpdateTags', 'userDeviceUpdateTags', $id); }
    public function unifiedDeviceStreamStart(Request $request, $id) { return $this->delegate($request, 'adminDeviceStreamStart', 'deviceStreamStart', 'userDeviceStreamStart', $id); }
    public function unifiedDeviceStreamStop(Request $request, $id) { return $this->delegate($request, 'adminDeviceStreamStop', 'deviceStreamStop', 'userDeviceStreamStop', $id); }

    // 标签管理
    public function unifiedTagList(Request $request) { return $this->delegate($request, 'tagList', 'tagList', 'userTagList'); }
    public function unifiedTagAdd(Request $request) { return $this->delegate($request, 'tagAdd', 'tagAdd', 'userTagAdd'); }
    public function unifiedTagUpdate(Request $request, $id) { return $this->delegate($request, 'tagUpdate', 'tagUpdate', 'userTagUpdate', $id); }
    public function unifiedTagDelete(Request $request, $id) { return $this->delegate($request, 'tagDelete', 'tagDelete', 'userTagDelete', $id); }

    // 脚本管理
    public function unifiedScriptList(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'scriptList'); }
    public function unifiedScriptAdd(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'scriptAdd'); }
    public function unifiedScriptDetail(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'scriptDetail', $id); }
    public function unifiedScriptUpdate(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'scriptUpdate', $id); }
    public function unifiedScriptDelete(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'scriptDelete', $id); }

    // 工作流
    public function unifiedWorkflowList(Request $request) { return $this->delegate($request, 'workflowList', 'workflowList', 'userWorkflowList'); }
    public function unifiedWorkflowAdd(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'workflowAdd'); }
    public function unifiedWorkflowUpdate(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'workflowUpdate', $id); }
    public function unifiedWorkflowDelete(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'workflowDelete', $id); }

    // 任务管理
    public function unifiedTaskList(Request $request) { return $this->delegate($request, 'taskList', 'taskList', 'userTaskList'); }
    public function unifiedTaskAdd(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'taskAdd'); }
    public function unifiedTaskDetail(Request $request, $id) { return $this->delegate($request, 'taskDetail', 'taskDetail', 'userTaskDetail', $id); }
    public function unifiedTaskExecute(Request $request, $id) { return $this->delegate($request, 'taskExecute', 'taskExecute', 'userTaskExecute', $id); }
    public function unifiedTaskCancel(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'taskCancel', $id); }
    public function unifiedTaskLogs(Request $request, $id) { return $this->delegate($request, 'taskLogs', 'taskLogs', 'userTaskLogs', $id); }
    public function unifiedTaskLogExport(Request $request, $id) { return $this->delegate($request, 'taskLogExport', 'taskLogExport', 'userTaskLogExport', $id); }

    // 日志
    public function unifiedLogList(Request $request) { return $this->delegate($request, 'logList', 'logList', 'userLogList'); }
    public function unifiedLogExport(Request $request) { return $this->delegate($request, 'logExport', 'logExport', 'userLogExport'); }

    // 运营管理
    public function unifiedUserList(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserList'); }
    public function unifiedUserAdd(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserAdd'); }
    public function unifiedUserUpdate(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserUpdate', $id); }
    public function unifiedUserToggleStatus(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserToggleStatus', $id); }
    public function unifiedUserFrameBalance(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserFrameBalance', $id); }
    public function unifiedUserAssignDevices(Request $request, $id) { return $this->denyUnlessAdminOrDeveloper($request, 'developerUserAssignDevices', $id); }

    // 帧数消耗
    public function unifiedFrameUsageStart(Request $request) { return $this->delegate($request, 'frameUsageStart', 'frameUsageStart', 'userFrameUsageStart'); }
    public function unifiedFrameUsageEnd(Request $request) { return $this->delegate($request, 'frameUsageEnd', 'frameUsageEnd', 'userFrameUsageEnd'); }
    public function unifiedFrameUsageList(Request $request) { return $this->delegate($request, 'frameUsageList', 'frameUsageList', 'frameUsageList'); }
    public function unifiedFrameUsageStats(Request $request) { return $this->delegate($request, 'frameUsageStats', 'frameUsageStats', 'userFrameUsageStats'); }

    // 套餐
    public function unifiedPlanList(Request $request) { return $this->delegate($request, 'adminPlanList', 'developerPlanList', 'developerPlanList'); }
    public function unifiedPlanAdd(Request $request) { return $this->denyUnlessAdmin($request, 'adminPlanAdd'); }
    public function unifiedPlanUpdate(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminPlanUpdate', $id); }
    public function unifiedPlanDelete(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminPlanDelete', $id); }

    // 订单
    public function unifiedOrderList(Request $request) { return $this->delegate($request, 'adminDeviceOrderList', 'developerDeviceOrderList', 'developerDeviceOrderList'); }
    public function unifiedOrderCreate(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'deviceOrderCreate'); }
    public function unifiedOrderStatus(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'checkDeviceOrderStatus'); }
    public function unifiedDeviceOrderList(Request $request) { return $this->delegate($request, 'adminDeviceOrderList', 'developerDeviceOrderList', 'developerDeviceOrderList'); }
    public function unifiedDeviceOrderCreate(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'deviceOrderCreate'); }
    public function unifiedFrameOrderList(Request $request) { return $this->delegate($request, 'adminFrameOrderList', 'developerFrameOrderList', 'developerFrameOrderList'); }
    public function unifiedFrameOrderCreate(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'frameOrderCreate'); }

    // 卡密
    public function unifiedCardKeyList(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'cardKeyList'); }
    public function unifiedCardKeyGenerate(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'cardKeyGenerate'); }

    // 通知
    public function unifiedNotificationList(Request $request) { return $this->delegate($request, 'notificationList', 'notificationList', 'userNotificationList'); }
    public function unifiedNotificationRead(Request $request, $id) { return $this->delegate($request, 'notificationRead', 'notificationRead', 'userNotificationRead', $id); }
    public function unifiedNotificationSettings(Request $request) { return $this->denyUnlessAdminOrDeveloper($request, 'notificationSettings'); }

    // 开发者管理（admin 专属）
    public function unifiedDeveloperList(Request $request) { return $this->denyUnlessAdmin($request, 'adminDeveloperList'); }
    public function unifiedDeveloperAdd(Request $request) { return $this->denyUnlessAdmin($request, 'adminDeveloperAdd'); }
    public function unifiedDeveloperUpdate(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperUpdate', $id); }
    public function unifiedDeveloperToggleStatus(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperToggleStatus', $id); }
    public function unifiedDeveloperStats(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperStats', $id); }
    public function unifiedDeveloperAdjust(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperAdjust', $id); }
    public function unifiedDeveloperAssignDevices(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminAssignDevices', $id); }
    public function unifiedDeveloperLogs(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperLogs', $id); }
    public function unifiedDeveloperCleanup(Request $request, $id) { return $this->denyUnlessAdmin($request, 'adminDeveloperCleanup', $id); }
    public function unifiedAllDeveloperLogs(Request $request) { return $this->denyUnlessAdmin($request, 'adminAllDeveloperLogs'); }

    // 系统配置
    public function unifiedOptionList(Request $request) { return $this->denyUnlessAdmin($request, 'adminOptionList'); }
    public function unifiedOptionUpdate(Request $request) { return $this->denyUnlessAdmin($request, 'adminOptionUpdate'); }

    // 用户密码
    public function unifiedResetPassword(Request $request) { return $this->userResetPassword($request); }
}
