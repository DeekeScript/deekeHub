<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'developer_id', 'phone', 'password', 'name', 'status',
        'device_frame_balance',
    ];
    protected $hidden = ['password'];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }
}
