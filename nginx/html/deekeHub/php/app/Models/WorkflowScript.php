<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowScript extends Model
{
    protected $fillable = ['workflow_id', 'script_id', 'sort_order'];

    public function workflow()
    {
        return $this->belongsTo(Workflow::class);
    }

    public function script()
    {
        return $this->belongsTo(Script::class);
    }
}
