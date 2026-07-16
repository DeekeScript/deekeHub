<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::dropIfExists('task_logs');
    }

    public function down()
    {
        // 不需要回滚，因为日志现在写入文件
    }
};
