<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('developers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 64)->comment('开发者名称');
            $table->string('phone', 20)->unique()->comment('手机号');
            $table->string('password')->comment('密码');
            $table->tinyInteger('status')->default(1)->comment('状态: 1=正常, 0=停用');
            $table->string('email', 128)->nullable()->comment('邮箱');
            $table->string('dingtalk_webhook', 512)->nullable()->comment('钉钉通知webhook');
            $table->string('wecom_webhook', 512)->nullable()->comment('企微通知webhook');
            $table->json('notify_events')->nullable()->comment('通知事件: task_start,task_complete,device_offline,device_online');
            $table->integer('max_users')->default(0)->comment('最大运营数');
            $table->bigInteger('device_frame_balance')->default(0)->comment('点数余额（等同于帧数，用于实时画面消耗）');
            $table->bigInteger('total_points')->default(0)->comment('累计获得的总点数（只增不减）');
            $table->tinyInteger('trial_granted')->default(0)->comment('是否已赠送首次试用: 0=未赠送, 1=已赠送');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('developers');
    }
};
