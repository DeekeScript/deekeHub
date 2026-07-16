<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        DB::table('admin_users')->insert([
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'name' => '超级管理员',
            'phone' => '13800000000',
            'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
