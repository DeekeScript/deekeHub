<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MpPlatformClosureController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return response()->json(['message' => '系统工作正常', 'routes' => 'web.php loaded']);
});

/** MP 平台关停说明页（公开，无登录） */
Route::get('/mp/platform-closed', [MpPlatformClosureController::class, 'show']);