<?php

namespace App\Services;

use App\Models\Option;
use Illuminate\Support\Facades\Log;
use OSS\OssClient;
use Qcloud\Cos\Client as CosClient;

class ObjectStorageService
{
    private ?array $config = null;

    public function isConfigured(): bool
    {
        $c = $this->getConfig();
        return !empty($c['provider']) && !empty($c['bucket']) && !empty($c['region']);
    }

    public function getConfig(): array
    {
        if ($this->config !== null) return $this->config;
        $this->config = [
            'provider'    => Option::getValue('storage_provider', ''),
            'bucket'      => Option::getValue('storage_bucket', ''),
            'region'      => Option::getValue('storage_region', ''),
            'access_key'  => Option::getValue('storage_access_key', ''),
            'secret_key'  => Option::getValue('storage_secret_key', ''),
            'cdn_domain'  => Option::getValue('storage_cdn_domain', ''),
        ];
        return $this->config;
    }

    public function uploadScript(string $content, ?string $currentUrl): ?string
    {
        $c = $this->getConfig();
        if (!$this->isConfigured()) return null;

        $filename = md5($content) . '.js';

        if ($currentUrl && str_ends_with($currentUrl, $filename)) {
            return $currentUrl;
        }

        return $this->upload('scripts/' . $filename, $content, 'application/javascript');
    }

    public function upload(string $key, string $content, string $contentType = 'application/octet-stream'): ?string
    {
        $c = $this->getConfig();
        if (!$this->isConfigured()) return null;

        try {
            switch ($c['provider']) {
                case 'cos':
                    return $this->uploadToCos($key, $content, $contentType, $c);
                case 'oss':
                    return $this->uploadToOss($key, $content, $contentType, $c);
                default:
                    Log::warning('未知的对象存储提供商', ['provider' => $c['provider']]);
                    return null;
            }
        } catch (\Exception $e) {
            Log::error('对象存储上传失败', [
                'key'   => $key,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function uploadToCos(string $key, string $content, string $contentType, array $c): string
    {
        $client = new CosClient([
            'region'      => $c['region'],
            'schema'      => 'https',
            'credentials' => [
                'secretId'  => $c['access_key'],
                'secretKey' => $c['secret_key'],
            ],
        ]);

        $client->putObject([
            'Bucket'      => $c['bucket'],
            'Key'         => $key,
            'Body'        => $content,
            'ContentType' => $contentType,
        ]);

        if (!empty($c['cdn_domain'])) {
            return rtrim($c['cdn_domain'], '/') . '/' . $key;
        }
        return "https://{$c['bucket']}.cos.{$c['region']}.myqcloud.com/{$key}";
    }

    private function uploadToOss(string $key, string $content, string $contentType, array $c): string
    {
        $client = new OssClient($c['access_key'], $c['secret_key'], $this->ossEndpoint($c));

        $client->putObject($c['bucket'], $key, $content, [
            OssClient::OSS_HEADERS => ['Content-Type' => $contentType],
        ]);

        if (!empty($c['cdn_domain'])) {
            return rtrim($c['cdn_domain'], '/') . '/' . $key;
        }
        return "https://{$c['bucket']}.{$c['region']}.aliyuncs.com/{$key}";
    }

    private function ossEndpoint(array $c): string
    {
        $internal = Option::getValue('storage_oss_internal', false);
        $suffix = $internal ? '-internal' : '';
        return "https://oss{$suffix}-{$c['region']}.aliyuncs.com";
    }
}
