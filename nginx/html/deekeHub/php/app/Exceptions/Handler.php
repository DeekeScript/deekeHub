<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontReport = [
        //
    ];

    protected $dontFlash = [
        'password',
        'password_confirmation',
    ];

    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $exception)
    {
        // 处理频率限制异常，返回友好的错误消息
        if ($exception instanceof ThrottleRequestsException) {
            return response()->json([
                'code' => 1,
                'msg' => '频率限制，请稍后再试',
                'success' => false,
            ], 200); // 返回 200 状态码，而不是 429
        }

        return parent::render($request, $exception);
    }
}

