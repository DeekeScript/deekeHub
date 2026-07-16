<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'developer_id', 'user_id', 'workflow_id', 'name', 'status',
        'success_count', 'fail_count', 'finished_at',
    ];

    const STATUS_PENDING = 0;   // 等待中
    const STATUS_RUNNING = 1;   // 运行中
    const STATUS_COMPLETED = 2; // 已完成
    const STATUS_FAILED = 3;    // 失败
    const STATUS_CANCELLED = 4; // 已取消

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function workflow()
    {
        return $this->belongsTo(Workflow::class);
    }

    public function taskDevices()
    {
        return $this->hasMany(TaskDevice::class);
    }

    public function taskLogFiles()
    {
        return $this->hasMany(TaskLogFile::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
