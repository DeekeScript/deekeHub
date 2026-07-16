<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequestParams
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // 设置分页参数
        $limit = $request->get('pageSize', 15);
        if ($limit > 100) {
            $limit = 100;
        }
        $page = $request->get('current', 1);
        if ($page <= 0) {
            $page = 1;
        }

        $request->merge([
            'limit' => (int)$limit,
            'page' => (int)$page
        ]);

        return $next($request);
    }
}

