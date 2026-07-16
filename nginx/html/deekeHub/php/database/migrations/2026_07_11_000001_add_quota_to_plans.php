<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('plans') && !Schema::hasColumn('plans', 'quota')) {
            Schema::table('plans', function ($table) {
                $table->decimal('quota', 12, 2)->default(0)->after('unit_count')->comment('配额');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('plans', 'quota')) {
            Schema::table('plans', function ($table) {
                $table->dropColumn('quota');
            });
        }
    }
};
