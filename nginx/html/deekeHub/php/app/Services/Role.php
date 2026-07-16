<?php

namespace App\Services;

class Role
{
    // 群控相关的 action 列表
    private const GROUP_CONTROL_ACTIONS = [
        'deviceList', 'deviceAdd', 'deviceUpdate', 'deviceDelete', 'deviceAll',
        'tagList', 'tagAdd', 'tagUpdate', 'tagDelete',
        'taskList', 'taskAdd', 'taskUpdate', 'taskDelete', 'taskDetail', 'taskLogList',
        'getTaskPlatforms', 'getTaskActionTypes', 'getTaskDelayConfig', 'updateTaskDelayConfig',
        'executeTask', 'retryFailedTask', 'revokeTask', 'checkDeviceOnline',
    ];

    // 语音服务相关的 action 列表
    private const VOICE_SERVICE_ACTIONS = [
        'index', 'store', 'show', 'update', 'destroy', 'testAudio',
        'records', 'devices', 'deviceDetail', 'updateQuota', 'quotaLogs',
        'agentList', 'agentUpdateQuota', 'agentQuotaLogs', 'agentQuotaInfo', 'agentAllocateQuota',
        'settings', 'saveSettings',
    ];

    public const ACTIONS = [
        //公共的，都需要
        ['controller' => 'ApiController', 'action' => 'editPassword', 'roles' => [0, 1, 2]],
        ['controller' => 'ApiController', 'action' => 'logList', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'downloadLog', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'removeLog', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'apkList', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'addApk', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'apkUpload', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'getCosSign', 'roles' => [0, 1]], // 管理员和代理商都可以使用

        //独自的
        ['controller' => 'ApiController', 'action' => 'currentUser', 'roles' => [0, 1, 2]],
        ['controller' => 'ApiController', 'action' => 'userList', 'roles' => [0, 1]],

        ['controller' => 'ApiController', 'action' => 'statistic', 'roles' => [0, 1, 2]],
        ['controller' => 'ApiController', 'action' => 'updateUser', 'roles' => [0, 1]], // 仅代理商可以修改卡密
        ['controller' => 'ApiController', 'action' => 'addUser', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'increaseActiveCount', 'roles' => [1]], // 仅代理商
        ['controller' => 'ApiController', 'action' => 'removeUser', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'exportUser', 'roles' => [0, 1]],

        ['controller' => 'ApiController', 'action' => 'agentList', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'updateAgent', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'addAgent', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'removeAgent', 'roles' => [0]],

        ['controller' => 'ApiController', 'action' => 'getAppSetting', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'appSettingUpdate', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'appSettingDelete', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'getGlobalSetting', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'updateGlobalSetting', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'getDownloadPageConfig', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'updateDownloadPageConfig', 'roles' => [0]],
        ['controller' => 'ApiController', 'action' => 'getKouziSetting', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'updateKouziSetting', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'generateComments', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'saveCommentBatch', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'getCommentBatch', 'roles' => [0, 1]],

        // 群控功能 - 设备管理（代理商可操作，管理员只能查看）
        ['controller' => 'ApiController', 'action' => 'deviceList', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'deviceAdd', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'deviceUpdate', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'deviceDelete', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'deviceAll', 'roles' => [1]],
        
        // 群控功能 - 标签管理（代理商可操作，管理员只能查看）
        ['controller' => 'ApiController', 'action' => 'tagList', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'tagAdd', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'tagUpdate', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'tagDelete', 'roles' => [1]],
        
        // 群控功能 - 任务管理（代理商可操作，管理员只能查看）
        ['controller' => 'ApiController', 'action' => 'taskList', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'taskAdd', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'taskUpdate', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'taskDelete', 'roles' => [1]],
        ['controller' => 'ApiController', 'action' => 'taskDetail', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'taskLogList', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'getTaskPlatforms', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'getTaskActionTypes', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'getTaskDelayConfig', 'roles' => [0, 1]], // 每个代理商都有任务延时配置
        ['controller' => 'ApiController', 'action' => 'updateTaskDelayConfig', 'roles' => [0, 1]],
        ['controller' => 'ApiController', 'action' => 'executeTask', 'roles' => [1]], // 仅代理商可以执行任务
        ['controller' => 'ApiController', 'action' => 'retryFailedTask', 'roles' => [1]], // 仅代理商可重试失败设备
        ['controller' => 'ApiController', 'action' => 'revokeTask', 'roles' => [1]], // 仅代理商可以撤回任务
        ['controller' => 'ApiController', 'action' => 'checkDeviceOnline', 'roles' => [1]], // 仅代理商可以检查设备在线状态

        // DeekeScript 管理（仅管理员；受 config deekescript.admin_enabled 控制）
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptUserList', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptUserAdd', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptUserUpdate', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptUserRemove', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptAuthLogList', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptOrderList', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptPackageList', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptPackageAdd', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptPackageUpdate', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptPackageRemove', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptPackLogList', 'roles' => [0]],
        ['controller' => 'DeekescriptAdminController', 'action' => 'deekescriptEmailCodeList', 'roles' => [0]],

        // 语音服务（管理员和代理商均可访问）
        ['controller' => 'VoiceProfileController', 'action' => 'index', 'roles' => [0, 1]],
        ['controller' => 'VoiceProfileController', 'action' => 'store', 'roles' => [0]],
        ['controller' => 'VoiceProfileController', 'action' => 'show', 'roles' => [0, 1]],
        ['controller' => 'VoiceProfileController', 'action' => 'update', 'roles' => [0]],
        ['controller' => 'VoiceProfileController', 'action' => 'destroy', 'roles' => [0]],
        ['controller' => 'VoiceProfileController', 'action' => 'testAudio', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'records', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'devices', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'deviceDetail', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'updateQuota', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'quotaLogs', 'roles' => [0, 1]],
        ['controller' => 'VoiceServiceController', 'action' => 'agentList', 'roles' => [0]],
        ['controller' => 'VoiceServiceController', 'action' => 'agentUpdateQuota', 'roles' => [0]],
        ['controller' => 'VoiceServiceController', 'action' => 'agentQuotaLogs', 'roles' => [0]],
        ['controller' => 'VoiceServiceController', 'action' => 'settings', 'roles' => [0]],
        ['controller' => 'VoiceServiceController', 'action' => 'saveSettings', 'roles' => [0]],
        ['controller' => 'VoiceServiceController', 'action' => 'agentQuotaInfo', 'roles' => [1]],
        ['controller' => 'VoiceServiceController', 'action' => 'agentAllocateQuota', 'roles' => [1]],
    ];

