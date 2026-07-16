<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeveloperLog extends Model
{
    protected $fillable = [
        'developer_id', 'action', 'before_value', 'after_value', 'change_amount', 'reason', 'operator',
    ];

    const ACTION_ADJUST_DEVICES = 'adjust_devices';
    const ACTION_ADJUST_USERS   = 'adjust_users';
    const ACTION_ADJUST_POINTS  = 'adjust_points';
    const ACTION_TOGGLE_STATUS  = 'toggle_status';

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }
}
