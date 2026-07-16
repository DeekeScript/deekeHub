<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FrameBalancePool extends Model
{
    public $timestamps = false;

    protected $fillable = ['developer_id', 'amount', 'remaining', 'expired_at', 'created_at'];

    protected $casts = [
        'expired_at' => 'datetime',
    ];

    /**
     * 从池子中消费指定额度，按过期时间 FIFO 扣除
     * @return int 实际扣除的额度
     */
    public static function consume(int $developerId, int $bytes): int
    {
        if ($bytes <= 0) return 0;

        $pools = self::where('developer_id', $developerId)
            ->where('remaining', '>', 0)
            ->where(function ($q) {
                $q->whereNull('expired_at')->orWhere('expired_at', '>', now());
            })
            ->orderByRaw('expired_at IS NULL, expired_at ASC')
            ->get();

        $remaining = $bytes;
        foreach ($pools as $pool) {
            if ($remaining <= 0) break;
            $deduct = min($pool->remaining, $remaining);
            $pool->remaining -= $deduct;
            $pool->save();
            $remaining -= $deduct;
        }

        return $bytes - $remaining;
    }

    /**
     * 同步 developer.device_frame_balance = 所有活跃池子 remaining 之和
     */
    public static function syncDeveloperBalance(int $developerId): void
    {
        $sum = self::where('developer_id', $developerId)
            ->where('remaining', '>', 0)
            ->where(function ($q) {
                $q->whereNull('expired_at')->orWhere('expired_at', '>', now());
            })
            ->sum('remaining');

        Developer::where('id', $developerId)->update(['device_frame_balance' => $sum]);
    }
}
