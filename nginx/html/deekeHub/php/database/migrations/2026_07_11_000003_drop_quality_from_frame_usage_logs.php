<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasColumn('frame_usage_logs', 'quality')) {
            Schema::table('frame_usage_logs', function ($table) {
                $table->dropColumn('quality');
            });
        }
    }

    public function down()
    {
        if (!Schema::hasColumn('frame_usage_logs', 'quality')) {
            Schema::table('frame_usage_logs', function ($table) {
                $table->string('quality', 100)->nullable()->after('device_id')->comment('画质CSV');
            });
        }
    }
};
