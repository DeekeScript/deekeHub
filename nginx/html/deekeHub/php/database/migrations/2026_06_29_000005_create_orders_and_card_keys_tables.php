<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('device_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 64)->nullable()->unique()->comment('支付宝订单号');
            $table->string('order_type', 20)->default('purchase')->comment('订单类型: trial=首次赠送, purchase=购买');
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->unsignedBigInteger('plan_id')->nullable()->comment('套餐ID');
            $table->json('device_ids')->nullable()->comment('续费时关联的设备ID列表');
            $table->integer('device_count')->default(0)->comment('购买设备数量');
            $table->decimal('total_price', 10, 2)->default(0)->comment('总价');
            $table->string('pay_type', 20)->nullable()->comment('支付方式');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=待支付, 1=已支付, 2=已取消');
            $table->timestamp('paid_at')->nullable()->comment('支付时间');
            $table->timestamps();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });

        Schema::create('frame_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 64)->nullable()->unique()->comment('支付宝订单号');
            $table->string('order_type', 20)->default('purchase')->comment('订单类型: trial=首次赠送, purchase=购买');
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->unsignedBigInteger('plan_id')->nullable()->comment('套餐ID');
            $table->bigInteger('frame_count')->default(0)->comment('购买点数（等同于帧数）');
            $table->decimal('total_price', 10, 2)->default(0)->comment('总价');
            $table->string('pay_type', 20)->nullable()->comment('支付方式');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=待支付, 1=已支付, 2=已取消');
            $table->timestamp('paid_at')->nullable()->comment('支付时间');
            $table->timestamps();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });

        Schema::create('card_keys', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('开发者ID');
            $table->unsignedBigInteger('order_id')->nullable()->comment('关联订单ID');
            $table->string('key_code', 64)->unique()->comment('卡密');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=未使用, 1=已使用, 2=已注销');
            $table->unsignedBigInteger('used_device_id')->nullable()->comment('使用此卡密的设备ID');
            $table->timestamp('used_at')->nullable()->comment('使用时间');
            $table->timestamps();
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('card_keys');
        Schema::dropIfExists('frame_orders');
        Schema::dropIfExists('device_orders');
    }
};
