<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Option extends Model
{
    protected $table = 'options';
    protected $fillable = ['key', 'value', 'remark'];

    public static function getValue(string $key, $default = null)
    {
        $option = static::where('key', $key)->first();
        return $option ? $option->value : $default;
    }

    public static function setValue(string $key, $value, string $remark = null): void
    {
        $data = ['value' => $value];
        if ($remark !== null) {
            $data['remark'] = $remark;
        }
        static::updateOrCreate(['key' => $key], $data);
    }

    public static function getAllAsArray(): array
    {
        return static::pluck('value', 'key')->toArray();
    }

    /** @deprecated 兼容旧代码，请使用 getValue / getAllAsArray */
    public static function getGlobalSetting(): array
    {
        static $cached = null;
        if ($cached === null) {
            $cached = static::pluck('value', 'key')->toArray();
        }
        return $cached;
    }
}
