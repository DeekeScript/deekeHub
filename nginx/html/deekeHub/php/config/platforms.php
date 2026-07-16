<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform feature flags
    |--------------------------------------------------------------------------
    |
    | Use these flags to enable/disable each platform via .env.
    | If a platform is disabled, it will be hidden from platform list APIs
    | and rejected in task create/update/execute endpoints.
    |
    */
    'enabled' => [
        'douyin' => env('PLATFORM_DOUYIN_ENABLED', true),
        'wechat' => env('PLATFORM_WECHAT_ENABLED', true),
        'wechat_channels' => env('PLATFORM_WECHAT_CHANNELS_ENABLED', true),
        'xiaohongshu' => env('PLATFORM_XIAOHONGSHU_ENABLED', true),
        'system' => env('PLATFORM_SYSTEM_ENABLED', true),
    ],
];

