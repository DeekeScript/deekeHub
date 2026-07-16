<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->comment('类型: device=设备套餐, frame=点数套餐（等同于帧数）');
            $table->string('name', 128)->comment('套餐名称');
            $table->string('billing_cycle', 10)->comment('计费周期: day/month/year');
            $table->integer('unit_count')->default(1)->comment('包含数量（设备数或点数，点数等同于帧数）');
            $table->decimal('price', 10, 2)->default(0)->comment('价格(元)');
            $table->string('slogan', 255)->nullable()->comment('营销文案');
            $table->integer('bonus_days')->default(0)->comment('赠送天数');
            $table->tinyInteger('status')->default(1)->comment('状态: 1=上架, 0=下架');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('plans');
    }
};
