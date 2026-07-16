<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        Commands\WebSocketServerCommand::class,
        Commands\SyncExpiredDevices::class,
        Commands\CancelStaleOrders::class,
        Commands\ClearExpiredFramePools::class,
    ];

    protected function schedule(Schedule $schedule)
    {
        // 每分钟同步过期设备状态
        $schedule->command('devices:sync-expired')->everyMinute()->withoutOverlapping(5);

        // 每5分钟取消超过24小时未支付的订单
        $schedule->command('orders:cancel-stale', ['--hours=24'])->everyFiveMinutes()->withoutOverlapping(5);

        // 每分钟清理过期的实时画面额度池
        $schedule->command('frame:clear-expired')->everyMinute()->withoutOverlapping(5);
    }

    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

