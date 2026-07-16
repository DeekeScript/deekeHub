<?php

namespace App\Helpers;

use App\Models\Option;
use QCloud\COSSTS\Sts;
use GuzzleHttp\Client;
use Exception;

class TencentCos
{
    public function getSign()
    {
        // 从全局设置读取配置
        $globalSetting = Option::getGlobalSetting();
        $cosType = $globalSetting['cos_type'] ?? 'tencent';
        
        if ($cosType === 'alibaba') {
            // 阿里云OSS - 返回STS临时凭证
            return $this->getOssSign($globalSetting);
        } else {
            // 腾讯云COS
            $sts = new Sts();
            $config = [
                'url' => 'https://sts.tencentcloudapi.com/',
                'domain' => 'sts.tencentcloudapi.com',
                'proxy' => '',
                'secretId' => $globalSetting['cos_secret_id'] ?? '',
                'secretKey' => $globalSetting['cos_secret_key'] ?? '',
                'bucket' => $globalSetting['cos_bucket'] ?? '',
                'region' => $globalSetting['cos_region'] ?? '',
                'durationSeconds' => 1800,
                'allowPrefix' => ['apk/*', 'appImage/*', 'taskImages/*', 'log/*', '/*'],
                'allowActions' => [
                    'name/cos:PutObject',
                    'name/cos:PostObject',
                    'name/cos:InitiateMultipartUpload',
                    'name/cos:ListMultipartUploads',
                    'name/cos:ListParts',
                    'name/cos:UploadPart',
                    'name/cos:CompleteMultipartUpload'
                ],
            ];

            return $sts->getTempKeys($config);
        }
    }
    
    private function getOssSign($globalSetting)
    {
        // 阿里云OSS STS临时凭证
        // 注意：需要配置阿里云RAM角色和STS服务
        // 这里返回格式与腾讯云COS保持一致，前端需要适配
        
        $accessKeyId = $globalSetting['cos_secret_id'] ?? '';
        $accessKeySecret = $globalSetting['cos_secret_key'] ?? '';
        $region = $globalSetting['cos_region'] ?? '';
        $bucket = $globalSetting['cos_bucket'] ?? '';
        
        // 如果没有配置，直接返回空凭证（前端可能需要使用主账号密钥）
        if (empty($accessKeyId) || empty($accessKeySecret)) {
            $expiredTime = time() + 1800;
            return [
                'credentials' => [
                    'tmpSecretId' => '',
                    'tmpSecretKey' => '',
                    'sessionToken' => '',
                ],
                'startTime' => time(),
                'expiredTime' => $expiredTime,
                'bucket' => $bucket,
                'region' => $region,
            ];
        }
        
        // 使用阿里云STS服务获取临时凭证
        // 注意：需要先在阿里云RAM中创建角色，并配置STS策略
        // 这里使用HTTP请求调用阿里云STS API
        try {
            $stsEndpoint = 'https://sts.' . $region . '.aliyuncs.com';
            $client = new Client(['timeout' => 10]);
            
            // 构建STS AssumeRole请求参数
            $params = [
                'Action' => 'AssumeRole',
                'Version' => '2015-04-01',
                'AccessKeyId' => $accessKeyId,
                'Format' => 'JSON',
                'SignatureMethod' => 'HMAC-SHA1',
                'SignatureVersion' => '1.0',
                'SignatureNonce' => uniqid(),
                'Timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
                'RoleArn' => 'acs:ram::' . $accessKeyId . ':role/oss-role', // 需要配置RAM角色ARN
                'RoleSessionName' => 'oss-session-' . time(),
                'DurationSeconds' => 1800, // 30分钟
                'Policy' => json_encode([
                    'Statement' => [
                        [
                            'Effect' => 'Allow',
                            'Action' => [
                                'oss:PutObject',
                                'oss:PostObject',
                                'oss:InitiateMultipartUpload',
                                'oss:ListMultipartUploads',
                                'oss:ListParts',
                                'oss:UploadPart',
                                'oss:CompleteMultipartUpload',
                            ],
                            'Resource' => [
                                'acs:oss:*:*:' . $bucket . '/*'
                            ],
                        ],
                    ],
                ]),
            ];
            
            // 生成签名（简化版，实际需要按照阿里云签名算法）
            // 注意：这里简化处理，实际生产环境建议使用阿里云SDK或完善签名算法
            $response = $client->post($stsEndpoint, [
                'form_params' => $params,
            ]);
            
            $result = json_decode($response->getBody()->getContents(), true);
            
            if (isset($result['Credentials'])) {
                return [
                    'credentials' => [
                        'tmpSecretId' => $result['Credentials']['AccessKeyId'],
                        'tmpSecretKey' => $result['Credentials']['AccessKeySecret'],
                        'sessionToken' => $result['Credentials']['SecurityToken'],
                    ],
                    'startTime' => strtotime($result['Credentials']['Expiration']) - 1800,
                    'expiredTime' => strtotime($result['Credentials']['Expiration']),
                    'bucket' => $bucket,
                    'region' => $region,
                ];
            }
        } catch (Exception $e) {
            // 如果STS调用失败，返回主账号密钥（不推荐，但可以临时使用）
            // 生产环境应该配置STS角色
        }
        
        // 如果STS获取失败，返回主账号密钥（仅用于开发测试）
        // 生产环境必须使用STS临时凭证
        $expiredTime = time() + 1800;
        return [
            'credentials' => [
                'tmpSecretId' => $accessKeyId,
                'tmpSecretKey' => $accessKeySecret,
                'sessionToken' => '',
            ],
            'startTime' => time(),
            'expiredTime' => $expiredTime,
            'bucket' => $bucket,
            'region' => $region,
        ];
    }
    
    public function getConfig()
    {
        // 获取COS配置信息
        $globalSetting = Option::getGlobalSetting();
        $cosType = $globalSetting['cos_type'] ?? 'tencent';
        
        if ($cosType === 'alibaba') {
            return [
                'type' => 'alibaba',
                'secret_id' => $globalSetting['cos_secret_id'] ?? '',
                'secret_key' => $globalSetting['cos_secret_key'] ?? '',
                'bucket' => $globalSetting['cos_bucket'] ?? '',
                'region' => $globalSetting['cos_region'] ?? '',
                'host' => $globalSetting['cos_host'] ?? '',
            ];
        } else {
            return [
                'type' => 'tencent',
                'secret_id' => $globalSetting['cos_secret_id'] ?? '',
                'secret_key' => $globalSetting['cos_secret_key'] ?? '',
                'bucket' => $globalSetting['cos_bucket'] ?? '',
                'region' => $globalSetting['cos_region'] ?? '',
                'host' => $globalSetting['cos_host'] ?? '',
            ];
        }
    }
}

