import { frameUsageStats, frameUsageList, adminFrameOrders, developerFrameOrderList, frameOrderList } from '@/services/api/api';
import { ProCard, ProTable, StatisticCard } from '@ant-design/pro-components';
import { useEffect, useRef, useState } from 'react';
import { Col, Row, Spin, Tabs, Tag, Button } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useModel } from 'umi';
import { fmtSeconds, fmtGB } from '@/utils/constants';
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

const FrameOrdersTab: React.FC<{ roleType?: string }> = ({ roleType }) => {
  const actionRef = useRef<any>();
  const [qrModal, setQrModal] = useState<{ open: boolean; orderNo: string; totalPrice: number; planName: string }>({ open: false, orderNo: '', totalPrice: 0, planName: '' });
  const requestFn = roleType === 'super_admin'
    ? (params: any) => adminFrameOrders.list(params)
    : roleType === 'developer'
      ? (params: any) => developerFrameOrderList(params)
      : (params: any) => frameOrderList(params);

  return (
    <>
      <ProTable
        headerTitle="实时画面额度订单"
        actionRef={actionRef}
        rowKey="id"
        request={async (params: any) => {
          const res = await requestFn(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '订单号', dataIndex: 'order_no', ellipsis: true },
          { title: '类型', dataIndex: 'order_type', render: (_: any, r: any) => {
            const t = typeMap[r.order_type] || { color: 'default', text: r.order_type || '-' };
            return <Tag color={t.color}>{t.text}</Tag>;
          }},
          { title: '套餐', dataIndex: ['plan', 'name'] },
          { title: '实时画面额度', dataIndex: 'frame_count', render: (_: any, r: any) => fmtGB(r.frame_count) },
          { title: '金额', dataIndex: 'total_price', render: (_: any, r: any) => r.order_type === 'trial' ? <span style={{ color: '#52c41a' }}>免费</span> : `¥${r.total_price}` },
          { title: '状态', dataIndex: 'status', render: (_: any, r: any) => {
            const s = statusMap[r.status] || { color: 'default', text: '-' };
            return <Tag color={s.color}>{s.text}</Tag>;
          }},
          { title: '支付时间', dataIndex: 'paid_at', valueType: 'dateTime' },
          { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
          { title: '操作', valueType: 'option' as const, width: 80,
            render: (_: any, r: any) => r.status === 0 && r.order_type === 'purchase' ? (
              <Button size="small" type="primary" onClick={() => setQrModal({ open: true, orderNo: r.order_no, totalPrice: r.total_price, planName: r.plan?.name || '' })}>支付</Button>
            ) : null,
          },
        ]}
      />
      <PayQRModal {...qrModal} orderType="frame" onClose={() => setQrModal(prev => ({ ...prev, open: false }))} onPaid={() => actionRef.current?.reload()} />
    </>
  );
};

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isDeveloper = roleType === 'developer';
  const isUser = roleType === 'user';

  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const actionRef = useRef<any>();

  useEffect(() => {
    frameUsageStats().then(r => {
      if (r.code === 0) setStats(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <Spin spinning={loading}>
      <StatisticCard.Group style={{ marginBottom: 16 }}>
        <StatisticCard statistic={{ title: '累计消耗画面额度', value: fmtGB(stats.total_points ?? 0), icon: <ThunderboltOutlined /> }} />
        <StatisticCard statistic={{ title: '累计观看时长', value: fmtSeconds(stats.total_seconds ?? 0), icon: <ClockCircleOutlined /> }} />
        {isDeveloper && (
          <StatisticCard statistic={{ title: '本月消耗', value: `${fmtGB(stats.month_points ?? 0)} / ${fmtSeconds(stats.month_seconds ?? 0)}` }} />
        )}
        <StatisticCard statistic={{ title: '实时画面额度', value: fmtGB(stats.balance ?? 0), icon: <ThunderboltOutlined />, style: (stats.balance ?? 0) < 1073741824 ? { color: '#ff4d4f' } : undefined }} />
      </StatisticCard.Group>

      <Tabs defaultActiveKey="usage" items={[
        { key: 'usage', label: '画面额度消耗', children: (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <ProCard title="按设备汇总">
                  <ProTable
                    search={false}
                    options={false}
                    rowKey="device_id"
                    dataSource={stats.by_device || []}
                    pagination={false}
                    columns={[
                      { title: '设备', render: (_: any, r: any) => r.device?.name || r.device?.android_id || '-' },
                      { title: '消耗画面额度', render: (_: any, r: any) => fmtGB(r.total_points), align: 'right' },
                      { title: '观看时长', render: (_: any, r: any) => fmtSeconds(r.total_seconds), align: 'right' },
                      { title: '次数', dataIndex: 'sessions', align: 'right' },
                    ]}
                  />
                </ProCard>
              </Col>
              <Col span={12}>
                <ProCard title="近日消耗（最近30天）">
                  <ProTable
                    search={false}
                    options={false}
                    rowKey="date"
                    dataSource={stats.by_day || []}
                    pagination={{ pageSize: 30 }}
                    columns={[
                      { title: '日期', dataIndex: 'date', align: 'center' },
                      { title: '消耗画面额度', render: (_: any, r: any) => fmtGB(r.total_points), align: 'right' },
                      { title: '观看时长', render: (_: any, r: any) => fmtSeconds(r.total_seconds), align: 'right' },
                      { title: '次数', dataIndex: 'sessions', align: 'right' },
                    ]}
                  />
                </ProCard>
              </Col>
            </Row>
            {(isDeveloper || isUser) && (
              <ProCard title="详细流水" style={{ marginTop: 16 }}>
                <ProTable
                  actionRef={actionRef}
                  rowKey="id"
                  request={async (params: any) => {
                    const res = await frameUsageList({ ...params, pageSize: params.pageSize, current: params.current });
                    return { data: res.data || [], total: res.total || 0, success: true };
                  }}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '设备', render: (_: any, r: any) => r.device?.name || r.device?.android_id || '-' },
                    { title: '消耗画面额度', render: (_: any, r: any) => fmtGB(r.frames_consumed), align: 'right' },
                    { title: '观看时长', render: (_: any, r: any) => r.started_at && r.ended_at ? fmtSeconds(Math.max(1, (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000)) : '-', align: 'right' },
                    { title: '开始时间', dataIndex: 'started_at', valueType: 'dateTime' },
                    { title: '结束时间', dataIndex: 'ended_at', valueType: 'dateTime' },
                  ]}
                />
              </ProCard>
            )}
          </>
        ) },
        { key: 'orders', label: '实时画面额度订单', children: <FrameOrdersTab roleType={roleType} /> },
      ].filter(tab => !(roleType === 'user' && tab.key === 'orders'))} />
    </Spin>
  );
};
