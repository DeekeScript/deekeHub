<?php

namespace App\Console\Commands;

use App\Services\WebSocketService;
use Illuminate\Console\Command;

class WebSocketServerCommand extends Command
{
    /**
     * 命令名称和签名
     *
     * @var string
     */
    protected $signature = 'websocket:start 
                            {--host= : WebSocket 服务器地址}
                            {--port= : WebSocket 服务器端口}
                            {--daemon : 以守护进程方式运行}';

    /**
     * 命令描述
     *
     * @var string
     */
    protected $description = '启动 WebSocket 服务器';

    /**
     * 执行命令
     */
    public function handle(): int
    {
        if (!extension_loaded('swoole')) {
            $this->error('错误: Swoole 扩展未安装');
            $this->info('请安装 Swoole 扩展: pecl install swoole');
            return 1;
        }

        // 如果指定了命令行参数，更新环境变量
        if ($this->option('host')) {
            config(['websocket.host' => $this->option('host')]);
            $_ENV['WS_HOST'] = $this->option('host');
        }

        if ($this->option('port')) {
            config(['websocket.port' => $this->option('port')]);
            $_ENV['WS_PORT'] = $this->option('port');
        }

        if ($this->option('daemon')) {
            $_ENV['WS_DAEMONIZE'] = true;
        }

        $this->info('正在启动 WebSocket 服务器...');

        try {
            $service = new WebSocketService();
            $service->start();
        } catch (\Exception $e) {
            $this->error('启动失败: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}


