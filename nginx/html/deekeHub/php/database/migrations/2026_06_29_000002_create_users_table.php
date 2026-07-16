<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('所属开发者ID');
            $table->string('phone', 20)->comment('手机号');
            $table->string('password')->comment('密码');
            $table->string('name', 64)->nullable()->comment('运营名称');
            $table->tinyInteger('status')->default(1)->comment('状态: 1=正常, 0=停用');
            $table->bigInteger('device_frame_balance')->default(0)->comment('点数余额（等同于帧数，用于实时画面消耗）');
            $table->timestamps();
            $table->softDeletes();
            $table->index('developer_id', 'idx_developer_id');
            $table->unique('phone', 'uk_phone');
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};
