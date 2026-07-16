<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->string('name', 128)->comment('工作流名称');
            $table->string('description', 255)->nullable()->comment('描述');
            $table->string('fail_strategy', 10)->default('stop')->comment('失败策略: stop=停止, continue=继续');
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });

        Schema::create('workflow_scripts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workflow_id')->comment('工作流ID');
            $table->unsignedBigInteger('script_id')->comment('脚本ID');
            $table->integer('sort_order')->default(0)->comment('执行顺序');
            $table->timestamps();
            $table->foreign('workflow_id')->references('id')->on('workflows')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_scripts');
        Schema::dropIfExists('workflows');
    }
};
