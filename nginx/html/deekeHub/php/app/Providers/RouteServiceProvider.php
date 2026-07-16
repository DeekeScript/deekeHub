<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/home';

    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::prefix('api')
                ->middleware('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(180)->by(optional($request->user())->id ?: $request->ip());
        });

        // 登录接口频率限制：5分钟内最多5次
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinutes(5, 10)->by($request->ip());
        });

        /** Deekescript 新 APP：注册发码（防刷邮） */
        RateLimiter::for('deekescript-register-send', function (Request $request) {
            return Limit::perDay(20)->by('deekescript-reg-send:'.$request->ip());
        });

        /** 同一 IP 每天最多完成注册 5 次 */
        RateLimiter::for('deekescript-register', function (Request $request) {
            return Limit::perDay(5)->by('deekescript-reg:'.$request->ip());
        });

        /** 登录提交：每分 10 次、每天 100 次（失败计入） */
        RateLimiter::for('deekescript-login', function (Request $request) {
            return [
                Limit::perMinute(10)->by('deekescript-login-min:'.$request->ip()),
                Limit::perDay(100)->by('deekescript-login-day:'.$request->ip()),
            ];
        });

        /** 找回密码发码 */
        RateLimiter::for('deekescript-password-send', function (Request $request) {
            return [
                Limit::perMinute(5)->by('deekescript-pwd-send-min:'.$request->ip()),
                Limit::perDay(50)->by('deekescript-pwd-send-day:'.$request->ip()),
            ];
        });

        /** 找回密码提交：与登录同级 */
        RateLimiter::for('deekescript-password', function (Request $request) {
            return [
                Limit::perMinute(10)->by('deekescript-pwd-min:'.$request->ip()),
                Limit::perDay(100)->by('deekescript-pwd-day:'.$request->ip()),
            ];
        });

        /** 设备绑定：同 IP 每分钟5次、每小时10次、每天20次 */
        RateLimiter::for('dke-bind', function (Request $request) {
            return [
                Limit::perMinute(5)->by('dke-bind-min:'.$request->ip()),
                Limit::perHour(10)->by('dke-bind-hour:'.$request->ip()),
                Limit::perDay(20)->by('dke-bind-day:'.$request->ip()),
            ];
        });
    }
}

