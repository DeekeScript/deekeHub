<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('admin_users', function (Blueprint $table) {
            $table->id();
            $table->string('username', 64)->unique()->comment('用户名');
            $table->string('password')->comment('密码');
            $table->string('name', 64)->nullable()->comment('显示名称');
            $table->string('phone', 20)->nullable()->comment('手机号');
            $table->tinyInteger('status')->default(1)->comment('状态: 1=正常, 0=停用');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_users');
    }
};
