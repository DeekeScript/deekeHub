<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;

    /**
     * 成功响应
     */
    protected function success($data = [], $ext = []): JsonResponse
    {
        if (is_string($ext)) {
            $ext = ['msg' => $ext];
        }
        $msg = $ext['msg'] ?? '成功';
        $return = ['code' => 0, 'success' => true, 'data' => $data, 'msg' => $msg];
        if (is_array($data) && isset($data['total'])) {
            $return['total'] = $data['total'];
            $return['data'] = $data['data'] ?? $data;
            // preserve extra keys like 'stats'
            foreach ($data as $key => $val) {
                if ($key !== 'total' && $key !== 'data' && !isset($return[$key])) {
                    $return[$key] = $val;
                }
            }
        }
        return response()->json($return);
    }

    /**
     * 错误响应
     */
    protected function error($data = [], int $code = 1): JsonResponse
    {
        if (is_string($data)) {
            $data = ['msg' => $data];
        }
        return response()->json([
            'code' => $code,
            'data' => [],
            'success' => false,
            'msg' => is_array($data) && isset($data['msg']) ? $data['msg'] : '失败',
        ]);
    }
}
