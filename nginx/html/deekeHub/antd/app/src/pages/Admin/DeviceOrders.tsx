import { adminDeviceOrders } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { useRef } from 'react';

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
  const actionRef = useRef<any>();
  return (
    <ProTable
      headerTitle="设备订单"
      actionRef={actionRef}
      rowKey="id"
      request={async (params: any) => {
        const res = await adminDeviceOrders.list(params);
        return { data: res.data || [], total: res.total || 0, success: true };
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '订单号', dataIndex: 'order_no', ellipsis: true },
        { title: '类型', dataIndex: 'order_type', render: (_: any, r: any) => {
          const t = typeMap[r.order_type] || { color: 'default', text: r.order_type || '-' };
          return <Tag color={t.color}>{t.text}</Tag>;
        }},
        { title: '开发者', dataIndex: ['developer', 'name'] },
        { title: '套餐', dataIndex: ['plan', 'name'] },
        { title: '设备数', dataIndex: 'device_count' },
        { title: '金额', dataIndex: 'total_price', render: (_: any, r: any) => r.order_type === 'trial' ? <span style={{ color: '#52c41a' }}>免费</span> : `¥${r.total_price}` },
        { title: '支付方式', dataIndex: 'pay_type' },
        { title: '状态', dataIndex: 'status', render: (_: any, r: any) => {
          const s = statusMap[r.status] || { color: 'default', text: '-' };
          return <Tag color={s.color}>{s.text}</Tag>;
        }},
        { title: '支付时间', dataIndex: 'paid_at', valueType: 'dateTime' },
        { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
      ]}
    />
  );
};
