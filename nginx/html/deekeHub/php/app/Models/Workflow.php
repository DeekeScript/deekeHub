<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workflow extends Model
{
    use SoftDeletes;

    protected $fillable = ['developer_id', 'name', 'description', 'fail_strategy'];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function workflowScripts()
    {
        return $this->hasMany(WorkflowScript::class)->orderBy('sort_order');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}
