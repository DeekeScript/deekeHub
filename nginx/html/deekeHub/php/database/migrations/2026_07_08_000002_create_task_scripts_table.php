<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('task_scripts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id')->comment('任务ID');
            $table->unsignedBigInteger('script_id')->comment('原始脚本ID');
            $table->unsignedBigInteger('workflow_id')->comment('工作流ID');
            $table->string('url', 1024)->nullable()->comment('COS/OSS 文件地址');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down()
    {
        Schema::dropIfExists('task_scripts');
    }
};
