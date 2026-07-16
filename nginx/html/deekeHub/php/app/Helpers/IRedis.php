<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Redis as LaravelRedis;

class IRedis
{
    private static $instance;

    public static function instance()
    {
        if (!self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function lock($key, $id, $ttl = 5)
    {
        $redis = LaravelRedis::connection()->client();
        return $redis->set($key, $id, 'EX', $ttl, 'NX');
    }

    public function unLock($key)
    {
        $redis = LaravelRedis::connection()->client();
        return $redis->del($key);
    }
}

