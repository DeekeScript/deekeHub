import { workflows, scripts } from '@/services/api/api';
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined } from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import { Button, Drawer, Form, Input, message, Popconfirm, Select, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useModel } from 'umi';

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isReadonly = roleType === 'user' || roleType === 'super_admin';

  const actionRef = useRef<any>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scriptOptions, setScriptOptions] = useState<any[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<any[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailScripts, setDetailScripts] = useState<any[]>([]);
  const [detailSaving, setDetailSaving] = useState(false);

  useEffect(() => {
    if (!isReadonly) {
      scripts.list({ pageSize: 1000 }).then(res => setScriptOptions(res.data || []));
    }
  }, []);

  const handleCreate = async (values: any) => {
    if (selectedScripts.length === 0) { message.error('请选择至少一个脚本'); return; }
    const res = await workflows.add({ ...values, scripts: selectedScripts });
    if (res.code === 0) { message.success('创建成功'); setDrawerOpen(false); setSelectedScripts([]); actionRef.current?.reload(); }
  };

  const addScript = (s: any) => {
    setSelectedScripts([...selectedScripts, { script_id: s.id, sort_order: selectedScripts.length }]);
  };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    const sorted = [...(record.workflow_scripts || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    setDetailScripts(sorted);
    setDetailOpen(true);
  };

  const moveScript = (index: number, direction: 'up' | 'down') => {
    const arr = [...detailScripts];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    arr.forEach((s, i) => s.sort_order = i);
    setDetailScripts(arr);
  };

  const handleDetailSave = async () => {
    setDetailSaving(true);
    const scriptsData = detailScripts.map((s: any, i: number) => ({ id: s.id, script_id: s.script_id, sort_order: i }));
    await workflows.update(detailRecord.id, { scripts: scriptsData });
    message.success('脚本顺序已更新');
    actionRef.current?.reload();
    setDetailSaving(false);
  };

  const scriptName = (sc: any) => {
    const s = scriptOptions.find((x: any) => x.id === sc.script_id);
    return s?.name || `脚本 #${sc.id}`;
  };

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '失败策略', dataIndex: 'fail_strategy', render: (_: any, r: any) => r.fail_strategy === 'stop' ? <Tag color="red">停止</Tag> : <Tag color="blue">继续</Tag> },
    { title: '脚本数', render: (_: any, r: any) => r.workflow_scripts?.length || 0 },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    ...(!isReadonly ? [{
      title: '操作', valueType: 'option' as const, width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" onClick={() => openDetail(record)}>详情</Button>
          <Popconfirm key="del" title="确定删除?" onConfirm={async () => { await workflows.remove(record.id); actionRef.current?.reload(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <ProTable headerTitle="工作流管理" actionRef={actionRef} rowKey="id"
        request={async (params) => { const res = await workflows.list(params); return { data: res.data || [], total: res.total || 0, success: true }; }}
        columns={columns}
        search={!isReadonly}
        toolBarRender={() => !isReadonly ? [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedScripts([]); setDrawerOpen(true); }}>创建工作流</Button>,
        ] : []}
      />
      <Drawer title="创建工作流" open={drawerOpen} onClose={() => setDrawerOpen(false)} width="70%" maskClosable destroyOnClose>
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="工作流名称" rules={[{ required: true }]}>
            <Input placeholder="请输入工作流名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>
          <Form.Item name="fail_strategy" label="失败策略" initialValue="stop">
            <Select options={[{ label: '停止当前任务', value: 'stop' }, { label: '继续执行', value: 'continue' }]} />
          </Form.Item>
          <Form.Item label="脚本编排">
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, maxHeight: 300, overflow: 'auto' }}>
              {scriptOptions.map((s: any) => (
                <div key={s.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><b>{s.name}</b></span>
                  <Button size="small" onClick={() => addScript(s)}>添加</Button>
                </div>
              ))}
              {scriptOptions.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无脚本</div>}
            </div>
            {selectedScripts.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b style={{ marginBottom: 8, display: 'block' }}>已选脚本（可拖动或点击箭头排序）：</b>
                {selectedScripts.map((s, i) => {
                  const scr = scriptOptions.find((x: any) => x.id === s.script_id);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 6, border: '1px solid #e8e8e8', borderRadius: 6, background: '#fafafa' }}>
                      <span style={{ color: '#999', fontWeight: 'bold', minWidth: 20 }}>{i + 1}</span>
                      <span style={{ flex: 1 }}>{scr?.name || `脚本 #${s.script_id}`}</span>
                      <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => {
                        const arr = [...selectedScripts];
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        setSelectedScripts(arr);
                      }} />
                      <Button size="small" icon={<ArrowDownOutlined />} disabled={i === selectedScripts.length - 1} onClick={() => {
                        const arr = [...selectedScripts];
                        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        setSelectedScripts(arr);
                      }} />
                      <Button size="small" type="text" danger onClick={() => setSelectedScripts(selectedScripts.filter((_, j) => j !== i))}>移除</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit">创建</Button></Form.Item>
        </Form>
      </Drawer>
      <Drawer title={detailRecord ? `工作流详情 — ${detailRecord.name}` : '工作流详情'} open={detailOpen} onClose={() => setDetailOpen(false)} width="70%" maskClosable destroyOnClose>
        {detailRecord && (
          <div>
            <div style={{ marginBottom: 24, display: 'flex', gap: 32 }}>
              <div><label style={{ color: '#999', fontSize: 13, marginBottom: 6, display: 'block' }}>ID</label><div>{detailRecord.id}</div></div>
              <div><label style={{ color: '#999', fontSize: 13, marginBottom: 6, display: 'block' }}>名称</label><div>{detailRecord.name}</div></div>
              <div><label style={{ color: '#999', fontSize: 13, marginBottom: 6, display: 'block' }}>描述</label><div>{detailRecord.description || '—'}</div></div>
              <div><label style={{ color: '#999', fontSize: 13, marginBottom: 6, display: 'block' }}>失败策略</label><div><Tag color={detailRecord.fail_strategy === 'stop' ? 'red' : 'blue'}>{detailRecord.fail_strategy === 'stop' ? '停止' : '继续'}</Tag></div></div>
              <div><label style={{ color: '#999', fontSize: 13, marginBottom: 6, display: 'block' }}>创建时间</label><div>{detailRecord.created_at ? detailRecord.created_at.replace('T', ' ').replace(/\.\d+Z/, '') : '—'}</div></div>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <b>脚本编排顺序</b>
                <Button type="primary" size="small" onClick={handleDetailSave} loading={detailSaving}>保存顺序</Button>
              </div>
              {detailScripts.length === 0 && <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>暂无脚本</div>}
              {detailScripts.map((sc: any, i: number) => (
                <div key={sc.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' }}>
                  <span style={{ color: '#999', fontWeight: 'bold', minWidth: 20 }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{scriptName(sc)}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>{sc.script?.name || ''}</span>
                  <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => moveScript(i, 'up')} />
                  <Button size="small" icon={<ArrowDownOutlined />} disabled={i === detailScripts.length - 1} onClick={() => moveScript(i, 'down')} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};
