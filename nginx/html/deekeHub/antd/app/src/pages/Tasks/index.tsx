import { taskList, taskDetail, taskExecute, taskCancel, taskAdd, workflows, devices } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import { Button, Drawer, Form, Input, message, Popconfirm, Select, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useModel } from 'umi';
import TaskDetailDrawer from './Detail';

const taskStatusMap: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '等待中' },
  1: { color: 'blue', text: '运行中' },
  2: { color: 'green', text: '已完成' },
  3: { color: 'red', text: '失败' },
  4: { color: 'default', text: '已取消' },
};

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isReadonly = roleType === 'user' || roleType === 'super_admin';
  const canCreate = !isReadonly;

  const actionRef = useRef<any>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);
  const [deviceOptions, setDeviceOptions] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);

  const handleExecute = async (id: number) => {
    setExecutingId(id);
    await taskExecute(id);
    message.success('已开始执行');
    setExecutingId(null);
    actionRef.current?.reload();
  };

  useEffect(() => {
    if (canCreate) {
      workflows.list({ pageSize: 100 }).then(res => setWorkflowOptions(res.data || []));
      devices.list({ pageSize: 1000 }).then(res => setDeviceOptions(res.data || []));
    }
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (selectedDevices.length === 0) { message.error('请选择至少一台设备'); return; }
      const res = await taskAdd({ ...values, device_ids: selectedDevices });
      if (res.code === 0) {
        message.success('任务创建成功');
        form.resetFields();
        setSelectedDevices([]);
        setCopying(false);
        setDrawerOpen(false);
        actionRef.current?.reload();
      }
    } catch {}
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '任务名称', dataIndex: 'name' },
    { title: '工作流', dataIndex: ['workflow', 'name'] },
    { title: '状态', dataIndex: 'status', width: 90, align: 'center' as const,
      render: (_: any, r: any) => { const s = taskStatusMap[r.status] || { color: 'default', text: '-' }; return <Tag color={s.color}>{s.text}</Tag>; },
      valueEnum: { 0: '等待中', 1: '运行中', 2: '已完成', 3: '失败', 4: '已取消' },
    },
    { title: '设备数', dataIndex: 'device_count', width: 80, align: 'center' as const },
    { title: '成功', dataIndex: 'success_count', width: 70, align: 'center' as const },
    { title: '失败', dataIndex: 'fail_count', width: 70, align: 'center' as const },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    {
      title: '操作', valueType: 'option' as const, width: 210,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" onClick={() => { setDetailTaskId(record.id); setDetailOpen(true); }}>详情</Button>
          {!isReadonly && <Button size="small" onClick={async () => {
            const res = await taskDetail(record.id);
            if (res.code === 0) {
              const d = res.data;
              form.setFieldsValue({ name: d.name, workflow_id: d.workflow_id });
              setSelectedDevices((d.task_devices || []).map((td: any) => td.device_id));
              setCopying(true);
              setDrawerOpen(true);
            }
          }}>复制</Button>}
          {(record.status === 0 || record.status === 3 || record.status === 4) && roleType !== 'super_admin' && <Button size="small" style={{ borderColor: '#52c41a', color: '#389e0d' }} loading={executingId === record.id} onClick={() => handleExecute(record.id)}>执行</Button>}
          {!isReadonly && (record.status === 0 || record.status === 1) && (
            <Popconfirm key="cancel" title="确定取消任务?" onConfirm={async () => { await taskCancel(record.id); actionRef.current?.reload(); }}>
              <Button size="small" danger>取消</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable headerTitle="任务管理" actionRef={actionRef} rowKey="id"
        request={async (params: any) => { const res = await taskList(params); return { data: res.data || [], total: res.total || 0, success: true }; }}
        columns={columns}
        toolBarRender={() => canCreate ? [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setSelectedDevices([]); setCopying(false); setDrawerOpen(true); }}>创建任务</Button>,
        ] : []}
      />
      <Drawer title={copying ? '复制任务' : '创建任务'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={560} maskClosable destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="workflow_id" label="选择工作流" rules={[{ required: true }]}>
            <Select placeholder="请选择工作流" options={workflowOptions.map((w: any) => ({ label: w.name, value: w.id }))} />
          </Form.Item>
          <Form.Item label="选择设备" rules={[{ required: true }]}>
            <Select mode="multiple" style={{ width: '100%' }} placeholder="选择设备" value={selectedDevices} onChange={setSelectedDevices}>
              {deviceOptions.map((d: any) => (
                <Select.Option key={d.id} value={d.id} disabled={d.status !== 2 && d.status !== 3}>
                  {d.name} ({d.android_id}) {d.status !== 2 && d.status !== 3 ? '[离线]' : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleCreate}>创建任务</Button>
          </Form.Item>
        </Form>
      </Drawer>
      <TaskDetailDrawer taskId={detailTaskId} open={detailOpen} onClose={() => { setDetailOpen(false); actionRef.current?.reload(); }} />
    </>
  );
};
