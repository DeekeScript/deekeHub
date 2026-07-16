<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->unsignedBigInteger('user_id')->nullable()->comment('发起运营ID');
            $table->unsignedBigInteger('workflow_id')->comment('工作流ID');
            $table->string('name', 128)->comment('任务名称');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=等待中, 1=运行中, 2=已完成, 3=失败, 4=已取消');
            $table->integer('success_count')->default(0)->comment('成功设备数');
            $table->integer('fail_count')->default(0)->comment('失败设备数');
            $table->timestamp('finished_at')->nullable()->comment('任务完成时间');
            $table->timestamps();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });

        Schema::create('task_devices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id')->comment('任务ID');
            $table->unsignedBigInteger('device_id')->comment('设备ID');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=等待中, 1=运行中, 2=已完成, 3=失败');
            $table->string('error_reason', 256)->nullable()->comment('失败原因');
            $table->timestamp('started_at')->nullable()->comment('开始执行时间');
            $table->timestamp('finished_at')->nullable()->comment('完成时间');
            $table->timestamps();
            $table->unique(['task_id', 'device_id'], 'uk_task_device');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('task_devices');
        Schema::dropIfExists('tasks');
    }
};
