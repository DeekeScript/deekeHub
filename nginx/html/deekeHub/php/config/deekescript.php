<?php

return [
    /** 管理员后台是否启用 DeekeScript 模块（.env DEEKESCRIPT_ADMIN_ENABLED） */
    'admin_enabled' => filter_var(env('DEEKESCRIPT_ADMIN_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    /** 邮箱验证码长度 */
    'code_length' => 6,
    /** 验证码有效期（秒） */
    'code_ttl' => 600,
    /** JWT 中标识 Deekescript 端用户的 role_type（与后台 0/1/2 区分） */
    'jwt_role_type' => 98,
    /** 商户订单号前缀（默认 dk；完整单号为「前缀 + 10 位十六进制随机串」，短且唯一） */
    'order_no_prefix' => env('DEEKESCRIPT_ORDER_NO_PREFIX', 'dk'),
    /** 同一用户、同一套餐、同类型待支付订单在多少秒内复用（默认 3600=1 小时） */
    'order_reuse_ttl' => (int) env('DEEKESCRIPT_ORDER_REUSE_TTL', 3600),
    /**
     * 验证码邮件主题 / 展示用产品名（固定为 DeekeScript，不用 APP_NAME）。
     * 如需覆盖可设 .env DEEKESCRIPT_MAIL_BRAND
     */
    'mail_brand' => env('DEEKESCRIPT_MAIL_BRAND', 'DeekeScript'),
];
