<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Script extends Model
{
    use SoftDeletes;

    protected $fillable = ['developer_id', 'name', 'remark', 'content'];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function workflowScripts()
    {
        return $this->hasMany(WorkflowScript::class);
    }
}
