<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;
use App\Models\Option;

class JwtHelper
{
    /**
     * 生成 JWT Token
     * 
     * @param array $payload 载荷数据（包含用户ID、角色类型等）
     * @param int|null $expireDays 过期时间（天），如果为 null 则从全局设置读取，默认30天
     * @return string
     */
    public static function generateToken(array $payload, ?int $expireDays = null): string
    {
        $key = config('app.key');
        if (strpos($key, 'base64:') === 0) {
            $key = base64_decode(substr($key, 7));
        }

        // 从全局设置获取过期时间（天），默认30天
        if ($expireDays === null) {
            $globalSetting = Option::getGlobalSetting();
            $expireDays = (int)($globalSetting['jwt_expire_days'] ?? 30);
        }

        $now = time();
        $payload['iat'] = $now; // 签发时间
        $payload['exp'] = $now + ($expireDays * 24 * 3600); // 过期时间（转换为秒）
        $payload['nbf'] = $now; // 生效时间

        return JWT::encode($payload, $key, 'HS256');
    }

    /**
     * 验证并解析 JWT Token
     * 
     * @param string $token JWT Token
     * @return array|false 返回载荷数据，失败返回 false
     */
    public static function verifyToken(string $token)
    {
        try {
            $key = config('app.key');
            if (empty($key)) {
                // 开发环境记录错误
                if (config('app.debug')) {
                    \Log::error('JWT验证失败: APP_KEY 未配置');
                }
                return false;
            }
            
            if (strpos($key, 'base64:') === 0) {
                $key = base64_decode(substr($key, 7));
            }

            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            return (array) $decoded;
        } catch (\Firebase\JWT\ExpiredException $e) {
            // Token 已过期
            if (config('app.debug')) {
                \Log::warning('JWT验证失败: Token已过期', ['error' => $e->getMessage()]);
            }
            return false;
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            // Token 签名无效（可能是密钥不匹配）
            if (config('app.debug')) {
                \Log::error('JWT验证失败: Token签名无效', ['error' => $e->getMessage()]);
            }
            return false;
        } catch (Exception $e) {
            // 其他错误
            if (config('app.debug')) {
                \Log::error('JWT验证失败', ['error' => $e->getMessage(), 'class' => get_class($e)]);
            }
            return false;
        }
    }

    /**
     * 从 Token 中提取用户信息
     * 
     * @param string $token JWT Token
     * @return array|null 返回用户信息数组，包含 id, role_type 等，失败返回 null
     */
    public static function getUserFromToken(string $token): ?array
    {
        $payload = self::verifyToken($token);
        if (!$payload) {
            return null;
        }

        return [
            'id' => $payload['id'] ?? null,
            'role_type' => $payload['role_type'] ?? null,
            'mobile' => $payload['mobile'] ?? null,
            'name' => $payload['name'] ?? null,
        ];
    }
}

