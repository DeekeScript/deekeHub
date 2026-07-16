import { deviceOrderList } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { ShoppingOutlined } from '@ant-design/icons';
import { Tag, Button } from 'antd';
import { useRef, useState } from 'react';
import { useModel } from 'umi';
import PurchaseModal from '@/components/PurchaseModal';
import PayQRModal from '@/components/PayQRModal';

const statusMap: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '待支付' },
  1: { color: 'green', text: '已支付' },
  2: { color: 'red', text: '已取消' },
};

const typeMap: Record<string, { color: string; text: string }> = {
  trial: { color: 'blue', text: '首次赠送' },
  purchase: { color: 'default', text: '购买' },
};

export default () => {
  const { initialState } = useModel('@@initialState');
  const isSuperAdmin = initialState?.currentUser?.role_type === 'super_admin';
  const actionRef = useRef<any>();
  const [payModal, setPayModal] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; orderNo: string; totalPrice: number; planName: string }>({ open: false, orderNo: '', totalPrice: 0, planName: '' });

  return (
    <>
      <ProTable
        headerTitle="订单列表"
        rowKey="id"
        actionRef={actionRef}
        request={async (params: any) => {
          const res = await deviceOrderList(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '订单号', dataIndex: 'order_no', ellipsis: true, width: 200 },
          { title: '类型', dataIndex: 'order_type', width: 90, render: (_: any, r: any) => {
            const t = typeMap[r.order_type] || { color: 'default', text: r.order_type || '-' };
            return <Tag color={t.color}>{t.text}</Tag>;
          }},
          { title: '套餐', dataIndex: ['plan', 'name'] },
          { title: '时长', dataIndex: 'plan_duration', width: 130, render: (_: any, r: any) => {
            return r.plan_duration ? <span style={{ color: '#666', fontSize: 13 }}>{r.plan_duration} / 台</span> : '-';
          }},
          { title: '设备数', dataIndex: 'device_count', width: 80 },
          { title: '关联设备', dataIndex: 'device_ids', ellipsis: true, width: 150, render: (_: any, r: any) => {
            const ids = r.device_ids;
            if (!ids || !Array.isArray(ids) || ids.length === 0) return <span style={{ color: '#ccc' }}>-</span>;
            return <span style={{ color: '#666', fontSize: 12 }}>ID: {ids.join(', ')}</span>;
          }},
          { title: '金额', dataIndex: 'total_price', width: 100, render: (_: any, r: any) => r.order_type === 'trial' ? <span style={{ color: '#52c41a' }}>免费</span> : `¥${r.total_price}` },
          { title: '状态', dataIndex: 'status', width: 80, render: (_: any, r: any) => {
            const s = statusMap[r.status] || { color: 'default', text: '-' };
            return <Tag color={s.color}>{s.text}</Tag>;
          }, valueEnum: { 0: '待支付', 1: '已支付', 2: '已取消' } },
          { title: '支付时间', dataIndex: 'paid_at', valueType: 'dateTime', width: 170 },
          { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
          { title: '操作', valueType: 'option' as const, width: 80,
            render: (_: any, r: any) => r.status === 0 && r.order_type === 'purchase' ? (
              <Button size="small" type="primary" onClick={() => setQrModal({ open: true, orderNo: r.order_no, totalPrice: r.total_price, planName: r.plan?.name || '' })}>支付</Button>
            ) : null,
          },
        ]}
        toolBarRender={() => !isSuperAdmin ? [
          <Button key="buy" type="primary" icon={<ShoppingOutlined />} onClick={() => setPayModal(true)}>购买套餐</Button>,
        ] : undefined}
      />

      <PurchaseModal open={payModal} onClose={() => setPayModal(false)} onPaid={() => actionRef.current?.reload()} />
      <PayQRModal {...qrModal} orderType="device" onClose={() => setQrModal(prev => ({ ...prev, open: false }))} onPaid={() => actionRef.current?.reload()} />
    </>
  );
};
