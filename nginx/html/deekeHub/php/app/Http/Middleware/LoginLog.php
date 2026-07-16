<?php

namespace App\Http\Middleware;

use App\Models\LoginLog as LoginLogModel;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LoginLog
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->isMethod('POST') && $request->is('api/login')) {
            $request->attributes->set('_login_log_params', $request->all());
            $request->attributes->set('_login_log_ip', $request->ip());
            $request->attributes->set('_login_log_user_agent', $request->header('user-agent', ''));
        }
        return $next($request);
    }

    public function terminate($request, $response)
    {
        if (!$request->isMethod('POST') || !$request->is('api/login')) return;

        $params = $request->attributes->get('_login_log_params');
        $ip = $request->attributes->get('_login_log_ip');
        $userAgent = $request->attributes->get('_login_log_user_agent');

        if (!$params) return;

        $status = 0;
        if ($response->getStatusCode() === 200) {
            $data = json_decode($response->getContent(), true);
            if (isset($data['success']) && $data['success'] === true) {
                $status = 1;
            }
        }

        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }

        try {
            LoginLogModel::create([
                'role_type' => $params['role_type'] ?? '',
                'phone'     => $params['phone'] ?? $params['username'] ?? '',
                'ip'        => $ip,
                'user_agent' => $userAgent,
                'status'    => $status,
            ]);
        } catch (\Exception $e) {
            Log::error('Login log failed: ' . $e->getMessage());
        }
    }
}
