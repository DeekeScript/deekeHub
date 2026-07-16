<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_no', 'total_amount', 'goods_name', 'android_id', 'status', 
        'created_at', 'updated_at'
    ];


    public function add(array $params)
    {
        try {
            $model = new self();
            $model->order_no = $params['order_no'] ?? '';
            $model->total_amount = $params['total_amount'] ?? 0;
            $model->goods_name = $params['goods_name'] ?? '';
            $model->android_id = $params['android_id'] ?? '';
            $model->status = 0;
            $model->save();
            return ['code' => 0, 'msg' => '成功'];
        } catch (\Exception $e) {
            return ['code' => 1, 'msg' => $e->getMessage()];
        }
    }
}

