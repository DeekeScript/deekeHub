<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OptionSeeder extends Seeder
{
    public function run()
    {
        $options = [
            ['key' => 'sms_aliyun_access_key', 'value' => '', 'remark' => '阿里云短信AccessKey'],
            ['key' => 'sms_aliyun_access_secret', 'value' => '', 'remark' => '阿里云短信AccessSecret'],
            ['key' => 'sms_aliyun_sign_name', 'value' => '', 'remark' => '阿里云短信签名'],
            ['key' => 'sms_aliyun_template_code', 'value' => '', 'remark' => '阿里云短信模板Code'],
            ['key' => 'livekit_api_key', 'value' => '', 'remark' => 'LiveKit API Key'],
            ['key' => 'livekit_api_secret', 'value' => '', 'remark' => 'LiveKit API Secret'],
            ['key' => 'livekit_host', 'value' => '', 'remark' => 'LiveKit Host URL'],
            ['key' => 'log_retention_days', 'value' => '30', 'remark' => '日志保留天数'],
            ['key' => 'jwt_expire_days', 'value' => '30', 'remark' => 'JWT过期天数'],
            ['key' => 'site_name', 'value' => '设备管理平台', 'remark' => '站点名称'],
            ['key' => 'page_logo', 'value' => '/logo.png', 'remark' => '页面Logo'],
            // 支付宝配置
            ['key' => 'alipay_app_id', 'value' => '', 'remark' => '支付宝应用ID'],
            ['key' => 'alipay_sign_type', 'value' => 'RSA2', 'remark' => '支付宝签名方式'],
            ['key' => 'alipay_notify_url', 'value' => '', 'remark' => '支付宝异步回调地址'],
            // 频控配置（针对IP维度）
            ['key' => 'rate_limit_login_per_minute', 'value' => '10', 'remark' => '登录/分钟/IP'],
            ['key' => 'rate_limit_login_per_hour', 'value' => '60', 'remark' => '登录/小时/IP'],
            ['key' => 'rate_limit_login_per_day', 'value' => '200', 'remark' => '登录/天/IP'],
            ['key' => 'rate_limit_register_per_minute', 'value' => '3', 'remark' => '注册/分钟/IP'],
            ['key' => 'rate_limit_register_per_hour', 'value' => '10', 'remark' => '注册/小时/IP'],
            ['key' => 'rate_limit_register_per_day', 'value' => '30', 'remark' => '注册/天/IP'],
            ['key' => 'rate_limit_sms_per_minute', 'value' => '2', 'remark' => '短信/分钟/IP'],
            ['key' => 'rate_limit_sms_per_hour', 'value' => '10', 'remark' => '短信/小时/IP'],
            ['key' => 'rate_limit_sms_per_day', 'value' => '30', 'remark' => '短信/天/IP'],
        ];

        foreach ($options as $opt) {
            DB::table('options')->insert(array_merge($opt, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
