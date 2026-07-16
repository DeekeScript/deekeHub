<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeviceOrder extends Model
{
    protected $fillable = [
        'order_no', 'order_type', 'developer_id', 'plan_id', 'device_ids', 'device_count', 'total_price', 'pay_type', 'status', 'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'device_ids' => 'json',
    ];

    const STATUS_UNPAID = 0;
    const STATUS_PAID = 1;
    const STATUS_CANCELLED = 2;

    const ORDER_TYPE_TRIAL = 'trial';
    const ORDER_TYPE_PURCHASE = 'purchase';

    public function developer()
    {
        return $this->belongsTo(Developer::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }
}
