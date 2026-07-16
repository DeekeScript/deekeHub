<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskScript extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'task_id', 'script_id', 'workflow_id', 'url',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
