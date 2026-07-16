<?php

namespace App\Http\Middleware;

use App\Helpers\JwtHelper;
use App\Models\DeekescriptUser;
use Closure;
use Illuminate\Http\Request;

class DeekescriptJwtAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        if (empty($token)) {
            $authHeader = $request->header('Authorization', '');
            if ($authHeader !== '') {
                $token = trim(str_replace('Bearer ', '', $authHeader));
            }
        }

        if (empty($token)) {
            return response()->json(['code' => 401, 'msg' => '未登录或登录已失效', 'success' => false], 401);
        }

        $payload = JwtHelper::verifyToken($token);
        $appRole = (int) config('deekescript.jwt_role_type', 98);

        if (!$payload || !isset($payload['id'], $payload['role_type']) || (int) $payload['role_type'] !== $appRole) {
            return response()->json(['code' => 401, 'msg' => '登录已失效', 'success' => false], 401);
        }

        $user = DeekescriptUser::query()
            ->where('id', (int) $payload['id'])
            ->where('status', DeekescriptUser::STATUS_ACTIVE)
            ->first();

        if (!$user) {
            return response()->json(['code' => 401, 'msg' => '账号不存在或已禁用', 'success' => false], 401);
        }

        $request->merge(['deekescript_user' => $user]);
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}
