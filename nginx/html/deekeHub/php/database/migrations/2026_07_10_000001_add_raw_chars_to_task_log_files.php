<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('task_log_files', function (Blueprint $table) {
            $table->bigInteger('raw_chars')->default(0)->after('size')->comment('原始日志字符数');
        });
    }

    public function down()
    {
        Schema::table('task_log_files', function (Blueprint $table) {
            $table->dropColumn('raw_chars');
        });
    }
};
