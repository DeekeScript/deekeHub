<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasColumn('developers', 'max_users')) {
            Schema::table('developers', function ($table) {
                $table->dropColumn('max_users');
            });
        }
    }

    public function down()
    {
        if (!Schema::hasColumn('developers', 'max_users')) {
            Schema::table('developers', function ($table) {
                $table->integer('max_users')->default(0)->comment('最大运营数');
            });
        }
    }
};
