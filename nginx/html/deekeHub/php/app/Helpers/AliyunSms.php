<?php

namespace App\Helpers;

use App\Models\Option;
use Illuminate\Support\Facades\Log;

class AliyunSms
{
    private static function getConfig(): array
    {
        return [
            'key'    => Option::getGlobalSetting()['sms_aliyun_access_key'] ?? '',
            'secret' => Option::getGlobalSetting()['sms_aliyun_access_secret'] ?? '',
            'sign'   => Option::getGlobalSetting()['sms_aliyun_sign_name'] ?? '',
            'tpl'    => Option::getGlobalSetting()['sms_aliyun_template_code'] ?? '',
        ];
    }

    public static function send(string $phone, string $code): bool
    {
        $cfg = self::getConfig();
        if (empty($cfg['key']) || empty($cfg['secret']) || empty($cfg['sign']) || empty($cfg['tpl'])) {
            Log::warning('阿里云短信未配置', ['phone' => $phone]);
            return false;
        }

        $params = [
            'AccessKeyId'      => $cfg['key'],
            'Action'           => 'SendSms',
            'Format'           => 'JSON',
            'PhoneNumbers'     => $phone,
            'SignName'         => $cfg['sign'],
            'TemplateCode'     => $cfg['tpl'],
            'TemplateParam'    => json_encode(['code' => $code]),
            'SignatureMethod'  => 'HMAC-SHA1',
            'SignatureVersion' => '1.0',
            'SignatureNonce'   => bin2hex(random_bytes(16)),
            'Timestamp'        => gmdate("Y-m-d\TH:i:s\Z"),
            'Version'          => '2017-05-25',
        ];

        ksort($params);
        $canonical = '';
        foreach ($params as $k => $v) {
            $canonical .= '&' . self::encode($k) . '=' . self::encode($v);
        }
        $stringToSign = 'POST&%2F&' . self::encode(substr($canonical, 1));
        $signature = base64_encode(hash_hmac('sha1', $stringToSign, $cfg['secret'] . '&', true));
        $params['Signature'] = $signature;

        $ch = curl_init('https://dysmsapi.aliyuncs.com/');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($params, '', '&', PHP_QUERY_RFC3986),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);

        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resp = json_decode($body, true);

        if ($httpCode !== 200 || ($resp['Code'] ?? '') !== 'OK') {
            Log::error('阿里云短信发送失败', [
                'phone' => $phone,
                'http'  => $httpCode,
                'resp'  => $body,
            ]);
            return false;
        }

        Log::info('短信发送成功', ['phone' => $phone]);
        return true;
    }

    private static function encode(string $str): string
    {
        return str_replace(['+', '*', '%7E'], ['%20', '%2A', '~'], rawurlencode($str));
    }
}
