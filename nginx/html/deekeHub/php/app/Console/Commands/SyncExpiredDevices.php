<?php

namespace App\Console\Commands;

use App\Models\Device;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class SyncExpiredDevices extends Command
{
    protected $signature = 'devices:sync-expired';
    protected $description = 'Clean up stale Redis online keys for expired devices';

    public function handle(): void
    {
        $expiredDevices = Device::whereNotNull('expired_at')
            ->where('expired_at', '<=', now())
            ->whereNotNull('android_id')
            ->get();

        $cleaned = 0;
        foreach ($expiredDevices as $device) {
            if (!empty($device->android_id)) {
                $key = 'ws:device:' . $device->android_id;
                try {
                    $redis = Redis::connection()->client();
                    if ($redis->exists($key)) {
                        $redis->del($key);
                        $cleaned++;
                    }
                } catch (\Exception $e) {
                    Log::warning('定时任务: 清理Redis键失败', ['key' => $key, 'error' => $e->getMessage()]);
                }
            }
        }

        if ($cleaned > 0) {
            $this->info("清理了 {$cleaned} 个过期设备的 Redis 在线键");
        }
    }
}
