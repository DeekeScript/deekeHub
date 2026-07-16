import { cardKeys, cardKeyGenerate } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import { Button, InputNumber, message, Modal, Popconfirm, Tag } from 'antd';
import { useRef, useState } from 'react';
import { useModel } from 'umi';

const statusMap: Record<number, { color: string; text: string }> = {
  0: { color: 'blue', text: '未使用' },
  1: { color: 'green', text: '已使用' },
  2: { color: 'red', text: '已作废' },
};

export default () => {
  const { initialState } = useModel('@@initialState');
  const isAdmin = initialState?.currentUser?.role_type === 'super_admin';
  const actionRef = useRef<any>();
  const [genOpen, setGenOpen] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genLoading, setGenLoading] = useState(false);

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const res = await cardKeyGenerate(genCount);
      if (res.code === 0) {
        message.success(res.msg || `成功生成${genCount}个卡密`);
        setGenOpen(false);
        actionRef.current?.reload();
      }
    } finally { setGenLoading(false); }
  };

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '卡密', dataIndex: 'key_code', width: 220, ellipsis: true },
    ...(isAdmin ? [{ title: '开发者ID', dataIndex: 'developer_id', width: 100 }] : []),
    { title: '状态', dataIndex: 'status', width: 90, render: (_: any, r: any) => {
      const s = statusMap[r.status] || { color: 'default', text: '-' };
      return <Tag color={s.color}>{s.text}</Tag>;
    }},
    { title: '关联设备ID', dataIndex: 'used_device_id', width: 110, render: (_: any, r: any) => r.used_device_id || '-' },
    { title: '使用时间', dataIndex: 'used_at', valueType: 'dateTime', width: 170 },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作', valueType: 'option' as const, width: 80,
      render: (_: any, record: any) => [
        <Popconfirm key="del" title="确定删除?" onConfirm={async () => { await cardKeys.remove(record.id); actionRef.current?.reload(); }}>
          <a>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable
        headerTitle="卡密管理"
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          const res = await cardKeys.list(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={columns}
        toolBarRender={() => [
          <Button key="gen" type="primary" icon={<PlusOutlined />} onClick={() => { setGenCount(10); setGenOpen(true); }}>
            生成卡密
          </Button>,
        ]}
      />
      <Modal title="生成卡密" open={genOpen} onCancel={() => setGenOpen(false)} onOk={handleGenerate} confirmLoading={genLoading}>
        <div style={{ marginBottom: 8 }}>请输入要生成的卡密数量（1-100）：</div>
        <InputNumber min={1} max={100} value={genCount} onChange={(v) => setGenCount(v || 1)} style={{ width: '100%' }} />
      </Modal>
    </>
  );
};
