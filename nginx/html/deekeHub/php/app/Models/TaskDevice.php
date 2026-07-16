<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskDevice extends Model
{
    protected $fillable = [
        'task_id', 'device_id', 'status', 'error_reason',
        'started_at', 'finished_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    const STATUS_PENDING = 0;   // 等待中
    const STATUS_RUNNING = 1;   // 运行中
    const STATUS_COMPLETED = 2; // 已完成
    const STATUS_FAILED = 3;    // 失败

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }

    public function logFiles()
    {
        return $this->hasMany(TaskLogFile::class);
    }
}
