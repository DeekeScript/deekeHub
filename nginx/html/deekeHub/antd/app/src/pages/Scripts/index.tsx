import { scripts, scriptDetail } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import { Button, Drawer, Form, Input, message, Popconfirm, Space, Spin } from 'antd';
import { useRef, useState } from 'react';
import MonacoEditor from '@/components/MonacoEditor';
import { useModel } from 'umi';

export default () => {
  const { initialState } = useModel('@@initialState');
  const isSuperAdmin = initialState?.currentUser?.role_type === 'super_admin';
  const actionRef = useRef<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editId, setEditId] = useState<number>(0);
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '代码', width: 140,
      render: (_: any, r: any) => {
        const lines = r.code_lines || 0;
        const bytes = r.code_size || 0;
        const size = bytes >= 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`;
        return <span style={{ color: '#666', fontSize: 12 }}>{lines}行 / {size}</span>;
      },
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    { title: '更新时间', dataIndex: 'updated_at', valueType: 'dateTime' },
    ...(!isSuperAdmin ? [{
      title: '操作', valueType: 'option' as const, width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" onClick={async () => {
            setEditId(record.id);
            setEditLoading(true);
            setEditOpen(true);
            const detail = await scriptDetail(record.id);
            if (detail.code === 0) {
              editForm.setFieldsValue({ name: detail.data.name, remark: detail.data.remark });
              setEditContent(detail.data.content || '');
            }
            setEditLoading(false);
          }}>编辑</Button>
          <Popconfirm key="del" title="确定删除?" onConfirm={async () => { await scripts.remove(record.id); actionRef.current?.reload(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await scripts.add(values);
      message.success('创建成功');
      createForm.resetFields();
      setCreateOpen(false);
      actionRef.current?.reload();
    } catch {}
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await scripts.update(editId, { ...values, content: editContent });
      message.success('更新成功');
      setEditOpen(false);
      actionRef.current?.reload();
    } catch {}
  };

  return (
    <>
      <ProTable
        headerTitle="脚本管理"
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          const res = await scripts.list(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={columns}
        toolBarRender={() => !isSuperAdmin ? [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>
            创建脚本
          </Button>,
        ] : undefined}
      />
      <Drawer
        title="创建脚本"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        width="70%"
        maskClosable
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="脚本名称" rules={[{ required: true }]}>
            <Input placeholder="请输入脚本名称" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
          <Form.Item name="content" label="脚本内容">
            <MonacoEditor language="javascript" height="calc(100vh - 400px)" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" onClick={handleCreate}>创建</Button>
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title="编辑脚本"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width="70%"
        maskClosable
        destroyOnClose
      >
        {editLoading ? <Spin style={{ display: 'block', margin: '60px auto' }} /> : (
          <Form form={editForm} layout="vertical">
            <Form.Item name="name" label="脚本名称" rules={[{ required: true }]}>
              <Input placeholder="请输入脚本名称" />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea placeholder="请输入备注" rows={2} />
            </Form.Item>
            <Form.Item label="脚本内容">
              <MonacoEditor
                value={editContent}
                onChange={setEditContent}
                language="javascript"
                height="calc(100vh - 480px)"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" onClick={handleEdit}>保存</Button>
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </>
  );
};
