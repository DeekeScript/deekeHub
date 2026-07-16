<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('frame_balance_pools', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('所属开发者');
            $table->bigInteger('amount')->default(0)->comment('初始额度(B)');
            $table->bigInteger('remaining')->default(0)->comment('剩余额度(B)');
            $table->timestamp('expired_at')->nullable()->comment('过期时间');
            $table->timestamp('created_at')->nullable();
            $table->index('developer_id');
            $table->index('expired_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('frame_balance_pools');
    }
};
