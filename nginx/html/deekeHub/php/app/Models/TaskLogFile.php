<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskLogFile extends Model
{
    public $timestamps = false;

    protected $fillable = ['task_id', 'task_device_id', 'url', 'size', 'raw_chars', 'created_at'];

    public function taskDevice()
    {
        return $this->belongsTo(TaskDevice::class);
    }
}
