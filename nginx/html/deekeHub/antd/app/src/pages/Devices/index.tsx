import { devices, deviceStatus, deviceUnbind, deviceLivekitViewerToken, deviceSetQuality, deviceUpdateTags, deviceBatchQuality, deviceStreamStart, deviceStreamStop, tags, plans, deviceOrderCreate, checkDeviceOrderStatus } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { EyeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, message, Modal, Radio, Space, Select, Tag, Drawer, Empty, Row, Col, Alert, Form, Input, Popconfirm } from 'antd';
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { useModel } from 'umi';
import LiveViewer from '@/components/LiveViewer';
import DeviceLiveCell from '@/components/LiveViewer/DeviceLiveCell';
import PurchaseModal from '@/components/PurchaseModal';
import { deviceStatusMap, isExpired, qualityOptions, qualityMap, deviceStatusValueEnum, fmtGB } from '@/utils/constants';

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isSuperAdmin = roleType === 'super_admin';
  const isAdmin = isSuperAdmin; // read-only: only view
  const isDeveloper = roleType === 'developer';
  const isUser = roleType === 'user';
  const canWrite = isDeveloper || isUser;

  const actionRef = useRef<any>();
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [tagModal, setTagModal] = useState<{ visible: boolean; deviceId: number; tagIds: number[] }>({ visible: false, deviceId: 0, tagIds: [] });
  const [liveDrawer, setLiveDrawer] = useState<{ visible: boolean; device: any }>({ visible: false, device: null });
  const [liveModal, setLiveModal] = useState<{ visible: boolean; deviceIds: number[] }>({ visible: false, deviceIds: [] });
  const [liveDevicesData, setLiveDevicesData] = useState<any[]>([]);
  const [liveQuality, setLiveQuality] = useState(10);
  const [liveViewer, setLiveViewer] = useState<{ token: string; url: string; room: string } | null>(null);
  const [editModal, setEditModal] = useState<{ visible: boolean; deviceId: number; name: string; remark: string }>({ visible: false, deviceId: 0, name: '', remark: '' });
  const [renewDrawer, setRenewDrawer] = useState<{ visible: boolean; device: any }>({ visible: false, device: null });
  const [planOptions, setPlanOptions] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();
  const [payModal, setPayModal] = useState<{ visible: boolean; qrCode: string; orderNo: string; totalPrice: number; checking: boolean; planName: string; planLabel: string }>({ visible: false, qrCode: '', orderNo: '', totalPrice: 0, checking: false, planName: '', planLabel: '' });

  const [buyModal, setBuyModal] = useState(false);
  const [buyDefaultType, setBuyDefaultType] = useState<'device' | 'frame'>('device');

  const [statusOverride, setStatusOverride] = useState<Record<number, number>>({});
  const [balanceModal, setBalanceModal] = useState(false);

  const checkBalance = (): boolean => {
    const balance = initialState?.currentUser?.device_frame_balance ?? 0;
    if (balance <= 0) {
      setBalanceModal(true);
      return false;
    }
    return true;
  };

  const currentIdsRef = useRef<number[]>([]);

  useEffect(() => {
    tags.list({ pageSize: 200 }).then(res => { if (res.code === 0) setAllTags(res.data || []); });
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      const ids = currentIdsRef.current;
      if (ids.length === 0) return;
      try {
        const res = await deviceStatus(ids);
        if (res.code === 0 && res.data) setStatusOverride(res.data);
      } catch (_) {}
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const fetchPlans = async () => {
    const res = await plans.list();
    if (res.code === 0) setPlanOptions((res.data || []).filter((p: any) => p.type === 'device' && p.status === 1));
  };

  const cycleLabel = (plan: any) => {
    const cycleMap: Record<string, string> = { day: '天', month: '月', year: '年' };
    const unit = cycleMap[plan.billing_cycle] || '月';
    let label = `设备数：${plan.unit_count || 1}台，时长：1${unit}`;
    if (plan.bonus_days) label += `（赠${plan.bonus_days}天）`;
    return label;
  };

  // Build columns dynamically based on role
  const adminExtraColumns = [
    { title: '所属开发者', dataIndex: ['developer', 'name'], render: (_: any, r: any) => r.developer?.name || '-' },
    { title: '所属运营', dataIndex: ['user', 'name'], render: (_: any, r: any) => r.user?.name || '-' },
    { title: '品牌', dataIndex: 'brand' },
    { title: '机型', dataIndex: 'model' },
    { title: 'Android版本', dataIndex: 'android_version' },
  ];

  const devExtraColumns = [
    { title: '激活码', dataIndex: 'card_key', copyable: true, ellipsis: true },
  ];

  const commonColumns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: 'Android ID', dataIndex: 'android_id', copyable: true },
    ...(isAdmin ? adminExtraColumns : [
      {
        title: '设备信息', width: 200,
        render: (_: any, r: any) => {
          const parts = [r.brand, r.model, r.android_version ? `Android ${r.android_version}` : ''].filter(Boolean);
          return parts.length ? <span style={{ color: '#666', fontSize: 12 }}>{parts.join(' / ')}</span> : '-';
        },
      },
    ]),
    {
      title: '标签', dataIndex: 'tags',
      render: (_: any, r: any) => {
        const visibleTags = isUser ? (r.tags || []).filter((t: any) => t.owner_type === 'user') : (r.tags || []);
        return visibleTags.length > 0
          ? <Space size={4} wrap>{visibleTags.map((t: any) => <Tag key={t.id} color={t.color || '#1890ff'}>{t.name}</Tag>)}</Space>
          : <span style={{ color: '#ccc' }}>-</span>;
      },
    },
    ...(isDeveloper ? devExtraColumns : []),
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (_: any, r: any) => r.remark || <span style={{ color: '#ccc' }}>-</span> },
    {
      title: '状态', dataIndex: 'status',
      render: (_: any, r: any) => {
        if (isExpired(r)) return <Tag color="red">已过期</Tag>;
        const status = statusOverride[r.id] !== undefined ? statusOverride[r.id] : r.status;
        const s = deviceStatusMap[status] || { color: 'default', text: '-' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
      valueEnum: deviceStatusValueEnum,
    },
    ...(isAdmin ? [{ title: '画质', dataIndex: 'view_quality', render: (_: any, r: any) => qualityMap[r.view_quality] || '-' }] : []),
    ...(isAdmin ? [{ title: '卡密', dataIndex: 'card_key', ellipsis: true }] : []),
    {
      title: '过期时间', dataIndex: 'expired_at',
      render: (_: any, r: any) => r.expired_at ? <span style={{ color: new Date(r.expired_at) < new Date() ? '#ff4d4f' : undefined }}>{moment(r.expired_at).format('YYYY-MM-DD HH:mm:ss')}</span> : <span style={{ color: '#ccc' }}>-</span>,
    },
    ...(isAdmin ? [{ title: '激活时间', dataIndex: 'created_at', valueType: 'dateTime' }] : []),
    ...(!isAdmin ? [{ title: '最后在线', dataIndex: 'last_seen_at', valueType: 'dateTime' }] : []),
    ...(!isSuperAdmin ? [{
      title: '操作', valueType: 'option' as const, width: 180,
      render: (_: any, record: any) => {
        const row1 = [
          <Button size="small" key="live" onClick={async () => { if (!checkBalance()) return; setLiveDrawer({ visible: true, device: record }); setLiveQuality(record.view_quality || 10); deviceStreamStart(record.id); const res = await deviceLivekitViewerToken(record.id); if (res.code === 0) setLiveViewer(res.data); }}>实时画面</Button>,
          ...(isDeveloper ? [
            <Popconfirm key="unbind" title="确定解绑此设备？" description="解绑后将清除绑定信息" onConfirm={async () => { await deviceUnbind(record.id); message.success('已解绑'); actionRef.current?.reload(); }}>
              <Button size="small" danger>解绑</Button>
            </Popconfirm>,
          ] : []),
        ];
        const row2 = [
          ...(canWrite ? [<Button size="small" key="edit" onClick={() => setEditModal({ visible: true, deviceId: record.id, name: record.name || '', remark: record.remark || '' })}>编辑</Button>] : []),
          ...(isDeveloper || isUser ? [
            <Button size="small" key="tag" onClick={() => {
              const tagIds = isUser
                ? (record.tags || []).filter((t: any) => t.owner_type === 'user').map((t: any) => t.id)
                : (record.tags || []).map((t: any) => t.id);
              setTagModal({ visible: true, deviceId: record.id, tagIds });
            }}>标签</Button>,
          ] : []),
          ...(isDeveloper ? [
            <Button size="small" key="renew" style={{ borderColor: '#faad14', color: '#d48806' }} onClick={() => { fetchPlans(); setSelectedPlanId(undefined); setRenewDrawer({ visible: true, device: record }); }}>续费</Button>,
          ] : []),
        ];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Space size={4}>{row1}</Space>
            <Space size={4}>{row2}</Space>
          </div>
        );
      },
    }] : [{
      title: '操作', valueType: 'option' as const, width: 80,
      render: (_: any, record: any) => (
        <Popconfirm key="del" title="确定删除此设备？" description="删除后设备数据将清除" onConfirm={async () => { await devices.remove(record.id); message.success('已删除'); actionRef.current?.reload(); }}>
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      ),
    }]),
  ];

  const handleBatchLiveView = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先勾选设备'); return; }
    if (!checkBalance()) return;
    const res = await devices.list({ pageSize: 1000 });
    const devs = (res.data || []).filter((d: any) => selectedRowKeys.includes(d.id));
    setLiveDevicesData(devs);
    setLiveModal({ visible: true, deviceIds: selectedRowKeys });
    selectedRowKeys.forEach((id) => deviceStreamStart(id));
  };

  const handleBatchQuality = async (quality: number) => {
    if (selectedRowKeys.length === 0) { message.warning('请先勾选设备'); return; }
    await deviceBatchQuality(selectedRowKeys.map(Number), quality);
    message.success(`已批量设置 ${selectedRowKeys.length} 台设备画质`);
    setSelectedRowKeys([]);
    actionRef.current?.reload();
  };

  const handleSaveTags = async () => {
    await deviceUpdateTags(tagModal.deviceId, tagModal.tagIds);
    message.success('标签已更新');
    setTagModal({ visible: false, deviceId: 0, tagIds: [] });
    actionRef.current?.reload();
  };

  const handleRenew = async () => {
    if (!selectedPlanId) { message.warning('请选择一个续费套餐'); return; }
    const plan = planOptions.find((p: any) => p.id === selectedPlanId);
    const label = plan ? cycleLabel(plan) : '';
    const res = await deviceOrderCreate({ plan_id: selectedPlanId, device_ids: [renewDrawer.device.id] });
    if (res.code === 0) {
      setRenewDrawer({ visible: false, device: null });
      setPayModal({ visible: true, qrCode: res.data.qr_code || '', orderNo: res.data.order_no || '', totalPrice: res.data.total_price || 0, checking: false, planName: plan?.name || '', planLabel: label });
    }
  };

  const handleConfirmPay = async () => {
    setPayModal(prev => ({ ...prev, checking: true }));
    const check = await checkDeviceOrderStatus(payModal.orderNo);
    if (check.code === 0 && check.data.paid) {
      message.success('支付成功');
      setPayModal({ visible: false, qrCode: '', orderNo: '', totalPrice: 0, checking: false, planName: '', planLabel: '' });
      actionRef.current?.reload();
      return;
    }
    setTimeout(async () => {
      const check2 = await checkDeviceOrderStatus(payModal.orderNo);
      if (check2.code === 0 && check2.data.paid) {
        message.success('支付成功');
        setPayModal({ visible: false, qrCode: '', orderNo: '', totalPrice: 0, checking: false, planName: '', planLabel: '' });
        actionRef.current?.reload();
      } else {
        setPayModal(prev => ({ ...prev, checking: false }));
      }
    }, 3000);
  };

  const stopUrl = `/api/devices/{id}/stream-stop`;

  return (
    <>
      <Alert message="" description={isUser ? "设备解绑：解绑后可以重新绑定设备。" : "设备解绑：解绑后可以重新绑定设备。"} type="info" showIcon closable style={{ marginBottom: 16 }} />
      <ProTable headerTitle={isAdmin ? "设备管理（全部开发者）" : "设备管理"} actionRef={actionRef} rowKey="id"
        request={async (params) => { const res = await devices.list(params); currentIdsRef.current = (res.data || []).map((d: any) => d.id); return { data: res.data || [], total: res.total || 0, success: true }; }}
        columns={commonColumns}
        search={{ labelWidth: 'auto' }}
        rowSelection={!isAdmin ? { selectedRowKeys, onChange: (keys: any[]) => setSelectedRowKeys(keys) } : undefined}
        tableAlertRender={!isAdmin ? ({ selectedRowKeys, onCleanSelected }: any) => (
          <Space><span>已选 {selectedRowKeys.length} 台</span><a onClick={onCleanSelected}>取消选择</a></Space>
        ) : undefined}
        tableAlertOptionRender={!isAdmin ? () => (
          <Space>
            {isDeveloper && (<><Button size="small" onClick={() => handleBatchQuality(1)}>省流</Button><Button size="small" onClick={() => handleBatchQuality(5)}>标准</Button><Button size="small" onClick={() => handleBatchQuality(10)}>流畅</Button></>)}
            <Button size="small" icon={<EyeOutlined />} onClick={handleBatchLiveView}>实时画面</Button>
          </Space>
        ) : undefined}
        toolBarRender={() => isDeveloper ? [
          <Button key="buy" type="primary" icon={<ShoppingOutlined />} onClick={() => { setBuyDefaultType('device'); setBuyModal(true); }}>购买套餐</Button>,
        ] : []}
      />

      <Modal title="编辑设备信息" open={editModal.visible}
        onOk={async () => { await devices.update(editModal.deviceId, { name: editModal.name, remark: editModal.remark }); message.success('已更新'); setEditModal({ visible: false, deviceId: 0, name: '', remark: '' }); actionRef.current?.reload(); }}
        onCancel={() => setEditModal({ visible: false, deviceId: 0, name: '', remark: '' })}>
        <Form layout="vertical">
          <Form.Item label="设备名称"><Input value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} placeholder="请输入设备名称" /></Form.Item>
          <Form.Item label="备注"><Input.TextArea rows={3} value={editModal.remark} onChange={(e) => setEditModal({ ...editModal, remark: e.target.value })} placeholder="请输入备注" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="设备标签" open={tagModal.visible} onOk={handleSaveTags} onCancel={() => setTagModal({ visible: false, deviceId: 0, tagIds: [] })}>
        <Select mode="multiple" style={{ width: '100%' }} placeholder="选择标签" value={tagModal.tagIds} onChange={(v) => setTagModal({ ...tagModal, tagIds: v })}>
          {allTags.map((t: any) => (<Select.Option key={t.id} value={t.id}><Space><div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: t.color || '#1890ff', display: 'inline-block' }} />{t.name}</Space></Select.Option>))}
        </Select>
      </Modal>

      <Drawer title={`实时画面 — ${liveDrawer.device?.name || ''}`} placement="right" width={800} open={liveDrawer.visible} onClose={() => { const devId = liveDrawer.device?.id; setLiveDrawer({ visible: false, device: null }); setLiveViewer(null); if (devId) deviceStreamStop(devId); }}>
        {liveDrawer.device ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <ProTable search={false} options={false} pagination={false} rowKey="id"
              dataSource={[{ id: liveDrawer.device.id, name: liveDrawer.device.name, android_id: liveDrawer.device.android_id, status: deviceStatusMap[liveDrawer.device.status]?.text || '-' }]}
              columns={[{ title: '名称', dataIndex: 'name' }, { title: 'Android ID', dataIndex: 'android_id', copyable: true }, { title: '状态', dataIndex: 'status' }]}
            />
            {!isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666', fontSize: 13 }}>画质:</span>
                <Select style={{ width: 160 }} value={liveQuality} onChange={async (v) => { setLiveQuality(v); await deviceSetQuality(liveDrawer.device.id, v); message.success('画质已切换'); actionRef.current?.reload(); }} options={qualityOptions} />
              </div>
            )}
            <div style={{ background: '#000', borderRadius: 8, height: 700, overflow: 'hidden' }}>
              {liveViewer ? <LiveViewer token={liveViewer.token} url={liveViewer.url} room={liveViewer.room} stopUrl={stopUrl.replace('{id}', String(liveDrawer.device?.id))} /> : <div style={{ color: '#999', textAlign: 'center', paddingTop: 160 }}>正在获取画面...</div>}
            </div>
          </Space>
        ) : null}
      </Drawer>

      {isDeveloper && (
        <>
          <Drawer title={`设备续费 — ${renewDrawer.device?.name || ''}`} open={renewDrawer.visible} onClose={() => setRenewDrawer({ visible: false, device: null })} width={600} maskClosable destroyOnClose>
            {renewDrawer.device && (
              <div>
                <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="设备名称">{renewDrawer.device.name}</Descriptions.Item>
                  <Descriptions.Item label="Android ID">{renewDrawer.device.android_id || '未激活'}</Descriptions.Item>
                  <Descriptions.Item label="过期时间">{renewDrawer.device.expired_at ? moment(renewDrawer.device.expired_at).format('YYYY-MM-DD HH:mm:ss') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="状态"><Tag color={deviceStatusMap[renewDrawer.device.status]?.color}>{deviceStatusMap[renewDrawer.device.status]?.text}</Tag></Descriptions.Item>
                </Descriptions>
                <div style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>选择续费套餐</div>
                <Radio.Group style={{ width: '100%' }} value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                  <Row gutter={[12, 12]}>
                    {planOptions.map((plan: any) => (
                      <Col span={12} key={plan.id}>
                        <Card size="small" hoverable style={{ border: selectedPlanId === plan.id ? '2px solid #1677ff' : undefined }} onClick={() => setSelectedPlanId(plan.id)}>
                          <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{plan.name}</div>
                          <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>{cycleLabel(plan)}</div>
                          {plan.slogan && <div style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>{plan.slogan}</div>}
                          <div style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 'bold' }}>&yen;{plan.price}{plan.bonus_days > 0 && <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 6 }}>赠送 {plan.bonus_days} 天</span>}</div>
                        </Card>
                      </Col>
                    ))}
                    {planOptions.length === 0 && <Col span={24}><Empty description="暂无可用的续费套餐" /></Col>}
                  </Row>
                </Radio.Group>
                <div style={{ marginTop: 24 }}><Button type="primary" size="large" block onClick={handleRenew} disabled={!selectedPlanId}>确认续费</Button></div>
              </div>
            )}
          </Drawer>

          <Modal title={`多设备实时画面（${liveModal.deviceIds.length} 台）`} open={liveModal.visible}
            onCancel={() => { liveModal.deviceIds.forEach((id) => deviceStreamStop(id)); setLiveModal({ visible: false, deviceIds: [] }); }} footer={null}
            width={Math.min(liveModal.deviceIds.length * 320 + 80, window.innerWidth - 40)} maskClosable={false} keyboard={false} destroyOnClose>
            {liveModal.visible && (
              <Row gutter={[12, 12]} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {liveDevicesData.map((d: any) => (
                  <Col key={d.id} span={liveDevicesData.length === 1 ? 24 : 12}>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space><strong>{d.name}</strong><span style={{ color: '#999', fontSize: 12 }}>{d.android_id || '未激活'}</span></Space>
                        <Tag color={deviceStatusMap[d.status]?.color}>{deviceStatusMap[d.status]?.text || '-'}</Tag>
                      </div>
                      <DeviceLiveCell deviceId={d.id} deviceName={d.name} androidId={d.android_id} fetchToken={deviceLivekitViewerToken} stopUrl={stopUrl.replace('{id}', String(d.id))} />
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Modal>

          <Modal title="扫码支付" open={payModal.visible}
            onCancel={() => setPayModal({ visible: false, qrCode: '', orderNo: '', totalPrice: 0, checking: false, planName: '', planLabel: '' })}
            footer={[
              <Button key="cancel" onClick={() => setPayModal({ visible: false, qrCode: '', orderNo: '', totalPrice: 0, checking: false, planName: '', planLabel: '' })}>取消</Button>,
              <Button key="pay" type="primary" loading={payModal.checking} onClick={handleConfirmPay}>已支付</Button>,
            ]} width={400} destroyOnClose>
            <div style={{ textAlign: 'center' }}>
              <Descriptions column={1} size="small" style={{ marginBottom: 16 }} labelStyle={{ color: '#666' }}>
                <Descriptions.Item label="订单号">{payModal.orderNo}</Descriptions.Item>
                <Descriptions.Item label="套餐">{payModal.planName}</Descriptions.Item>
                <Descriptions.Item label="规格">{payModal.planLabel}</Descriptions.Item>
                <Descriptions.Item label="金额"><span style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 'bold' }}>&yen;{payModal.totalPrice}</span></Descriptions.Item>
              </Descriptions>
              {payModal.qrCode && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payModal.qrCode)}`} alt="支付二维码" style={{ border: '1px solid #f0f0f0', borderRadius: 8 }} />}
              <p style={{ marginTop: 12, color: '#999', fontSize: 12 }}>请使用支付宝扫描二维码完成支付</p>
            </div>
          </Modal>

          <PurchaseModal open={buyModal} onClose={() => setBuyModal(false)} onPaid={() => actionRef.current?.reload()} defaultType={buyDefaultType} />

          <Modal title="实时画面额度不足" open={balanceModal}
            onCancel={() => setBalanceModal(false)}
            footer={[
              <Button key="cancel" onClick={() => setBalanceModal(false)}>取消</Button>,
              <Button key="recharge" type="primary" onClick={() => { setBalanceModal(false); setBuyDefaultType('frame'); setBuyModal(true); }}>去充值</Button>,
            ]}
            width={420} centered destroyOnClose>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>您的实时画面额度已用完</p>
              <p style={{ color: '#666', marginBottom: 16 }}>
                {isDeveloper ? '请购买实时画面额度套餐后继续使用实时画面功能' : '请联系您的开发者分配实时画面额度'}
              </p>
              {initialState?.currentUser?.device_frame_balance !== undefined && (
                <p style={{ color: '#999', fontSize: 13 }}>当前剩余: {fmtGB(initialState.currentUser.device_frame_balance)}</p>
              )}
            </div>
          </Modal>
        </>
      )}
    </>
  );
};
