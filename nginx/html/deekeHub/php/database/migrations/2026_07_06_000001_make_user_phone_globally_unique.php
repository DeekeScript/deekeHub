<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // 幂等：旧复合唯一键可能已被删除，新手机号唯一键可能已存在
        try { DB::statement('ALTER TABLE users DROP INDEX uk_developer_phone'); } catch (\Exception $e) {}
        try { DB::statement('ALTER TABLE users ADD UNIQUE INDEX uk_phone (phone)'); } catch (\Exception $e) {}
    }

    public function down()
    {
        try { DB::statement('ALTER TABLE users DROP INDEX uk_phone'); } catch (\Exception $e) {}
        try { DB::statement('ALTER TABLE users ADD UNIQUE INDEX uk_developer_phone (developer_id, phone)'); } catch (\Exception $e) {}
    }
};
