<?php

namespace App\Jobs;

use App\Helpers\WebSocketHelper;
use App\Models\Task;
use App\Models\TaskDevice;
use App\Models\TaskScript;
use App\Services\ObjectStorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchTaskToDevices implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        private int $taskId,
    ) {}

    public function handle(): void
    {
        $task = Task::with(['workflow.workflowScripts.script', 'taskDevices'])->find($this->taskId);
        if (!$task) return;

        // 同步脚本到 COS/OSS
        $storage = new ObjectStorageService();
        if ($task->workflow && $task->workflow->workflowScripts->isNotEmpty()) {
            TaskScript::where('task_id', $task->id)->delete();

            foreach ($task->workflow->workflowScripts as $ws) {
                $script = $ws->script;
                if (!$script) continue;

                $url = $storage->uploadScript($script->content ?? '', null);

                TaskScript::create([
                    'task_id'     => $task->id,
                    'script_id'   => $script->id,
                    'workflow_id' => $task->workflow_id,
                    'url'         => $url,
                ]);
            }
        }

        // 通过 WebSocket 下发任务到设备
        $results = WebSocketHelper::sendTaskToDevices($task);

        $allOffline = true;
        $failCount = 0;
        foreach ($task->taskDevices as $taskDevice) {
            $device = $taskDevice->device;
            if (!$device || empty($device->android_id)) {
                $taskDevice->update(['status' => TaskDevice::STATUS_FAILED, 'error_reason' => '设备未激活']);
                $failCount++;
                continue;
            }
            $online = $results[$device->android_id] ?? false;
            if ($online) {
                $allOffline = false;
            } else {
                $taskDevice->update(['status' => TaskDevice::STATUS_FAILED, 'error_reason' => '设备不在线']);
                $failCount++;
            }
        }

        $task->fail_count = $failCount;
        if ($allOffline && $failCount > 0) {
            $task->status = Task::STATUS_COMPLETED;
            $task->finished_at = now();
        }
        $task->save();

        Log::info("任务已下发", ['task_id' => $task->id, 'results' => $results]);
    }
}
