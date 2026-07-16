<?php

namespace App\Console\Commands;

use App\Models\DeviceOrder;
use App\Models\FrameOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CancelStaleOrders extends Command
{
    protected $signature = 'orders:cancel-stale {--hours=24 : 超过多少小时未支付则取消}';
    protected $description = 'Cancel unpaid orders that have exceeded the timeout threshold';

    public function handle(): void
    {
        $hours = (int) $this->option('hours');
        $deadline = now()->subHours($hours);

        // 1. 设备订单
        $staleDeviceOrders = DeviceOrder::where('status', DeviceOrder::STATUS_UNPAID)
            ->where('created_at', '<', $deadline)
            ->get();

        $deviceCount = 0;
        foreach ($staleDeviceOrders as $order) {
            $order->status = DeviceOrder::STATUS_CANCELLED;
            $order->save();
            $deviceCount++;
            Log::info('定时任务: 超时设备订单已取消', [
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'created_at' => $order->created_at,
            ]);
        }

        if ($deviceCount > 0) {
            $this->info("已取消 {$deviceCount} 笔超时设备订单（超过 {$hours} 小时未支付）");
        }

        // 2. 帧额度订单
        $staleFrameOrders = FrameOrder::where('status', FrameOrder::STATUS_UNPAID)
            ->where('created_at', '<', $deadline)
            ->get();

        $frameCount = 0;
        foreach ($staleFrameOrders as $order) {
            $order->status = FrameOrder::STATUS_CANCELLED;
            $order->save();
            $frameCount++;
            Log::info('定时任务: 超时帧额度订单已取消', [
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'created_at' => $order->created_at,
            ]);
        }

        if ($frameCount > 0) {
            $this->info("已取消 {$frameCount} 笔超时帧额度订单（超过 {$hours} 小时未支付）");
        }

        $total = $deviceCount + $frameCount;
        if ($total === 0) {
            $this->info("没有需要取消的超时订单");
        }
    }
}
