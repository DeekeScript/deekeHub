import { tags } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProForm } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import { useRef } from 'react';
import { ColorPicker } from '@/utils/constants';
import { useModel } from 'umi';

export default () => {
  const { initialState } = useModel('@@initialState');
  const isSuperAdmin = initialState?.currentUser?.role_type === 'super_admin';
  const actionRef = useRef<any>();

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '颜色', dataIndex: 'color', width: 80,
      render: (_: any, r: any) => <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: r.color || '#1890ff', border: '1px solid #d9d9d9' }} />,
    },
    { title: '标签名称', dataIndex: 'name' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    ...(!isSuperAdmin ? [{
      title: '操作', valueType: 'option' as const, width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          <ModalForm key="edit" title="编辑标签" initialValues={record} trigger={<Button size="small">编辑</Button>} onFinish={async (values: any) => { await tags.update(record.id, values); message.success('更新成功'); actionRef.current?.reload(); return true; }}>
            <ProFormText name="name" label="标签名称" rules={[{ required: true }]} />
            <ProForm.Item name="color" label="颜色"><ColorPicker /></ProForm.Item>
          </ModalForm>,
          <Popconfirm key="del" title="确定删除?" onConfirm={async () => { await tags.remove(record.id); actionRef.current?.reload(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <ProTable headerTitle="标签管理" actionRef={actionRef} rowKey="id"
      request={async (params) => { const res = await tags.list(params); return { data: res.data || [], total: res.total || 0, success: true }; }}
      columns={columns}
      toolBarRender={() => !isSuperAdmin ? [
        <ModalForm key="add" title="创建标签" initialValues={{ color: '#1677ff' }} trigger={<Button type="primary" icon={<PlusOutlined />}>创建标签</Button>} onFinish={async (values: any) => { await tags.add(values); message.success('创建成功'); actionRef.current?.reload(); return true; }}>
          <ProFormText name="name" label="标签名称" rules={[{ required: true }]} />
          <ProForm.Item name="color" label="颜色"><ColorPicker /></ProForm.Item>
        </ModalForm>,
      ] : undefined}
    />
  );
};
