<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('task_log_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id')->comment('任务ID');
            $table->unsignedBigInteger('task_device_id')->comment('任务设备ID');
            $table->string('url', 1024)->nullable()->comment('COS/OSS 文件地址');
            $table->bigInteger('size')->default(0)->comment('压缩包大小(bytes)');
            $table->timestamp('created_at')->nullable();
            $table->index('task_id');
            $table->index('task_device_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('task_log_files');
    }
};
