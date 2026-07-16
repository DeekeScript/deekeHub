<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    protected $fillable = [
        'role_type', 'user_id', 'phone', 'ip', 'user_agent', 'status',
    ];
}