    /**
     * 检查群控功能是否启用
     */
    private function isGroupControlEnabled(): bool
    {
        return (bool) config('features.group_control_enabled', false);
    }

    /**
     * 检查是否为群控相关的 action
     */
    private function isGroupControlAction(string $action): bool
    {
        return in_array($action, self::GROUP_CONTROL_ACTIONS);
    }

    /**
     * 检查语音服务功能是否启用
     */
    private function isVoiceServiceEnabled(): bool
    {
        return (bool) config('features.voice_service_enabled', false);
    }

    /**
     * 检查是否为语音服务相关的 action
     */
    private function isVoiceServiceAction(string $action): bool
    {
        return in_array($action, self::VOICE_SERVICE_ACTIONS);
    }

    public function getAccess(int $roleType = 0, int $userId = 0)
    {
        $actions = [];
        $groupControlEnabled = $this->isGroupControlEnabled();
        $voiceServiceEnabled = $this->isVoiceServiceEnabled();

        foreach (self::ACTIONS as $v) {
            if ($this->isGroupControlAction($v['action']) && !$groupControlEnabled) {
                continue;
            }
            if ($this->isVoiceServiceAction($v['action']) && !$voiceServiceEnabled) {
                continue;
            }
            if ($v['controller'] === 'DeekescriptAdminController' && !config('deekescript.admin_enabled', false)) {
                continue;
            }

            if (in_array($roleType, $v['roles'])) {
                $actions[] = $v['controller'] . '_' . $v['action'];
            }
        }
        return $actions;
    }

    public function isAccess(int $roleType = 0, string $controller, string $action)
    {
        if ($this->isGroupControlAction($action) && !$this->isGroupControlEnabled()) {
            return false;
        }
        if ($this->isVoiceServiceAction($action) && !$this->isVoiceServiceEnabled()) {
            return false;
        }

        foreach (self::ACTIONS as $v) {
            if ($v['controller'] === 'DeekescriptAdminController' && !config('deekescript.admin_enabled', false)) {
                continue;
            }
            if (in_array($roleType, $v['roles'])) {
                if ($v['controller'] . ':' . $v['action'] === $controller . ':' . $action) {
                    return true;
                }
            }
        }
        return false;
    }
}

