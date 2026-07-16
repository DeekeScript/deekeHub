<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tag extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'owner_id', 'owner_type', 'name', 'color',
    ];

    public function devices()
    {
        return $this->belongsToMany(Device::class, 'device_tag');
    }

    public function scopeForOwner($query, $ownerId, $ownerType)
    {
        return $query->where('owner_id', $ownerId)->where('owner_type', $ownerType);
    }
}
