<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardKey extends Model
{
    protected $fillable = [
        'developer_id', 'order_id', 'key_code', 'status', 'used_device_id', 'used_at',
    ];

    protected $casts = ['used_at' => 'datetime'];

    const STATUS_UNUSED = 0;
    const STATUS_USED = 1;
    const STATUS_REVOKED = 2;

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }
}
