import { plans, currentUser } from '@/services/api/api';
import { Button, Card, Col, Image, message, Modal, Radio, Row, Space, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { request } from 'umi';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
  defaultType?: 'device' | 'frame';
}

const planLabel = (p: any): string => {
  const cycleMap: Record<string, string> = { day: '天', month: '月', year: '年' };
  const unit = cycleMap[p.billing_cycle] || '月';
  if (p.type === 'frame') {
    return `总流量：${p.unit_count}GB，时长：1${unit}`;
  }
  return `设备数：${p.unit_count || 1}台，时长：1${unit}`;
};

export default function PurchaseModal({ open, onClose, onPaid, defaultType }: Props) {
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [devId, setDevId] = useState<number>(0);
  const [payType, setPayType] = useState<'device' | 'frame'>('device');
  const [flowStep, setFlowStep] = useState<'select' | 'qrcode'>('select');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([plans.list(), currentUser()]).then(([planRes, userRes]) => {
        const plans = planRes.code === 0 ? (planRes.data || []).filter((p: any) => p.status === 1) : [];
        setAllPlans(plans);
        if (userRes.code === 0) setDevId(userRes.data.id);
        const type = defaultType || 'device';
        setPayType(type);
        const first = plans.find((p: any) => p.type === type || !p.type);
        setSelectedPlan(first || null);
        setFlowStep('select');
        setQrCode(null);
      });
    }
  }, [open]);

  const filteredPlans = allPlans.filter((p: any) => p.type === payType || !p.type);

  const handleGenerateQr = async () => {
    if (!selectedPlan) return;
    setQrLoading(true);
    try {
      const res = await request<API.ApiResponse>('/api/alipay/createScanOrder', {
        method: 'POST',
        data: {
          goods_name: selectedPlan.name,
          total_amount: selectedPlan.price,
          developer_id: devId,
          plan_id: selectedPlan.id,
          order_type: payType,
          device_count: payType === 'device' ? selectedPlan.quota : undefined,
          frame_count: payType === 'frame' ? selectedPlan.quota : undefined,
        },
      });
      if (res.code === 0) {
        setQrCode(res.data.qr_code);
        setOrderNo(res.data.order_no || '');
        setFlowStep('qrcode');
      }
    } catch {}
    setQrLoading(false);
  };

  const checkOrderStatus = async (order: string) => {
    const check = await request<API.ApiResponse>('/api/device-orders/status', { params: { order_no: order } });
    if (check.code === 0 && check.data.paid) {
      message.success('支付成功');
      onClose();
      onPaid?.();
      return true;
    }
    return false;
  };

  const handleConfirmPay = async () => {
    setChecking(true);
    if (await checkOrderStatus(orderNo)) return;
    setTimeout(async () => {
      if (await checkOrderStatus(orderNo)) return;
      setChecking(false);
    }, 3000);
  };

  const handleClose = () => {
    setQrCode(null);
    setFlowStep('select');
    onClose();
  };

  return (
    <Modal
      title={flowStep === 'select' ? '购买套餐' : '扫码支付'}
      open={open}
      onCancel={handleClose}
      footer={flowStep === 'qrcode' ? [
        <Button key="cancel" onClick={handleClose}>取消</Button>,
        <Button key="pay" type="primary" loading={checking} onClick={handleConfirmPay}>已支付</Button>,
      ] : null}
      width={flowStep === 'qrcode' ? 400 : 640}
      centered
      maskClosable={false}
      destroyOnClose
    >
      {flowStep === 'select' ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio.Group value={payType} onChange={(e) => {
            setPayType(e.target.value);
            const first = allPlans.find((p: any) => p.type === e.target.value || !p.type);
            setSelectedPlan(first || null);
          }} buttonStyle="solid" style={{ marginBottom: 16 }}>
            <Radio.Button value="device">设备套餐</Radio.Button>
            <Radio.Button value="frame">实时画面额度套餐</Radio.Button>
          </Radio.Group>
          {filteredPlans.length === 0 ? (
            <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 16 }}>暂无可用套餐</Text>
          ) : (
            <Row gutter={[12, 12]} style={{ maxHeight: 360, overflowY: 'auto' }}>
              {filteredPlans.map((p: any) => (
                <Col key={p.id} span={12}>
                  <Card hoverable size="small"
                    style={{ border: selectedPlan?.id === p.id ? '2px solid #1677ff' : '1px solid #f0f0f0' }}
                    onClick={() => setSelectedPlan(p)}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    <div style={{ color: '#666', fontSize: 12, margin: '4px 0' }}>
                      {p.slogan || planLabel(p)}
                    </div>
                    {p.bonus_days > 0 && <div style={{ color: '#52c41a', fontSize: 12 }}>赠送 {p.bonus_days} 天</div>}
                    <div style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 700 }}>&yen;{p.price}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
          <Button type="primary" size="large" block disabled={!selectedPlan}
            onClick={handleGenerateQr} loading={qrLoading} style={{ marginTop: 16 }}>
            确认支付 &yen;{selectedPlan?.price || '--'}
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <Text strong>{payType === 'device' ? '设备套餐' : '实时画面额度套餐'}: {selectedPlan?.name}</Text>
          <Text>金额: &yen;{selectedPlan?.price}</Text>
          <Spin spinning={qrLoading}>
            {qrCode && (
              qrCode.startsWith('http')
                ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrCode)}`} alt="支付二维码" style={{ maxWidth: 260, border: '1px solid #f0f0f0', borderRadius: 8 }} />
                : <Image src={`data:image/png;base64,${qrCode}`} preview={false} style={{ maxWidth: 260 }} />
            )}
          </Spin>
          <Text type="secondary">请使用支付宝扫码支付</Text>
          <Button type="link" onClick={() => { setFlowStep('select'); setQrCode(null); }}>返回重新选择</Button>
        </Space>
      )}
    </Modal>
  );
}
