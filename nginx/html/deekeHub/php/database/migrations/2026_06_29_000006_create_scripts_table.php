<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('scripts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->string('name', 128)->comment('脚本名称');
            $table->string('remark', 255)->nullable()->comment('备注');
            $table->longText('content')->nullable()->comment('脚本内容');
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('scripts');
    }
};
