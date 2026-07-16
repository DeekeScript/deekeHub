<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScriptVersion extends Model
{
    protected $fillable = [
        'script_id', 'version_number', 'version_name', 'remark', 'content',
    ];

    public function script()
    {
        return $this->belongsTo(Script::class);
    }
}
