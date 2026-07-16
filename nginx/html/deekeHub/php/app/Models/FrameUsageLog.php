<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FrameUsageLog extends Model
{
    protected $fillable = [
        'developer_id', 'user_id', 'device_id',
        'frames_consumed', 'seconds_watched', 'started_at', 'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
    ];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
