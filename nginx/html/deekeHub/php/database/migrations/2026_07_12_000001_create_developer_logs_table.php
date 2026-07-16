<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('developer_logs')) return;

        Schema::create('developer_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->string('action', 32)->comment('操作: adjust_points/toggle_status');
            $table->bigInteger('before_value')->default(0)->comment('操作前值');
            $table->bigInteger('after_value')->default(0)->comment('操作后值');
            $table->bigInteger('change_amount')->default(0)->comment('变化量');
            $table->string('reason', 255)->nullable()->comment('操作原因');
            $table->string('operator', 100)->nullable()->comment('操作人');
            $table->timestamps();
            $table->index('developer_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('developer_logs');
    }
};
