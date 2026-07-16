<?php

namespace App\Http\Controllers;

use App\Models\Option;
use App\Models\Order;
use App\Models\Developer;
use App\Models\DeviceOrder;
use App\Models\FrameOrder;
use App\Models\CardKey;
use App\Models\Device;
use Alipay\EasySDK\Kernel\Factory;
use Alipay\EasySDK\Kernel\Config;
use Alipay\EasySDK\Kernel\Util\ResponseChecker;
use Alipay\EasySDK\Kernel\Util\AntCertificationUtil;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class AlipayController extends Controller
{
    protected $config;

    private static function cleanKey($key)
    {
        if (empty($key)) return '';
        $key = preg_replace('/-----BEGIN.*?-----/', '', $key);
        $key = preg_replace('/-----END.*?-----/', '', $key);
        $key = preg_replace('/\s+/', '', $key);
        return trim($key);
    }

    public static function getOptions(): Config
    {
        $globalSetting = Option::getGlobalSetting();
        $appUrl = 'https://home.deeke.top';
        $appId = $globalSetting['alipay_app_id'] ?? '';

        if (empty($appId)) {
            throw new \Exception('支付宝应用ID未配置');
        }

        $config = new Config();
        $config->protocol = 'https';
        $config->gatewayHost = 'openapi.alipay.com';
        $config->appId = $appId;
        $config->signType = $globalSetting['alipay_sign_type'] ?? 'RSA2';
        $config->notifyUrl = $globalSetting['alipay_notify_url'] ?? ($appUrl . '/deeke/alipay/notify');
        $config->ignoreSSL = false;

        $alipayCertPath = public_path('alipay/alipayCertPublicKey_RSA2.crt');
        $alipayRootCertPath = public_path('alipay/alipayRootCert.crt');
        $merchantCertPath = public_path('alipay/appCertPublicKey_' . $appId . '.crt');
        $merchantPrivateKeyPath = public_path('alipay/merchant_private_key.pem');

        foreach ([$alipayCertPath, $alipayRootCertPath, $merchantCertPath, $merchantPrivateKeyPath] as $path) {
            if (!file_exists($path)) {
                throw new \Exception('支付宝证书文件不存在：' . $path);
            }
        }

        $config->alipayCertPath = $alipayCertPath;
        $config->alipayRootCertPath = $alipayRootCertPath;
        $config->merchantCertPath = $merchantCertPath;
        $config->merchantPrivateKey = self::cleanKey(file_get_contents($merchantPrivateKeyPath));

        $antCertUtil = new AntCertificationUtil();
        $config->alipayPublicKey = $antCertUtil->getPublicKey($alipayCertPath);
        $config->merchantCertSN = $antCertUtil->getCertSN($merchantCertPath);
        $config->alipayRootCertSN = $antCertUtil->getRootCertSN($alipayRootCertPath);

        return $config;
    }

    public function __construct()
    {
        $this->config = $this->getOptions();
        Factory::setOptions($this->config);
    }

    // ==================== 开发者平台订单 ====================

    /**
     * 创建设备套餐订单（开发者购买设备数）
     */
    public function createDeviceOrder(Request $request): JsonResponse
    {
        try {
            $outTradeNo = date('YmdHis') . mt_rand(1000, 9999);
            $goodsName = $request->get('goods_name', '设备套餐');
            $totalAmount = (string)$request->get('total_amount', 0.01);

            if (empty($request->get('developer_id')) || $totalAmount < 0.01) {
                return $this->error(['msg' => '参数不正确']);
            }

            $result = Factory::payment()->app()->pay($goodsName, $outTradeNo, $totalAmount);

            $order = new DeviceOrder(); $order->order_type = DeviceOrder::ORDER_TYPE_PURCHASE;
            $order->order_no = $outTradeNo;
            $order->developer_id = $request->get('developer_id');
            $order->plan_id = $request->get('plan_id');
            $order->device_count = (int)$request->get('device_count', 1);
            $order->total_price = $totalAmount;
            $order->status = 0;
            $order->save();

            return $this->success(['params' => $result->body, 'order_no' => $outTradeNo]);
        } catch (Exception $e) {
            Log::error('创建设备订单失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '调用失败：' . $e->getMessage()]);
        }
    }

    /**
     * 创建额度套餐订单（开发者购买额度）
     */
    public function createFrameOrder(Request $request): JsonResponse
    {
        try {
            $outTradeNo = date('YmdHis') . mt_rand(1000, 9999);
            $goodsName = $request->get('goods_name', '额度套餐');
            $totalAmount = (string)$request->get('total_amount', 0.01);

            $result = Factory::payment()->app()->pay($goodsName, $outTradeNo, $totalAmount);

            $order = new FrameOrder(); $order->order_type = FrameOrder::ORDER_TYPE_PURCHASE;
            $order->order_no = $outTradeNo;
            $order->developer_id = $request->get('developer_id');
            $order->plan_id = $request->get('plan_id');
            $order->frame_count = (int)$request->get('frame_count', 0) * 1073741824; // GB → bytes
            $order->total_price = $totalAmount;
            $order->status = 0;
            $order->save();

            return $this->success(['params' => $result->body, 'order_no' => $outTradeNo]);
        } catch (Exception $e) {
            Log::error('创建额度订单失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '调用失败：' . $e->getMessage()]);
        }
    }

    /**
     * 创建扫码支付订单
     */
    public function createScanOrder(Request $request): JsonResponse
    {
        try {
            Factory::setOptions($this->getOptions());

            $outTradeNo = date('YmdHis') . mt_rand(1000, 9999);
            $goodsName = $request->get('goods_name', '设备套餐');
            $totalAmount = (string)$request->get('total_amount', 0.01);

            if (empty($request->get('developer_id')) || $totalAmount < 0.01) {
                return $this->error(['msg' => '参数不正确']);
            }

            $result = Factory::payment()->faceToFace()->preCreate($goodsName, $outTradeNo, $totalAmount);

            if (!empty($result->code) && $result->code !== '10000') {
                return $this->error(['msg' => $result->subMsg ?: $result->msg ?: '支付宝预下单失败']);
            }

            $orderType = $request->get('order_type', 'device');
            if ($orderType === 'frame') {
                $order = new FrameOrder(); $order->order_type = FrameOrder::ORDER_TYPE_PURCHASE;
                $order->frame_count = (int)$request->get('frame_count', 0) * 1073741824; // GB → bytes
            } else {
                $order = new DeviceOrder(); $order->order_type = DeviceOrder::ORDER_TYPE_PURCHASE;
                $order->device_count = (int)$request->get('device_count', 1);
            }
            $order->order_no = $outTradeNo;
            $order->developer_id = $request->get('developer_id');
            $order->plan_id = $request->get('plan_id');
            $order->total_price = $totalAmount;
            $order->status = 0;
            $order->save();

            return $this->success(['qr_code' => $result->qrCode, 'order_no' => $outTradeNo]);
        } catch (Exception $e) {
            Log::error('创建扫码订单失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '调用失败：' . $e->getMessage()]);
        }
    }

    /**
     * 已有订单生成支付二维码
     */
    public function payOrder(Request $request): JsonResponse
    {
        try {
            Factory::setOptions($this->getOptions());

            $orderNo = $request->get('order_no', '');
            $orderType = $request->get('order_type', 'device');

            if ($orderType === 'frame') {
                $order = FrameOrder::where('order_no', $orderNo)->first();
            } else {
                $order = DeviceOrder::where('order_no', $orderNo)->first();
            }

            if (!$order) return $this->error(['msg' => '订单不存在']);
            if ($order->status != 0) return $this->error(['msg' => '订单状态不允许支付']);

            $goodsName = $order->plan ? $order->plan->name : '订单支付';
            $totalAmount = (string)$order->total_price;

            $result = Factory::payment()->faceToFace()->preCreate($goodsName, $orderNo, $totalAmount);

            if (!empty($result->code) && $result->code !== '10000') {
                return $this->error(['msg' => $result->subMsg ?: $result->msg ?: '支付宝预下单失败']);
            }

            return $this->success(['qr_code' => $result->qrCode, 'order_no' => $orderNo]);
        } catch (Exception $e) {
            Log::error('生成支付二维码失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '调用失败：' . $e->getMessage()]);
        }
    }

    // ==================== 支付宝回调 ====================

    public function returnUrl(Request $request)
    {
        try {
            Factory::setOptions($this->getOptions());
            $data = $request->all();
            $isValid = Factory::payment()->common()->verifyNotify($data);

            if (!$isValid) {
                Log::error('支付宝同步回调签名验证失败', $data);
                return redirect('/?error=签名验证失败');
            }

            $tradeStatus = $data['trade_status'] ?? '';
            $outTradeNo = $data['out_trade_no'] ?? '';

            if ($tradeStatus == 'TRADE_SUCCESS' || $tradeStatus == 'TRADE_FINISHED') {
                Log::info('支付宝支付成功（同步回调）', ['out_trade_no' => $outTradeNo]);
                return redirect('/?success=支付成功&order_no=' . $outTradeNo);
            }

            return redirect('/?status=' . $tradeStatus);
        } catch (Exception $e) {
            Log::error('支付宝同步回调处理异常', ['error' => $e->getMessage()]);
            return redirect('/?error=处理异常');
        }
    }

    public function notify(Request $request)
    {
        $logData = [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'post_data' => $request->post(),
            'get_data' => $request->query(),
            'ip' => $request->ip(),
            'timestamp' => date('Y-m-d H:i:s'),
        ];
        Log::info('支付宝支付回调', $logData);

        try {
            Factory::setOptions($this->getOptions());
            $data = $request->post();

            if (!Factory::payment()->common()->verifyNotify($data)) {
                Log::error('支付宝异步通知签名验证失败', ['out_trade_no' => $data['out_trade_no'] ?? '']);
                return 'fail';
            }

            $outTradeNo = $data['out_trade_no'] ?? '';
            $tradeStatus = $data['trade_status'] ?? '';

            if ($tradeStatus !== 'TRADE_SUCCESS' && $tradeStatus !== 'TRADE_FINISHED') {
                return 'success';
            }

            // 尝试匹配 DeviceOrder
            $deviceOrder = DeviceOrder::where('order_no', $outTradeNo)->first();
            if ($deviceOrder) {
                return $this->handleDeviceOrderPaid($deviceOrder, $data);
            }

            // 尝试匹配 FrameOrder
            $frameOrder = FrameOrder::where('order_no', $outTradeNo)->first();
            if ($frameOrder) {
                return $this->handleFrameOrderPaid($frameOrder, $data);
            }

            // 兼容旧订单表
            $oldOrder = Order::where('order_no', $outTradeNo)->first();
            if ($oldOrder) {
                return $this->handleOldOrderPaid($oldOrder, $data);
            }

            Log::error('支付宝异步通知：未找到对应订单', ['out_trade_no' => $outTradeNo]);
            return 'fail';
        } catch (Exception $e) {
            Log::error('支付宝异步通知处理异常', ['error' => $e->getMessage()]);
            return 'fail';
        }
    }

    private function handleDeviceOrderPaid(DeviceOrder $order, array $data): string
    {
        if ($order->status == 1) return 'success';

        DB::transaction(function () use ($order) {
            $order->status = 1;
            $order->paid_at = now();
            $order->save();

            $plan = $order->plan;
            $days = 30; // default 1 month
            if ($plan) {
                switch ($plan->billing_cycle) {
                    case 'day': $days = 1; break;
                    case 'month': $days = 30; break;
                    case 'year': $days = 365; break;
                }
                $days = $days * max(1, (int)($plan->unit_count ?? 1));
                $days += (int)($plan->bonus_days ?? 0);
            }
            $expiredAt = now()->addDays($days);

            // 续费：延长已有设备
            $deviceIds = $order->device_ids;
            if (!empty($deviceIds)) {
                Device::whereIn('id', $deviceIds)
                    ->where('developer_id', $order->developer_id)
                    ->each(function ($device) use ($days) {
                        $base = $device->expired_at && $device->expired_at->isFuture()
                            ? $device->expired_at->copy()
                            : now();
                        $device->expired_at = $base->addDays($days);
                        $device->save();
                    });
                Log::info('设备续费成功', ['order_no' => $order->order_no, 'device_ids' => $deviceIds, 'days' => $days]);
                return;
            }

            // 新购：根据套餐quota创建设备（单位：台），quota为0时降级取订单device_count
            $count = ($plan && $plan->quota > 0) ? max(1, (int)$plan->quota) : max(1, (int)$order->device_count);
            $newDeviceIds = [];
            for ($i = 0; $i < $count; $i++) {
                $keyCode = strtoupper(substr(md5(uniqid() . $order->developer_id . $i . time()), 0, 16));
                CardKey::create([
                    'developer_id' => $order->developer_id,
                    'key_code' => $keyCode,
                    'status' => CardKey::STATUS_UNUSED,
                ]);
                $device = Device::create([
                    'developer_id' => $order->developer_id,
                    'name' => '未命名设备',
                    'card_key' => $keyCode,
                    'status' => Device::STATUS_PENDING,
                    'view_quality' => 10,
                    'expired_at' => $expiredAt,
                ]);
                $newDeviceIds[] = $device->id;
            }
            $order->device_ids = $newDeviceIds;
            $order->save();
        });

        Log::info('设备订单支付成功', ['order_no' => $order->order_no, 'developer_id' => $order->developer_id]);
        return 'success';
    }

    private function handleFrameOrderPaid(FrameOrder $order, array $data): string
    {
        if ($order->status == 1) return 'success';

        DB::transaction(function () use ($order) {
            $order->status = 1;
            $order->paid_at = now();
            $order->save();

            // 创建额度池子（含过期时间）
            $developer = Developer::find($order->developer_id);
            if ($developer) {
                $days = 30;
                $plan = $order->plan;
                if ($plan) {
                    switch ($plan->billing_cycle) {
                        case 'day': $days = 1; break;
                        case 'month': $days = 30; break;
                        case 'year': $days = 365; break;
                    }
                    $days = $days * max(1, (int)($plan->unit_count ?? 1));
                    $days += (int)($plan->bonus_days ?? 0);
                }
                $expiredAt = now()->addDays($days);

                // 套餐quota单位为GB，转为bytes存储；quota为0时降级取订单frame_count（兼容试用等场景）
                $frameBytes = ($plan && $plan->quota > 0)
                    ? (int)($plan->quota * 1073741824)
                    : (int)$order->frame_count;

                \App\Models\FrameBalancePool::create([
                    'developer_id' => $order->developer_id,
                    'amount'       => $frameBytes,
                    'remaining'    => $frameBytes,
                    'expired_at'   => $expiredAt,
                    'created_at'   => now(),
                ]);

                // 同步订单frame_count为bytes，确保前端展示一致
                $order->frame_count = $frameBytes;
                $order->save();

                $developer->total_points += $frameBytes;
                $developer->save();
                \App\Models\FrameBalancePool::syncDeveloperBalance($order->developer_id);
            }
        });

        Log::info('额度订单支付成功', ['order_no' => $order->order_no, 'developer_id' => $order->developer_id]);
        return 'success';
    }

    private function handleOldOrderPaid(Order $order, array $data): string
    {
        if ($order->status == 1) return 'success';

        $order->status = 1;
        $order->save();

        Log::info('旧订单支付成功（兼容）', ['order_no' => $order->order_no]);
        return 'success';
    }

    // ==================== 兼容旧支付宝接口 ====================

    public function createOrder(Request $request): JsonResponse
    {
        try {
            $outTradeNo = date('YmdHis') . mt_rand(1000, 9999);
            $goodsName = $request->get('goods_name', '设备套餐');
            $totalAmount = (string)$request->get('total_amount', 0.01);

            if (empty($request->get('android_id'))) {
                return $this->error(['msg' => '参数不正确']);
            }

            $result = Factory::payment()->app()->pay($goodsName, $outTradeNo, $totalAmount);

            $order = new Order();
            $order->order_no = $outTradeNo;
            $order->total_amount = $totalAmount;
            $order->goods_name = $goodsName;
            $order->android_id = $request->get('android_id', '');
            $order->status = 0;
            $order->save();

            return $this->success(['params' => $result->body, 'order_no' => $outTradeNo]);
        } catch (Exception $e) {
            Log::error('创建支付宝订单失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '调用失败：' . $e->getMessage()]);
        }
    }

    public function getToken(Request $request): JsonResponse
    {
        try {
            $androidId = $request->post('android_id') ?: $request->get('android_id');
            if (empty($androidId)) {
                return $this->error(['msg' => 'android_id不能为空']);
            }

            // 查找激活该设备的卡密
            $cardKey = CardKey::where('used_device_id', function ($q) use ($androidId) {
                $q->select('id')->from('devices')->where('android_id', $androidId)->limit(1);
            })->where('status', CardKey::STATUS_USED)->first();

            if (!$cardKey) {
                return $this->error(['msg' => '设备未找到有效卡密']);
            }

            return $this->success(['token' => $cardKey->key_code]);
        } catch (Exception $e) {
            Log::error('获取token失败', ['error' => $e->getMessage()]);
            return $this->error(['msg' => '获取失败']);
        }
    }

    // success/error 方法继承自 Controller
}
