<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Developer extends Model
{
    use SoftDeletes;

    protected $table = 'developers';
    protected $fillable = [
        'name', 'phone', 'password', 'status', 'email',
        'dingtalk_webhook', 'wecom_webhook', 'notify_events',
        'device_frame_balance', 'total_points', 'trial_granted',
    ];
    protected $hidden = ['password'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function scripts()
    {
        return $this->hasMany(Script::class);
    }

    public function workflows()
    {
        return $this->hasMany(Workflow::class);
    }
}
