<?php

namespace App\Jobs;

use App\Models\Developer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendWebhookNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        private int $developerId,
        private string $event,
        private string $title,
        private string $deviceId,
        private string $deviceName,
        private string $detail,
    ) {}

    public function handle(): void
    {
        $developer = Developer::find($this->developerId);
        if (!$developer) return;

        $events = $developer->notify_events ?? [];
        if (!is_array($events)) {
            $events = json_decode($events ?? '', true) ?: [];
        }
        if (!in_array($this->event, $events)) return;

        if (!empty($developer->dingtalk_webhook)) {
            $this->sendDingtalk($developer->dingtalk_webhook);
        }

        if (!empty($developer->wecom_webhook)) {
            $this->sendWecom($developer->wecom_webhook);
        }
    }

    private function sendDingtalk(string $webhook): void
    {
        try {
            $res = Http::timeout(10)->post($webhook, [
                'msgtype' => 'markdown',
                'markdown' => [
                    'title' => $this->title,
                    'text'  => $this->buildMarkdown(),
                ],
            ]);
            if (!$res->successful()) {
                Log::warning('钉钉通知发送失败', ['webhook' => $webhook, 'status' => $res->status(), 'body' => $res->body()]);
            }
        } catch (\Exception $e) {
            Log::error('钉钉通知异常: ' . $e->getMessage());
        }
    }

    private function sendWecom(string $webhook): void
    {
        try {
            $res = Http::timeout(10)->post($webhook, [
                'msgtype' => 'markdown',
                'markdown' => [
                    'content' => $this->buildMarkdown(),
                ],
            ]);
            if (!$res->successful()) {
                Log::warning('企微通知发送失败', ['webhook' => $webhook, 'status' => $res->status(), 'body' => $res->body()]);
            }
        } catch (\Exception $e) {
            Log::error('企微通知异常: ' . $e->getMessage());
        }
    }

    private function buildMarkdown(): string
    {
        $lines = [
            '### ' . $this->title,
            '',
            '> 设备ID: **' . $this->deviceId . '**',
            '> 设备名称: **' . $this->deviceName . '**',
            '> ' . $this->detail,
            '',
            '> 时间: ' . now()->format('Y-m-d H:i:s'),
        ];
        return implode("\n", $lines);
    }
}
