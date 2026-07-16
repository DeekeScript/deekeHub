import { adminDevelopers, adminToggleDeveloperStatus, adminDeveloperStats, adminDeveloperAdjust, adminAssignDevices, adminDeveloperLogs, adminDeveloperCleanup, users } from '@/services/api/api';
import { PlusOutlined, MoreOutlined, TeamOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormDigit, ProDescriptions } from '@ant-design/pro-components';
import { Button, Drawer, Form, InputNumber, message, Popconfirm, Space, Tag, Tabs, Input, DatePicker, Dropdown, Modal } from 'antd';
import { useRef, useState } from 'react';
import moment from 'moment';
import { fmtGB, BYTES_PER_GB } from '@/utils/constants';

const actionLabels: Record<string, string> = {
  adjust_devices: '调整设备数',
  adjust_points: '调整实时画面额度',
  toggle_status: '启停账号',
};

export default () => {
  const actionRef = useRef<any>();
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<any>({});
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 分配实时画面额度
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  // 分配设备
  const [devAssignVisible, setDevAssignVisible] = useState(false);
  const [devAssignRecord, setDevAssignRecord] = useState<any>({});
  const [devAssignCount, setDevAssignCount] = useState(1);
  const [devAssignExpired, setDevAssignExpired] = useState<string>('');

  // 操作日志
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 运营详情
  const [opsDrawerVisible, setOpsDrawerVisible] = useState(false);
  const [opsRecord, setOpsRecord] = useState<any>({});
  const [opsData, setOpsData] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);

  const openDetail = async (record: any) => {
    setDetailRecord(record);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await adminDeveloperStats(record.id);
      if (res?.code === 0) setDetailData(res.data);
    } catch (e) { /* ignore */ }
    setDetailLoading(false);
    setLogsLoading(true);
    try {
      const logRes = await adminDeveloperLogs(record.id, { pageSize: 50 });
      if (logRes?.code === 0) setLogs(logRes.data?.data || logRes.data || []);
    } catch (e) { /* ignore */ }
    setLogsLoading(false);
  };

  const openOperators = async (record: any) => {
    setOpsRecord(record);
    setOpsDrawerVisible(true);
    setOpsLoading(true);
    try {
      const res = await users.list({ developer_id: record.id, pageSize: 200 });
      if (res?.code === 0) setOpsData(res.data?.data || res.data || []);
    } catch (_) {}
    setOpsLoading(false);
  };

  const openAdjust = (record: any) => {
    setEditRecord(record);
    setAdjustAmount(0);
    setAdjustReason('');
    setAdjustVisible(true);
  };

  const handleAdjust = async () => {
    if (!adjustReason.trim()) { message.error('请填写操作原因'); return; }
    const amount = adjustAmount * BYTES_PER_GB;
    await adminDeveloperAdjust(editRecord.id, { field: 'device_frame_balance', amount, reason: adjustReason });
    message.success('分配成功');
    setAdjustVisible(false);
    actionRef.current?.reload();
  };

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '状态', dataIndex: 'status', render: (_: any, r: any) => r.status ? <Tag color="green">正常</Tag> : <Tag color="red">停用</Tag> },
    { title: '运营数', dataIndex: 'user_count', align: 'right' },
    { title: '设备数', dataIndex: 'device_count', align: 'right' },
    { title: '已消耗 / 可用画面额度', render: (_: any, r: any) => `${fmtGB(r.consumed_points ?? 0)} / ${fmtGB((r.consumed_points ?? 0) + (r.device_frame_balance ?? 0))}`, align: 'right' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    {
      title: '操作', valueType: 'option' as const, width: 240,
      render: (_: any, record: any) => {
        const moreItems = [
          {
            key: 'operators',
            icon: <TeamOutlined />,
            label: '运营',
            onClick: () => openOperators(record),
          },
          {
            key: 'assign-devices',
            label: '分配设备',
            onClick: () => { setDevAssignRecord(record); setDevAssignCount(1); setDevAssignExpired(''); setDevAssignVisible(true); },
          },
          {
            key: 'adjust',
            label: '分配实时画面额度',
            onClick: () => openAdjust(record),
          },
          { type: 'divider' as const },
          {
            key: 'cleanup',
            label: '一键清理',
            onClick: () => {
              Modal.confirm({
                title: `确定硬删除开发者"${record.name}"及其所有数据?`,
                content: '此操作不可恢复!',
                okText: '确认删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: async () => {
                  const res = await adminDeveloperCleanup(record.id);
                  if (res.code === 0) { message.success('清理成功'); actionRef.current?.reload(); }
                },
              });
            },
          },
        ];
        return (
          <Space size={4}>
            <Button size="small" onClick={() => openDetail(record)}>详情</Button>
            <Button size="small" onClick={() => { setEditRecord(record); setEditVisible(true); }}>编辑</Button>
            <Popconfirm key="toggle" title={`确定${record.status ? '停用' : '启用'}该开发者?`}
              onConfirm={async () => { await adminToggleDeveloperStatus(record.id); actionRef.current?.reload(); }}>
              <Button size="small" style={{ borderColor: '#eb2f96', color: '#c41d7f' }}>{record.status ? '停用' : '启用'}</Button>
            </Popconfirm>
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const { developer } = detailData || {};

  return (
    <>
      <ProTable headerTitle="开发者列表" actionRef={actionRef} rowKey="id"
        request={async (params: any) => {
          const res = await adminDevelopers.list(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={columns}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setAddVisible(true)}>创建开发者</Button>,
        ]}
      />

      {/* 创建 */}
      <ModalForm title="创建开发者" open={addVisible} onOpenChange={setAddVisible}
        onFinish={async (values: any) => { const data = { ...values, device_frame_balance: (values.device_frame_balance || 0) * BYTES_PER_GB }; await adminDevelopers.add(data); message.success('创建成功'); setAddVisible(false); actionRef.current?.reload(); return true; }}>
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="phone" label="手机号" rules={[{ required: true }]} />
        <ProFormText.Password name="password" label="密码" rules={[{ required: true }]} />
        <ProFormText name="email" label="邮箱" />
        <ProFormDigit name="device_frame_balance" label="实时画面初始额度(GB)" initialValue={0} />
      </ModalForm>

      {/* 编辑基本信息 */}
      <ModalForm title="编辑开发者" open={editVisible} onOpenChange={setEditVisible} initialValues={editRecord}
        onFinish={async (values: any) => { await adminDevelopers.update(editRecord.id, values); message.success('更新成功'); setEditVisible(false); actionRef.current?.reload(); return true; }}>
        <ProFormText name="name" label="名称" />
        <ProFormText name="phone" label="手机号" />
        <ProFormText name="email" label="邮箱" />
      </ModalForm>

      {/* 分配实时画面额度 */}
      <ModalForm title={`分配实时画面额度 - ${editRecord?.name || ''}`} open={adjustVisible} onOpenChange={setAdjustVisible}
        onFinish={handleAdjust} submitter={{ searchConfig: { submitText: '确认分配' } }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
            当前额度: {fmtGB(editRecord?.device_frame_balance ?? 0)}
          </div>
          <div style={{ marginBottom: 8 }}>单位: GB，正数=分配，负数=回收</div>
          <InputNumber value={adjustAmount} onChange={(v) => setAdjustAmount(v || 0)} placeholder="正数分配，负数回收 (单位: GB)" style={{ width: '100%', marginBottom: 12 }} />
          <Input.TextArea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="操作原因（必填）" rows={3} />
        </div>
      </ModalForm>

      {/* 分配设备 */}
      <ModalForm title={`分配设备 - ${devAssignRecord?.name || ''}`} open={devAssignVisible} onOpenChange={setDevAssignVisible}
        onFinish={async () => {
          if (!devAssignExpired) { message.error('请选择过期时间'); return false; }
          const res = await adminAssignDevices(devAssignRecord.id, { count: devAssignCount, expired_at: devAssignExpired });
          if (res.code !== 0) return false;
          message.success(res.msg || '分配成功');
          setDevAssignVisible(false);
          actionRef.current?.reload();
          return true;
        }}
        submitter={{ searchConfig: { submitText: '确认分配' } }}>
        <div style={{ marginBottom: 16 }}>为开发者分配设备，将自动生成对应数量的激活码，设备过期后不可使用。</div>
        <ProFormDigit name="count" label="设备数量" initialValue={1} fieldProps={{ min: 1, max: 500, value: devAssignCount, onChange: (v: number | null) => setDevAssignCount(v || 1) }} />
        <Form.Item label="过期时间" required>
          <DatePicker showTime style={{ width: '100%' }}
            value={devAssignExpired ? moment(devAssignExpired) : null}
            onChange={(d) => setDevAssignExpired(d ? d.format('YYYY-MM-DD HH:mm:ss') : '')} />
        </Form.Item>
        <div style={{ color: '#999', fontSize: 12, marginTop: -8 }}>当前设备数: {devAssignRecord.device_count ?? 0} 台</div>
      </ModalForm>

      {/* 详情 Drawer */}
      <Drawer title={`开发者详情 - ${detailRecord?.name || ''}`} width={640} open={detailVisible} onClose={() => { setDetailVisible(false); setDetailData(null); }}
        extra={
          <Button danger={developer?.status} onClick={async () => {
            await adminToggleDeveloperStatus(detailRecord.id);
            message.success(developer?.status ? '已停用' : '已启用');
            openDetail(detailRecord);
            actionRef.current?.reload();
          }}>{developer?.status ? '停用账号' : '启用账号'}</Button>
        }>
        {detailLoading ? <div style={{ textAlign: 'center', padding: 60 }}>加载中...</div> : developer ? (
          <Tabs defaultActiveKey="info" items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <>
                  <ProDescriptions column={2} bordered size="small">
                    <ProDescriptions.Item label="名称">{developer.name}</ProDescriptions.Item>
                    <ProDescriptions.Item label="手机号">{developer.phone}</ProDescriptions.Item>
                    <ProDescriptions.Item label="邮箱">{developer.email || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="状态">{developer.status ? <Tag color="green">正常</Tag> : <Tag color="red">停用</Tag>}</ProDescriptions.Item>
                    <ProDescriptions.Item label="设备数">{detailData.device_count ?? 0}</ProDescriptions.Item>
                    <ProDescriptions.Item label="运营数">{detailData.user_count ?? 0}</ProDescriptions.Item>
                    <ProDescriptions.Item label="首次试用">{developer.trial_granted ? <Tag color="blue">已赠送</Tag> : <Tag color="default">未赠送</Tag>}</ProDescriptions.Item>
                  </ProDescriptions>
                  <div style={{ marginTop: 24, fontWeight: 500, marginBottom: 12 }}>统计概览</div>
                  <ProDescriptions column={2} bordered size="small">
                    <ProDescriptions.Item label="在线设备">{detailData.active_device_count}</ProDescriptions.Item>
                    <ProDescriptions.Item label="任务总数">{detailData.task_count}</ProDescriptions.Item>
                  </ProDescriptions>
                  <div style={{ marginTop: 24, fontWeight: 500, marginBottom: 12 }}>实时画面额度概览</div>
                  <ProDescriptions column={2} bordered size="small">
                    <ProDescriptions.Item label="总画面额度">{fmtGB(detailData.total_points ?? 0)}</ProDescriptions.Item>
                    <ProDescriptions.Item label="已分配">{fmtGB(detailData.allocated_points ?? 0)}</ProDescriptions.Item>
                    <ProDescriptions.Item label="可分配">{fmtGB(developer.device_frame_balance)}</ProDescriptions.Item>
                    <ProDescriptions.Item label="已消耗">{fmtGB(detailData.consumed_points ?? 0)}</ProDescriptions.Item>
                  </ProDescriptions>
                </>
              ),
            },
            {
              key: 'logs', label: '操作日志',
              children: (
                <ProTable
                  search={false} options={false} rowKey="id" loading={logsLoading}
                  dataSource={logs} pagination={{ pageSize: 20 }}
                  columns={[
                    { title: '时间', dataIndex: 'created_at', valueType: 'dateTime', width: 160 },
                    { title: '操作', dataIndex: 'action', width: 120, render: (_: any, r: any) => actionLabels[r.action] || r.action },
                    { title: '变化量', dataIndex: 'change_amount', width: 100, align: 'center', render: (_: any, r: any) => r.change_amount > 0 ? <span style={{ color: '#52c41a' }}>+{r.change_amount}</span> : <span style={{ color: '#ff4d4f' }}>{r.change_amount}</span> },
                    { title: '操作前', dataIndex: 'before_value', width: 100, align: 'right' },
                    { title: '操作后', dataIndex: 'after_value', width: 100, align: 'right' },
                    { title: '原因', dataIndex: 'reason', ellipsis: true },
                    { title: '操作人', dataIndex: 'operator', width: 100 },
                  ]}
                />
              ),
            },
          ]} />
        ) : <div style={{ textAlign: 'center', color: '#999', padding: 60 }}>加载失败</div>}
      </Drawer>

      {/* 运营详情 Drawer */}
      <Drawer title={`${opsRecord?.name || ''} 的运营列表`} width={600} open={opsDrawerVisible} onClose={() => setOpsDrawerVisible(false)}>
        <ProTable
          search={false} options={false} rowKey="id" loading={opsLoading}
          dataSource={opsData} pagination={{ pageSize: 20 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '名称', dataIndex: 'name' },
            { title: '手机号', dataIndex: 'phone' },
            { title: '状态', dataIndex: 'status', render: (_: any, r: any) => r.status ? <Tag color="green">正常</Tag> : <Tag color="red">停用</Tag> },
            { title: '实时画面额度', dataIndex: 'device_frame_balance', align: 'right', render: (_: any, r: any) => fmtGB(r.device_frame_balance) },
            { title: '设备数', dataIndex: 'device_count', align: 'right' },
            { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
          ]}
        />
      </Drawer>
    </>
  );
};
