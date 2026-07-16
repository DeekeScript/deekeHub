<?php

if (!function_exists('env')) {
    function env($key, $default = null) {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
}

if (!function_exists('cacheLimit')) {
    function cacheLimit($key, $ttl, $max, $suffix = '') {
        $cacheKey = $key . ($suffix ? ':' . $suffix : '');
        $count = \Illuminate\Support\Facades\Cache::get($cacheKey, 0);
        if ($count >= $max) return true;
        \Illuminate\Support\Facades\Cache::put($cacheKey, $count + 1, $ttl);
        return false;
    }
}

if (!function_exists('getGlobalConfig')) {
    function getGlobalConfig($key, $default = null) {
        return \App\Models\Option::getValue($key, $default);
    }
}
