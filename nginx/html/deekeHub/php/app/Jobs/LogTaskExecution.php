<?php

namespace App\Jobs;

use App\Models\TaskDevice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class LogTaskExecution implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $taskId,
        private int $deviceId,
        private int $status,
    ) {}

    public function handle(): void
    {
        $taskDevice = TaskDevice::where('task_id', $this->taskId)
            ->where('device_id', $this->deviceId)
            ->first();

        if (!$taskDevice) {
            $taskDevice = TaskDevice::create([
                'task_id'  => $this->taskId,
                'device_id'=> $this->deviceId,
                'status'   => $this->status,
                'started_at' => $this->status === TaskDevice::STATUS_RUNNING ? now() : null,
                'finished_at'=> in_array($this->status, [TaskDevice::STATUS_COMPLETED, TaskDevice::STATUS_FAILED]) ? now() : null,
            ]);
            return;
        }

        $updates = ['status' => $this->status];
        if ($this->status === TaskDevice::STATUS_RUNNING && !$taskDevice->started_at) {
            $updates['started_at'] = now();
        }
        if (in_array($this->status, [TaskDevice::STATUS_COMPLETED, TaskDevice::STATUS_FAILED])) {
            $updates['finished_at'] = now();
        }
        $taskDevice->update($updates);
    }
}
