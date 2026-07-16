<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('recipient_id')->comment('接收者ID');
            $table->string('recipient_type', 20)->comment('接收者类型: developer/user');
            $table->string('title', 255)->comment('通知标题');
            $table->text('content')->nullable()->comment('通知内容');
            $table->tinyInteger('is_read')->default(0)->comment('是否已读: 0=未读, 1=已读');
            $table->timestamps();
            $table->index(['recipient_id', 'recipient_type'], 'idx_recipient');
            $table->index('is_read', 'idx_is_read');
        });

        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();
            $table->string('role_type', 20)->comment('角色类型: super_admin/developer/user');
            $table->unsignedBigInteger('user_id')->nullable()->comment('登录运营ID');
            $table->string('phone', 20)->nullable()->comment('登录手机号');
            $table->string('ip', 45)->nullable()->comment('IP地址');
            $table->string('user_agent', 512)->nullable()->comment('UA');
            $table->tinyInteger('status')->default(1)->comment('状态: 1=成功, 0=失败');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('login_logs');
        Schema::dropIfExists('notifications');
    }
};
