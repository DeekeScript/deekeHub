<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\AlipayController;
use App\Http\Controllers\DeviceAuthController;

/*
|--------------------------------------------------------------------------
| API Routes — Android 自动化设备管理平台
|--------------------------------------------------------------------------
*/

// 公开接口（无需认证）
Route::post('/device/activate', [ApiController::class, 'deviceActivate']);
Route::post('/login', [ApiController::class, 'login'])->middleware(['throttle:login', 'login.log']);
Route::post('/admin/login', [ApiController::class, 'login'])->middleware(['throttle:login', 'login.log']);
Route::post('/logout', [ApiController::class, 'outLogin']);
Route::post('/outLogin', [ApiController::class, 'outLogin']);
Route::get('/config', [ApiController::class, 'config']);
Route::get('/verify', [ApiController::class, 'captcha']);
Route::post('/sms/send-code', [ApiController::class, 'sendSmsCode']);
Route::post('/developer/register', [ApiController::class, 'developerRegister']);

// ==================== 设备端接口（DkeController 风格鉴权） ====================
Route::post('/dke/login', [DeviceAuthController::class, 'login']);
Route::post('/dke/bind', [DeviceAuthController::class, 'bind'])->middleware('throttle:dke-bind');
Route::post('/dke/checkBind', [DeviceAuthController::class, 'checkBind']);
Route::post('/dke/heartbeat', [DeviceAuthController::class, 'heartbeat']);
Route::post('/dke/uploadLog', [DeviceAuthController::class, 'uploadLog']);
Route::post('/dke/livekitJoin', [DeviceAuthController::class, 'livekitJoin']);
Route::post('/dke/livekit-token', [DeviceAuthController::class, 'livekitToken']);

// ==================== 支付宝接口（公开） ====================
Route::post('/alipay/createDeviceOrder', [AlipayController::class, 'createDeviceOrder']);
Route::post('/alipay/createFrameOrder', [AlipayController::class, 'createFrameOrder']);
Route::post('/alipay/createScanOrder', [AlipayController::class, 'createScanOrder']);
Route::post('/alipay/payOrder', [AlipayController::class, 'payOrder']);
Route::post('/alipay/createOrder', [AlipayController::class, 'createOrder']); // 兼容旧版
Route::get('/alipay/return', [AlipayController::class, 'returnUrl']);
Route::any('/alipay/notify', [AlipayController::class, 'notify']);
Route::post('/alipay/getToken', [AlipayController::class, 'getToken']);
Route::get('/alipay/getToken', [AlipayController::class, 'getToken']); // 兼容GET

