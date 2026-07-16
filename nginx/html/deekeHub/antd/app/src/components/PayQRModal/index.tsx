import { request } from 'umi';
import { Button, Image, message, Modal, Space, Spin } from 'antd';
import { useState } from 'react';

interface Props {
  open: boolean;
  orderNo: string;
  orderType: 'device' | 'frame';
  totalPrice: number;
  planName?: string;
  onClose: () => void;
  onPaid?: () => void;
}

export default ({ open, orderNo, orderType, totalPrice, planName, onClose, onPaid }: Props) => {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const fetchQr = async () => {
    setLoading(true);
    try {
      const res = await request<API.ApiResponse>('/api/alipay/payOrder', {
        method: 'POST',
        data: { order_no: orderNo, order_type: orderType },
      });
      if (res.code === 0) setQrCode(res.data.qr_code || '');
    } catch (_) {}
    setLoading(false);
  };

  // 每次打开重新获取二维码
  if (open && !qrCode && !loading) fetchQr();

  const handleConfirm = async () => {
    setChecking(true);
    try {
      const res = await request<API.ApiResponse>('/api/device-orders/status', { params: { order_no: orderNo } });
      if (res.code === 0 && res.data?.paid) {
        message.success('支付成功');
        onClose();
        onPaid?.();
        return;
      }
    } catch (_) {}
    setTimeout(async () => {
      try {
        const res2 = await request<API.ApiResponse>('/api/device-orders/status', { params: { order_no: orderNo } });
        if (res2.code === 0 && res2.data?.paid) {
          message.success('支付成功');
          onClose();
          onPaid?.();
          return;
        }
      } catch (_) {}
      setChecking(false);
    }, 3000);
  };

  const handleClose = () => {
    setQrCode('');
    onClose();
  };

  return (
    <Modal open={open} onCancel={handleClose} centered width={400} maskClosable={false} destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleClose}>取消</Button>,
        <Button key="pay" type="primary" loading={checking} onClick={handleConfirm}>已支付</Button>,
      ]}>
      <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontWeight: 600 }}>{planName || '订单支付'}</div>
        <div>金额: &yen;{totalPrice}</div>
        <Spin spinning={loading}>
          {qrCode && (qrCode.startsWith('http')
            ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrCode)}`}
              alt="支付二维码" style={{ maxWidth: 260, border: '1px solid #f0f0f0', borderRadius: 8 }} />
            : <Image src={`data:image/png;base64,${qrCode}`} preview={false} style={{ maxWidth: 260 }} />
          )}
        </Spin>
        <div style={{ color: '#999', fontSize: 12 }}>请使用支付宝扫码支付</div>
      </Space>
    </Modal>
  );
};
