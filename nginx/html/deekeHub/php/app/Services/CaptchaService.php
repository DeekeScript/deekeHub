<?php

namespace App\Services;

use Gregwar\Captcha\CaptchaBuilder;
use Gregwar\Captcha\PhraseBuilder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CaptchaService
{
    /**
     * 创建验证码（API 模式）
     * 
     * @param string $config 配置名称（保留兼容性，暂不使用）
     * @return \Illuminate\Http\JsonResponse
     */
    public static function create(string $config = 'default')
    {
        try {
            $phraseBuilder = new PhraseBuilder(4, '0123456789abcdefghijklmnopqrstuvwxyz');
            $builder = new CaptchaBuilder(null, $phraseBuilder);
            $builder->build(120, 40);
            $phrase = $builder->getPhrase();

            // 将验证码存储到缓存中，有效期 5 分钟
            // 使用 IP 和随机字符串生成 key，因为 API 路由可能没有 session
            $sessionId = session_id() ?: uniqid('api_', true);
            $key = 'captcha_' . md5($sessionId . request()->ip() . microtime(true));
            Cache::put($key, strtolower($phrase), 300);

            // 使用 inline() 方法直接获取 base64 编码的图片数据
            $base64Image = $builder->inline();
            
            if (empty($base64Image)) {
                // 如果 inline() 失败，尝试使用 get() 方法
                $imageData = $builder->get();
                if (empty($imageData)) {
                    Log::error('Captcha: inline() and get() both returned empty');
                    throw new \Exception('验证码图片生成失败：无法获取图片数据，请检查 GD 库是否正确安装');
                }
                $base64Image = 'data:image/png;base64,' . base64_encode($imageData);
            }
            
            return response()->json([
                'code' => 0,
                'data' => [
                    'sensitive' => false,
                    'key' => $key,
                    'img' => $base64Image,
                ],
                'msg' => 'success',
                'success' => true,
            ])->header('Content-Type', 'application/json; charset=utf-8');
            
        } catch (\Exception $e) {
            // 记录错误并返回错误响应
            Log::error('Captcha generation failed: ' . $e->getMessage());
            
            return response()->json([
                'code' => 1,
                'msg' => '验证码生成失败：' . $e->getMessage(),
                'success' => false,
            ], 500);
        }
    }

    /**
     * 验证验证码
     * 
     * @param string $code 用户输入的验证码
     * @param string|null $key 验证码 key（可选）
     * @return bool
     */
    public static function check($code, $key = null)
    {
        if (empty($code)) {
            return false;
        }

        // 如果没有提供 key，尝试从请求参数中获取
        if ($key === null) {
            $key = request()->input('captcha_key') ?? request()->header('X-Captcha-Key');
        }
        
        // 如果还是没有 key，尝试使用旧的 session 方式（兼容性）
        if ($key === null) {
            $sessionId = session_id() ?: '';
            if ($sessionId) {
                $key = 'captcha_' . md5($sessionId . request()->ip());
            } else {
                return false; // API 模式下必须提供 key
            }
        }

        $cachedCode = Cache::get($key);
        
        if ($cachedCode === null) {
            return false;
        }

        // 验证后删除验证码（一次性使用）
        Cache::forget($key);

        return strtolower($code) === strtolower($cachedCode);
    }
}