// 需要认证的接口
Route::middleware(['request.params', 'auth'])->group(function () {
    Route::get('/currentUser', [ApiController::class, 'currentUser']);
    Route::post('/editPassword', [ApiController::class, 'editPassword']);

    // ==================== 超管接口 ====================
    Route::prefix('admin')->group(function () {
        Route::get('/dashboard', [ApiController::class, 'adminDashboard']);
        Route::get('/developers', [ApiController::class, 'adminDeveloperList']);
        Route::post('/developers', [ApiController::class, 'adminDeveloperAdd']);
        Route::put('/developers/{id}', [ApiController::class, 'adminDeveloperUpdate']);
        Route::put('/developers/{id}/toggle-status', [ApiController::class, 'adminDeveloperToggleStatus']);
        Route::get('/developers/{id}/stats', [ApiController::class, 'adminDeveloperStats']);
        Route::put('/developers/{id}/adjust', [ApiController::class, 'adminDeveloperAdjust']);
        Route::post('/developers/{id}/assign-devices', [ApiController::class, 'adminAssignDevices']);
        Route::get('/developers/{id}/logs', [ApiController::class, 'adminDeveloperLogs']);
        Route::post('/developers/{id}/cleanup', [ApiController::class, 'adminDeveloperCleanup']);
        Route::get('/developer-logs', [ApiController::class, 'adminAllDeveloperLogs']);
        Route::get('/devices', [ApiController::class, 'adminDeviceList']);
        Route::post('/devices/status', [ApiController::class, 'adminDeviceStatus']);
        Route::put('/devices/{id}', [ApiController::class, 'adminDeviceUpdate']);
        Route::put('/devices/{id}/unbind', [ApiController::class, 'adminDeviceUnbind']);
        Route::get('/devices/{id}/livekit-token', [ApiController::class, 'adminDeviceLivekitToken']);
        Route::post('/devices/{id}/stream-start', [ApiController::class, 'adminDeviceStreamStart']);
        Route::post('/devices/{id}/stream-stop', [ApiController::class, 'adminDeviceStreamStop']);
        Route::get('/plans', [ApiController::class, 'adminPlanList']);
        Route::post('/plans', [ApiController::class, 'adminPlanAdd']);
        Route::put('/plans/{id}', [ApiController::class, 'adminPlanUpdate']);
        Route::delete('/plans/{id}', [ApiController::class, 'adminPlanDelete']);

        Route::get('/device-orders', [ApiController::class, 'adminDeviceOrderList']);
        Route::get('/frame-orders', [ApiController::class, 'adminFrameOrderList']);

        Route::get('/options', [ApiController::class, 'adminOptionList']);
        Route::put('/options', [ApiController::class, 'adminOptionUpdate']);
    });

    // ==================== 开发者接口 ====================
    Route::prefix('developer')->group(function () {
        Route::get('/dashboard', [ApiController::class, 'developerDashboard']);

        // 用户管理
        Route::get('/users', [ApiController::class, 'developerUserList']);
        Route::post('/users', [ApiController::class, 'developerUserAdd']);
        Route::put('/users/{id}', [ApiController::class, 'developerUserUpdate']);
        Route::put('/users/{id}/toggle-status', [ApiController::class, 'developerUserToggleStatus']);
        Route::put('/users/{id}/frame-balance', [ApiController::class, 'developerUserFrameBalance']);
        Route::put('/users/{id}/assign-devices', [ApiController::class, 'developerUserAssignDevices']);

        // 脚本管理
        Route::get('/scripts', [ApiController::class, 'scriptList']);
        Route::post('/scripts', [ApiController::class, 'scriptAdd']);
        Route::get('/scripts/{id}', [ApiController::class, 'scriptDetail']);
        Route::put('/scripts/{id}', [ApiController::class, 'scriptUpdate']);
        Route::delete('/scripts/{id}', [ApiController::class, 'scriptDelete']);

        // 工作流
        Route::get('/workflows', [ApiController::class, 'workflowList']);
        Route::post('/workflows', [ApiController::class, 'workflowAdd']);
        Route::put('/workflows/{id}', [ApiController::class, 'workflowUpdate']);
        Route::delete('/workflows/{id}', [ApiController::class, 'workflowDelete']);

        // 设备管理
        Route::get('/devices', [ApiController::class, 'deviceList']);
        Route::post('/devices', [ApiController::class, 'deviceAdd']);
        Route::post('/devices/status', [ApiController::class, 'deviceStatus']);
        Route::put('/devices/batch-quality', [ApiController::class, 'deviceBatchQuality']);
        Route::put('/devices/{id}', [ApiController::class, 'deviceUpdate']);
        Route::delete('/devices/{id}', [ApiController::class, 'deviceDelete']);
        Route::put('/devices/{id}/unbind', [ApiController::class, 'deviceUnbind']);
        Route::get('/devices/{id}/livekit-token', [ApiController::class, 'deviceLivekitToken']);
        Route::get('/devices/{id}/livekit-viewer-token', [ApiController::class, 'deviceLivekitViewerToken']);
        Route::put('/devices/{id}/quality', [ApiController::class, 'deviceSetQuality']);
        Route::put('/devices/{id}/tags', [ApiController::class, 'deviceUpdateTags']);
        Route::post('/devices/{id}/stream-start', [ApiController::class, 'deviceStreamStart']);
        Route::post('/devices/{id}/stream-stop', [ApiController::class, 'deviceStreamStop']);

        // 标签管理
        Route::get('/tags', [ApiController::class, 'tagList']);
        Route::post('/tags', [ApiController::class, 'tagAdd']);
        Route::put('/tags/{id}', [ApiController::class, 'tagUpdate']);
        Route::delete('/tags/{id}', [ApiController::class, 'tagDelete']);

        // 任务管理
        Route::get('/tasks', [ApiController::class, 'taskList']);
        Route::post('/tasks', [ApiController::class, 'taskAdd']);
        Route::get('/tasks/{id}', [ApiController::class, 'taskDetail']);
        Route::post('/tasks/{id}/execute', [ApiController::class, 'taskExecute']);
        Route::post('/tasks/{id}/cancel', [ApiController::class, 'taskCancel']);
        Route::get('/tasks/{id}/logs', [ApiController::class, 'taskLogs']);
        Route::post('/tasks/{id}/log-export', [ApiController::class, 'taskLogExport']);

        // 订单与卡密
        Route::get('/plans', [ApiController::class, 'developerPlanList']);
        Route::post('/device-orders', [ApiController::class, 'deviceOrderCreate']);
        Route::get('/device-orders/status', [ApiController::class, 'checkDeviceOrderStatus']);
        Route::post('/frame-orders', [ApiController::class, 'frameOrderCreate']);
        Route::get('/device-orders', [ApiController::class, 'developerDeviceOrderList']);
        Route::get('/frame-orders', [ApiController::class, 'developerFrameOrderList']);
        Route::get('/card-keys', [ApiController::class, 'cardKeyList']);
        Route::post('/card-keys/generate', [ApiController::class, 'cardKeyGenerate']);

        // 日志
        Route::get('/logs', [ApiController::class, 'logList']);
        Route::get('/logs/export', [ApiController::class, 'logExport']);

        // 帧数消耗记录
        Route::post('/frame-usage/start', [ApiController::class, 'frameUsageStart']);
        Route::post('/frame-usage/end', [ApiController::class, 'frameUsageEnd']);
        Route::get('/frame-usage', [ApiController::class, 'frameUsageList']);
        Route::get('/frame-usage/stats', [ApiController::class, 'frameUsageStats']);

        // 通知
        Route::get('/notifications', [ApiController::class, 'notificationList']);
        Route::put('/notifications/{id}/read', [ApiController::class, 'notificationRead']);
        Route::put('/notifications/settings', [ApiController::class, 'notificationSettings']);
    });

    // ==================== 统一接口（角色自适应，取代上方分角色路由） ====================

    // 仪表盘
    Route::get('/dashboard', [ApiController::class, 'unifiedDashboard']);

    // 设备管理
    Route::get('/devices', [ApiController::class, 'unifiedDeviceList']);
    Route::post('/devices', [ApiController::class, 'unifiedDeviceAdd']);
    Route::post('/devices/status', [ApiController::class, 'unifiedDeviceStatus']);
    Route::put('/devices/batch-quality', [ApiController::class, 'unifiedDeviceBatchQuality']);
    Route::put('/devices/{id}', [ApiController::class, 'unifiedDeviceUpdate']);
    Route::delete('/devices/{id}', [ApiController::class, 'unifiedDeviceDelete']);
    Route::put('/devices/{id}/unbind', [ApiController::class, 'unifiedDeviceUnbind']);
    Route::get('/devices/{id}/livekit-token', [ApiController::class, 'unifiedDeviceLivekitToken']);
    Route::get('/devices/{id}/livekit-viewer-token', [ApiController::class, 'unifiedDeviceLivekitViewerToken']);
    Route::put('/devices/{id}/quality', [ApiController::class, 'unifiedDeviceSetQuality']);
    Route::put('/devices/{id}/tags', [ApiController::class, 'unifiedDeviceUpdateTags']);
    Route::post('/devices/{id}/stream-start', [ApiController::class, 'unifiedDeviceStreamStart']);
    Route::post('/devices/{id}/stream-stop', [ApiController::class, 'unifiedDeviceStreamStop']);

    // 标签管理
    Route::get('/tags', [ApiController::class, 'unifiedTagList']);
    Route::post('/tags', [ApiController::class, 'unifiedTagAdd']);
    Route::put('/tags/{id}', [ApiController::class, 'unifiedTagUpdate']);
    Route::delete('/tags/{id}', [ApiController::class, 'unifiedTagDelete']);

    // 脚本管理（admin + developer）
    Route::get('/scripts', [ApiController::class, 'unifiedScriptList']);
    Route::post('/scripts', [ApiController::class, 'unifiedScriptAdd']);
    Route::get('/scripts/{id}', [ApiController::class, 'unifiedScriptDetail']);
    Route::put('/scripts/{id}', [ApiController::class, 'unifiedScriptUpdate']);
    Route::delete('/scripts/{id}', [ApiController::class, 'unifiedScriptDelete']);

    // 工作流
    Route::get('/workflows', [ApiController::class, 'unifiedWorkflowList']);
    Route::post('/workflows', [ApiController::class, 'unifiedWorkflowAdd']);
    Route::put('/workflows/{id}', [ApiController::class, 'unifiedWorkflowUpdate']);
    Route::delete('/workflows/{id}', [ApiController::class, 'unifiedWorkflowDelete']);

    // 任务管理
    Route::get('/tasks', [ApiController::class, 'unifiedTaskList']);
    Route::post('/tasks', [ApiController::class, 'unifiedTaskAdd']);
    Route::get('/tasks/{id}', [ApiController::class, 'unifiedTaskDetail']);
    Route::post('/tasks/{id}/execute', [ApiController::class, 'unifiedTaskExecute']);
    Route::post('/tasks/{id}/cancel', [ApiController::class, 'unifiedTaskCancel']);
    Route::get('/tasks/{id}/logs', [ApiController::class, 'unifiedTaskLogs']);
    Route::post('/tasks/{id}/log-export', [ApiController::class, 'unifiedTaskLogExport']);

    // 日志
    Route::get('/logs', [ApiController::class, 'unifiedLogList']);
    Route::get('/logs/export', [ApiController::class, 'unifiedLogExport']);

    // 运营管理（admin + developer）
    Route::get('/users', [ApiController::class, 'unifiedUserList']);
    Route::post('/users', [ApiController::class, 'unifiedUserAdd']);
    Route::put('/users/{id}', [ApiController::class, 'unifiedUserUpdate']);
    Route::put('/users/{id}/toggle-status', [ApiController::class, 'unifiedUserToggleStatus']);
    Route::put('/users/{id}/frame-balance', [ApiController::class, 'unifiedUserFrameBalance']);
    Route::put('/users/{id}/assign-devices', [ApiController::class, 'unifiedUserAssignDevices']);

    // 帧数消耗
    Route::post('/frame-usage/start', [ApiController::class, 'unifiedFrameUsageStart']);
    Route::post('/frame-usage/end', [ApiController::class, 'unifiedFrameUsageEnd']);
    Route::get('/frame-usage', [ApiController::class, 'unifiedFrameUsageList']);
    Route::get('/frame-usage/stats', [ApiController::class, 'unifiedFrameUsageStats']);

    // 套餐（admin CRUD，dev/user 只读）
    Route::get('/plans', [ApiController::class, 'unifiedPlanList']);
    Route::post('/plans', [ApiController::class, 'unifiedPlanAdd']);
    Route::put('/plans/{id}', [ApiController::class, 'unifiedPlanUpdate']);
    Route::delete('/plans/{id}', [ApiController::class, 'unifiedPlanDelete']);

    // 订单
    Route::get('/orders', [ApiController::class, 'unifiedOrderList']);
    Route::post('/orders', [ApiController::class, 'unifiedOrderCreate']);
    Route::get('/orders/status', [ApiController::class, 'unifiedOrderStatus']);
    Route::get('/device-orders', [ApiController::class, 'unifiedDeviceOrderList']);
    Route::post('/device-orders', [ApiController::class, 'unifiedDeviceOrderCreate']);
    Route::get('/device-orders/status', [ApiController::class, 'unifiedOrderStatus']);
    Route::get('/frame-orders', [ApiController::class, 'unifiedFrameOrderList']);
    Route::post('/frame-orders', [ApiController::class, 'unifiedFrameOrderCreate']);

    // 卡密
    Route::get('/card-keys', [ApiController::class, 'unifiedCardKeyList']);
    Route::post('/card-keys/generate', [ApiController::class, 'unifiedCardKeyGenerate']);

    // 通知
    Route::get('/notifications', [ApiController::class, 'unifiedNotificationList']);
    Route::put('/notifications/{id}/read', [ApiController::class, 'unifiedNotificationRead']);
    Route::put('/notifications/settings', [ApiController::class, 'unifiedNotificationSettings']);

    // 开发者管理（admin 专属）
    Route::get('/developers', [ApiController::class, 'unifiedDeveloperList']);
    Route::post('/developers', [ApiController::class, 'unifiedDeveloperAdd']);
    Route::put('/developers/{id}', [ApiController::class, 'unifiedDeveloperUpdate']);
    Route::put('/developers/{id}/toggle-status', [ApiController::class, 'unifiedDeveloperToggleStatus']);
    Route::get('/developers/{id}/stats', [ApiController::class, 'unifiedDeveloperStats']);
    Route::put('/developers/{id}/adjust', [ApiController::class, 'unifiedDeveloperAdjust']);
    Route::post('/developers/{id}/assign-devices', [ApiController::class, 'unifiedDeveloperAssignDevices']);
    Route::get('/developers/{id}/logs', [ApiController::class, 'unifiedDeveloperLogs']);
    Route::post('/developers/{id}/cleanup', [ApiController::class, 'unifiedDeveloperCleanup']);
    Route::get('/developer-logs', [ApiController::class, 'unifiedAllDeveloperLogs']);

    // 系统配置
    Route::get('/options', [ApiController::class, 'unifiedOptionList']);
    Route::put('/options', [ApiController::class, 'unifiedOptionUpdate']);

    // 用户密码
    Route::put('/password', [ApiController::class, 'unifiedResetPassword']);

    // ==================== 用户接口 ====================
    Route::prefix('user')->group(function () {
        Route::put('/password', [ApiController::class, 'userResetPassword']);
        Route::get('/dashboard', [ApiController::class, 'userDashboard']);

        // 设备管理
        Route::get('/devices', [ApiController::class, 'userDeviceList']);
        Route::post('/devices/status', [ApiController::class, 'userDeviceStatus']);
        Route::put('/devices/{id}', [ApiController::class, 'userDeviceUpdate']);
        Route::get('/devices/{id}/livekit-token', [ApiController::class, 'userDeviceLivekitToken']);
        Route::put('/devices/{id}/quality', [ApiController::class, 'userDeviceSetQuality']);
        Route::put('/devices/{id}/tags', [ApiController::class, 'userDeviceUpdateTags']);
        Route::get('/devices/{id}/livekit-viewer-token', [ApiController::class, 'userDeviceLivekitViewerToken']);
        Route::post('/devices/{id}/stream-start', [ApiController::class, 'userDeviceStreamStart']);
        Route::post('/devices/{id}/stream-stop', [ApiController::class, 'userDeviceStreamStop']);

        // 标签管理
        Route::get('/tags', [ApiController::class, 'userTagList']);
        Route::post('/tags', [ApiController::class, 'userTagAdd']);
        Route::put('/tags/{id}', [ApiController::class, 'userTagUpdate']);
        Route::delete('/tags/{id}', [ApiController::class, 'userTagDelete']);

        // 工作流（查看开发者分配的）
        Route::get('/workflows', [ApiController::class, 'userWorkflowList']);

        // 任务管理
        Route::get('/tasks', [ApiController::class, 'userTaskList']);
        Route::get('/tasks/{id}', [ApiController::class, 'userTaskDetail']);
        Route::post('/tasks/{id}/execute', [ApiController::class, 'userTaskExecute']);
        Route::get('/tasks/{id}/logs', [ApiController::class, 'userTaskLogs']);
        Route::post('/tasks/{id}/log-export', [ApiController::class, 'userTaskLogExport']);

        // 日志管理
        Route::get('/logs', [ApiController::class, 'userLogList']);
        Route::get('/logs/export', [ApiController::class, 'userLogExport']);

        // 通知
        Route::get('/notifications', [ApiController::class, 'userNotificationList']);
        Route::put('/notifications/{id}/read', [ApiController::class, 'userNotificationRead']);

        // 帧数消耗记录
        Route::post('/frame-usage/start', [ApiController::class, 'userFrameUsageStart']);
        Route::post('/frame-usage/end', [ApiController::class, 'userFrameUsageEnd']);
        Route::get('/frame-usage/stats', [ApiController::class, 'userFrameUsageStats']);
    });
});
