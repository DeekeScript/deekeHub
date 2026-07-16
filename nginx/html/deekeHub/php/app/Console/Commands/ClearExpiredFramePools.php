<?php

namespace App\Console\Commands;

use App\Models\FrameBalancePool;
use App\Models\Developer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ClearExpiredFramePools extends Command
{
    protected $signature = 'frame:clear-expired';
    protected $description = 'Zero out expired frame balance pools';

    public function handle(): void
    {
        $expired = FrameBalancePool::where('remaining', '>', 0)
            ->whereNotNull('expired_at')
            ->where('expired_at', '<=', now())
            ->get();

        $cleared = 0;
        $totalBytes = 0;

        foreach ($expired as $pool) {
            $totalBytes += $pool->remaining;
            $pool->remaining = 0;
            $pool->save();
            FrameBalancePool::syncDeveloperBalance($pool->developer_id);
            $cleared++;
        }

        if ($cleared > 0) {
            $gb = round($totalBytes / 1073741824, 2);
            Log::info("过期额度已清零", ['pools' => $cleared, 'bytes' => $totalBytes, 'gb' => $gb]);
            $this->info("已清零 {$cleared} 个过期额度池，共 {$gb} GB");
        }
    }
}
