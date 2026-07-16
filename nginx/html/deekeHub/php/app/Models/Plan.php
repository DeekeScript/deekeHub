<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'type', 'name', 'billing_cycle', 'unit_count', 'quota', 'price', 'slogan', 'bonus_days', 'status',
    ];

    const TYPE_DEVICE = 'device';
    const TYPE_FRAME = 'frame';

    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    public function scopeDevicePlans($query)
    {
        return $query->where('type', self::TYPE_DEVICE);
    }

    public function scopeFramePlans($query)
    {
        return $query->where('type', self::TYPE_FRAME);
    }
}
