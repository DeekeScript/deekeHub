<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Device extends Model
{
    use SoftDeletes;

    const STATUS_PENDING = 0;
    const STATUS_OFFLINE = 1;
    const STATUS_ONLINE = 2;
    const STATUS_BUSY = 3;

    protected $fillable = [
        'developer_id', 'user_id', 'android_id', 'name', 'remark',
        'model', 'brand', 'android_version', 'status',
        'card_key',
        'livekit_room_name', 'livekit_participant_sid',
        'view_quality', 'last_seen_at', 'expired_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'device_tag');
    }

    public function isExpired(): bool
    {
        return $this->expired_at && $this->expired_at->isPast();
    }

    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expired_at')->orWhere('expired_at', '>', now());
        });
    }

    public function scopeExpired($query)
    {
        return $query->whereNotNull('expired_at')->where('expired_at', '<=', now());
    }
}
