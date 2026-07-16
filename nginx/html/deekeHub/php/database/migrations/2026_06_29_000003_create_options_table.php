<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->string('key', 128)->unique()->comment('配置键');
            $table->text('value')->nullable()->comment('配置值(JSON)');
            $table->string('remark', 255)->nullable()->comment('备注说明');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('options');
    }
};
