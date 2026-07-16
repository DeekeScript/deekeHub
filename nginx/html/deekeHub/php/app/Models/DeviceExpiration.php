<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeviceExpiration extends Model
{
    protected $fillable = [
        'developer_id', 'total_count', 'used_count', 'expire_days', 'source', 'order_id',
    ];

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function remaining(): int
    {
        return max(0, $this->total_count - $this->used_count);
    }

    public function scopeAvailable($query, $developerId)
    {
        return $query->where('developer_id', $developerId)
            ->whereRaw('used_count < total_count')
            ->orderBy('expire_days', 'asc');
    }
}
