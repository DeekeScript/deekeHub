import { users, userToggleStatus, userFrameBalance, userAssignDevices, devices, currentUser as fetchCurrentUser } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import { StatisticCard } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, InputNumber, message, Popconfirm, Space, Tag, Select, Alert } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { ThunderboltOutlined, MobileOutlined, TeamOutlined } from '@ant-design/icons';
import { fmtGB, BYTES_PER_GB } from '@/utils/constants';
import { useModel } from 'umi';

export default () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const isSuperAdmin = initialState?.currentUser?.role_type === 'super_admin';
  const actionRef = useRef<any>();
  const [stats, setStats] = useState<any>({});
  const [unassignedDevices, setUnassignedDevices] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [allDevices, setAllDevices] = useState<any[]>([]);

  // 弹窗状态
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editRecord, setEditRecord] = useState<any>({});
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [deviceUserId, setDeviceUserId] = useState(0);
  const [assignDeviceIds, setAssignDeviceIds] = useState<number[]>([]);
  const [pointOpen, setPointOpen] = useState(false);
  const [pointUserId, setPointUserId] = useState(0);
  const [pointBalance, setPointBalance] = useState(0);
  const [pointAmount, setPointAmount] = useState(0);

  const fetchStats = () => {
    users.list({ pageSize: 1 }).then(r => {
      if (r.code === 0 && r.data?.stats) {
        setStats(r.data.stats);
      }
      setStatsLoading(false);
    });
  };

  const fetchDevices = () => {
    devices.list({ pageSize: 1000 }).then(res => {
      if (res.code === 0) {
        setAllDevices(res.data || []);
        setUnassignedDevices((res.data || []).filter((d: any) => !d.user_id));
      }
    });
  };

  useEffect(() => { fetchStats(); fetchDevices(); }, []);

  const remainingPoints = initialState?.currentUser?.device_frame_balance ?? 0;

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const data = { ...values, device_frame_balance: (values.device_frame_balance || 0) * BYTES_PER_GB };
      const res = await users.add(data);
      if (res.code !== 0) return;
      message.success('创建成功');
      createForm.resetFields();
      setCreateOpen(false);
      fetchStats(); fetchDevices(); actionRef.current?.reload();
    } catch { message.error('创建失败'); }
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await users.update(editRecord.id, values);
      message.success('更新成功');
      setEditOpen(false);
      actionRef.current?.reload();
    } catch {}
  };

  const handleDeviceAssign = async () => {
    await userAssignDevices(deviceUserId, { device_ids: assignDeviceIds });
    message.success('设备已更新');
    fetchDevices(); actionRef.current?.reload();
    setDeviceOpen(false);
  };

  const handlePointSave = async () => {
    try {
      const res = await userFrameBalance(pointUserId, pointAmount * BYTES_PER_GB);
      if (res.code !== 0) return;
      message.success(pointAmount >= 0 ? `已分配 ${pointAmount.toFixed(2)} GB` : `已回收 ${Math.abs(pointAmount).toFixed(2)} GB`);
      // refresh current user balance
      const userRes = await fetchCurrentUser();
      if (userRes.code === 0 && userRes.data) {
        setInitialState((s: any) => ({ ...s, currentUser: { ...s.currentUser, device_frame_balance: userRes.data.device_frame_balance } }));
      }
      fetchStats(); actionRef.current?.reload();
      setPointOpen(false);
    } catch { /* 全局拦截器已提示 */ }
  };

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '状态', dataIndex: 'status', render: (_: any, r: any) => r.status ? <Tag color="green">正常</Tag> : <Tag color="red">停用</Tag> },
    { title: '实时画面额度/已消耗额度', render: (_: any, r: any) => `${fmtGB(r.device_frame_balance)} / ${fmtGB(r.consumed_points ?? 0)}`, align: 'right' },
    { title: '设备数', dataIndex: 'device_count', align: 'right' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    ...(!isSuperAdmin ? [{
      title: '操作', valueType: 'option' as const, width: 300,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" onClick={() => { setEditRecord(record); editForm.setFieldsValue({ name: record.name, phone: record.phone }); setEditOpen(true); }}>编辑</Button>
          <Button size="small" style={{ borderColor: '#722ed1', color: '#531dab' }} onClick={() => { setPointUserId(record.id); setPointBalance(record.device_frame_balance); setPointAmount(0); setPointOpen(true); }}>分配画面额度</Button>
          <Button size="small" style={{ borderColor: '#fa8c16', color: '#d46b08' }} onClick={() => {
            const currentIds = allDevices.filter((d: any) => d.user_id === record.id).map((d: any) => d.id);
            setAssignDeviceIds(currentIds);
            setDeviceUserId(record.id);
            setDeviceOpen(true);
          }}>分配设备</Button>
          <Popconfirm key="toggle" title={`确定${record.status ? '停用' : '启用'}?`}
            onConfirm={async () => { await userToggleStatus(record.id); actionRef.current?.reload(); }}>
            <Button size="small" style={{ borderColor: '#eb2f96', color: '#c41d7f' }}>{record.status ? '停用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <StatisticCard.Group loading={statsLoading} style={{ marginBottom: 16 }}>
        <StatisticCard statistic={{ title: '已分配实时画面额度', value: fmtGB(stats.user_frame_balance ?? 0), icon: <ThunderboltOutlined /> }} />
        <StatisticCard statistic={{ title: '已消耗实时画面额度', value: fmtGB(stats.user_consumed_points ?? 0), icon: <ThunderboltOutlined /> }} />
        <StatisticCard statistic={{ title: '运营设备总数', value: stats.user_device_count ?? 0, icon: <MobileOutlined /> }} />
        <StatisticCard statistic={{ title: '运营总数', value: stats.user_count ?? 0, icon: <TeamOutlined /> }} />
      </StatisticCard.Group>

      <ProTable headerTitle="运营管理" actionRef={actionRef} rowKey="id"
        request={async (params: any) => {
          const res: any = await users.list(params);
          if (res.code === 0 && res.stats) setStats(res.stats);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={columns}
        toolBarRender={() => !isSuperAdmin ? [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>创建运营</Button>,
        ] : undefined}
      />

      {/* 创建运营 */}
      <Drawer title="创建运营" open={createOpen} onClose={() => setCreateOpen(false)} width={520} maskClosable destroyOnClose>
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="名称">
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="device_frame_balance" label="实时画面初始额度(GB)" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="device_ids" label="分配设备">
            <Select mode="multiple" placeholder="选择分配给该运营的设备" allowClear
              options={unassignedDevices.map((d: any) => ({ label: `${d.name} (${d.android_id || '未激活'})`, value: d.id }))} />
          </Form.Item>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message={<span>未分配设备 <strong>{unassignedDevices.length}</strong> 台 | 可分配画面额度 <strong>{fmtGB(remainingPoints)}</strong></span>} />
          <Button type="primary" onClick={handleCreate}>创建</Button>
        </Form>
      </Drawer>

      {/* 编辑运营 */}
      <Drawer title="编辑运营" open={editOpen} onClose={() => setEditOpen(false)} width={520} maskClosable destroyOnClose>
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="名称">
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="password" label="新密码（留空不修改）">
            <Input.Password placeholder="留空不修改" />
          </Form.Item>
          <Button type="primary" onClick={handleEdit}>保存</Button>
        </Form>
      </Drawer>

      {/* 分配设备 */}
      <Drawer title="分配设备" open={deviceOpen} onClose={() => setDeviceOpen(false)} width={520} maskClosable destroyOnClose>
        <Select mode="multiple" style={{ width: '100%', marginBottom: 12 }} placeholder="选择分配给该运营的设备"
          value={assignDeviceIds}
          onChange={(v) => setAssignDeviceIds(v)}>
          {allDevices.map((d: any) => (
            <Select.Option key={d.id} value={d.id} disabled={d.user_id && d.user_id !== deviceUserId}>
              {d.name} ({d.android_id || '未激活'}){d.user_id && d.user_id !== deviceUserId ? ' [已被占用]' : ''}
            </Select.Option>
          ))}
        </Select>
        <div style={{ marginBottom: 12, color: '#999', fontSize: 12 }}>已选中的设备将分配给该运营，取消选中的将回收</div>
        <Button type="primary" onClick={handleDeviceAssign}>保存</Button>
      </Drawer>

      {/* 分配画面额度 */}
      <Drawer title="分配实时画面额度" open={pointOpen} onClose={() => setPointOpen(false)} width={520} maskClosable destroyOnClose>
        <div style={{ marginBottom: 16 }}>当前画面额度余额: <strong>{fmtGB(pointBalance)}</strong></div>
        <div style={{ marginBottom: 8 }}>单位: GB，正数=分配，负数=回收</div>
        <InputNumber value={pointAmount} onChange={(v) => setPointAmount(v || 0)} style={{ width: '100%', marginBottom: 12 }} placeholder="正数分配，负数回收 (单位: GB)" />
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message={<span>可分配画面额度：<strong>{fmtGB(remainingPoints)}</strong></span>} />
        <Button type="primary" onClick={handlePointSave}>保存</Button>
      </Drawer>
    </>
  );
};
