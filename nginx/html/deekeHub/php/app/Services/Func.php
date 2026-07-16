<?php

namespace App\Services;

use GuzzleHttp\Client;

class Func
{
    public static function getSSLCertificateExpiry($domain)
    {
        $index = strpos($domain, 'https://');
        if ($index === 0) {
            $domain = substr($domain, $index + 8);
        }

        $context = stream_context_create([
            "ssl" => [
                "capture_peer_cert" => true,
                "verify_peer" => false,
                "verify_peer_name" => false,
            ],
        ]);

        $client = stream_socket_client(
            "ssl://{$domain}:443",
            $errno,
            $errstr,
            30,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if ($client === false) {
            throw new \Exception("连接失败: $errstr ($errno)");
        }

        $params = stream_context_get_params($client);
        $cert = $params['options']['ssl']['peer_certificate'];

        $parsedCert = openssl_x509_parse($cert);

        if ($parsedCert === false) {
            throw new \Exception("证书解析失败");
        }

        $expiryTimestamp = $parsedCert['validTo_time_t'];
        $expiryDate = date('Y-m-d H:i:s', $expiryTimestamp);

        fclose($client);

        return $expiryDate;
    }

    public static function postQiwei(string $url, string $content)
    {
        $data = [
            "msgtype" => "markdown",
            "markdown" => [
                "content" => $content,
                "mentioned_list" => ["@all"],
                "mentioned_mobile_list" => []
            ]
        ];

        $client = new Client();
        try {
            $response = $client->post($url, [
                'json' => $data,
            ]);

            $responseContent = $response->getBody()->getContents();
            echo $responseContent;
        } catch (\Exception $e) {
            echo 'Request failed: ' . $e->getMessage();
        }
    }
}

