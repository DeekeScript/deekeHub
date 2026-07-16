<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use App\Models\Developer;
use App\Models\User;
use App\Helpers\JwtHelper;
use Closure;
use Illuminate\Http\Request;

class Authenticate
{
    protected $ignoreActions = ['login', 'outLogin', 'config', 'verify', 'deviceActivate', 'deviceHeartbeat', 'deviceLogUpload', 'deviceLivekitJoin'];

    public function handle(Request $request, Closure $next)
    {
        if (!$request->route()) {
            return $next($request);
        }

        $action = $request->route()->getActionMethod();
        $controller = class_basename($request->route()->getController());

        if (in_array($action, $this->ignoreActions)) {
            return $next($request);
        }

        $token = $this->getToken($request);
        if (empty($token)) {
            return response()->json(['code' => 401, 'msg' => '未登录', 'success' => false], 401);
        }

        $jwtData = JwtHelper::getUserFromToken($token);
        if (!$jwtData || !isset($jwtData['id']) || !isset($jwtData['role_type'])) {
            return response()->json(['code' => 401, 'msg' => '登录已失效', 'success' => false], 401);
        }

        $roleType = $jwtData['role_type'];
        $userId = (int)$jwtData['id'];

        // 根据角色类型查找用户
        if ($roleType === 'super_admin') {
            $user = AdminUser::find($userId);
            if (!$user || !$user->status) {
                return response()->json(['code' => 401, 'msg' => '账号已被停用', 'success' => false], 401);
            }
        } elseif ($roleType === 'developer') {
            $user = Developer::find($userId);
            if (!$user || !$user->status) {
                return response()->json(['code' => 401, 'msg' => '账号已被停用', 'success' => false], 401);
            }
            // 检查开发者是否被超管停用
            if (isset($user->status) && !$user->status) {
                return response()->json(['code' => 401, 'msg' => '账号已被停用', 'success' => false], 401);
            }
        } elseif ($roleType === 'user') {
            $user = User::find($userId);
            if (!$user || !$user->status) {
                return response()->json(['code' => 401, 'msg' => '账号已被停用', 'success' => false], 401);
            }
            // 检查所属开发者是否停用
            $developer = Developer::find($user->developer_id);
            if (!$developer || !$developer->status) {
                return response()->json(['code' => 401, 'msg' => '所属开发者账号已被停用', 'success' => false], 401);
            }
        } else {
            return response()->json(['code' => 401, 'msg' => '无效的角色类型', 'success' => false], 401);
        }

        // 将用户信息注入请求
        $authUser = (object)[
            'id' => $userId,
            'role_type' => $roleType,
            'name' => $user->name ?? $user->username ?? '',
            'phone' => $user->phone ?? '',
        ];
        if ($roleType === 'user') {
            $authUser->developer_id = $user->developer_id;
        }

        $request->attributes->set('auth_user', $authUser);
        $request->setUserResolver(function () use ($authUser) {
            return $authUser;
        });

        // 设置分页参数
        $limit = (int)$request->get('pageSize', 15);
        if ($limit > 100) $limit = 100;
        $page = (int)$request->get('current', 1);
        if ($page <= 0) $page = 1;
        $request->merge(['limit' => $limit, 'page' => $page]);

        return $next($request);
    }

    private function getToken(Request $request): ?string
    {
        $token = $request->bearerToken();
        if (!empty($token)) return $token;

        $authHeader = $request->header('Authorization', '');
        if (!empty($authHeader)) {
            return trim(str_replace('Bearer ', '', $authHeader));
        }

        $authHeader = $request->server('HTTP_AUTHORIZATION', '');
        if (!empty($authHeader)) {
            return trim(str_replace('Bearer ', '', $authHeader));
        }

        return null;
    }
}
