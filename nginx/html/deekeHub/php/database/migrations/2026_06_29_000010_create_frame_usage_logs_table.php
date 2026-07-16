<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('frame_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->unsignedBigInteger('user_id')->nullable()->comment('运营ID');
            $table->unsignedBigInteger('device_id')->comment('设备ID');
            $table->tinyInteger('quality')->default(30)->comment('画质: 5/10/30 帧/秒');
            $table->bigInteger('frames_consumed')->default(0)->comment('消耗点数（等同于帧数）');
            $table->integer('seconds_watched')->default(0)->comment('观看秒数');
            $table->timestamp('started_at')->nullable()->comment('开始时间');
            $table->timestamp('ended_at')->nullable()->comment('结束时间');
            $table->timestamps();
            $table->index(['developer_id', 'created_at'], 'idx_dev_date');
            $table->index(['device_id', 'created_at'], 'idx_device_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('frame_usage_logs');
    }
};
