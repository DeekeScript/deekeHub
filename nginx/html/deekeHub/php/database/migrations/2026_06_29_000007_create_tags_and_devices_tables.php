<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('owner_id')->comment('所有者ID');
            $table->string('owner_type', 20)->comment('所有者类型: developer/user');
            $table->string('name', 64)->comment('标签名称');
            $table->string('color', 20)->default('#1890ff')->comment('标签颜色');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['owner_id', 'owner_type'], 'idx_owner');
        });

        Schema::create('device_tag', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('device_id');
            $table->unsignedBigInteger('tag_id');
            $table->unique(['device_id', 'tag_id']);
            $table->index('device_id');
            $table->index('tag_id');
        });

        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('developer_id')->comment('所属开发者ID');
            $table->unsignedBigInteger('user_id')->nullable()->comment('所属运营ID');
            $table->string('android_id', 64)->nullable()->unique()->comment('Android设备唯一ID');
            $table->string('name', 128)->nullable()->comment('设备别名');
            $table->string('remark', 255)->nullable()->comment('备注');
            $table->string('model', 64)->nullable()->comment('机型');
            $table->string('brand', 64)->nullable()->comment('品牌');
            $table->string('android_version', 16)->nullable()->comment('Android版本');
            $table->tinyInteger('status')->default(0)->comment('状态: 0=离线, 1=在线, 2=忙碌');
            $table->string('card_key', 64)->nullable()->comment('激活卡密');
            $table->string('livekit_room_name', 128)->nullable()->comment('LiveKit房间名');
            $table->string('livekit_participant_sid', 128)->nullable()->comment('LiveKit参与者SID');
            $table->tinyInteger('view_quality')->default(30)->comment('查看画质: 5=流畅, 10=清晰, 30=高清');
            $table->timestamp('expired_at')->nullable()->comment('设备过期时间');
            $table->timestamp('last_seen_at')->nullable()->comment('最后在线时间');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['developer_id', 'user_id'], 'idx_dev_user');
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('device_tag');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('tags');
    }
};
