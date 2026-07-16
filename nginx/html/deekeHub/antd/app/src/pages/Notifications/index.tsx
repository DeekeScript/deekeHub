import { notificationList, notificationRead } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { Badge } from 'antd';
import { useRef } from 'react';

export default () => {
  const actionRef = useRef<any>();

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '标题', dataIndex: 'title' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'is_read',
      width: 100,
      render: (_: any, r: any) => r.is_read ? <Badge status="default" text="已读" /> : <Badge status="processing" text="未读" />,
      valueEnum: { 0: '未读', 1: '已读' },
    },
    { title: '时间', dataIndex: 'created_at', valueType: 'dateTime', width: 180 },
    {
      title: '操作',
      valueType: 'option' as const,
      width: 80,
      render: (_: any, record: any) => [
        !record.is_read && (
          <a key="read" onClick={async () => {
            await notificationRead(record.id);
            actionRef.current?.reload();
          }}>标为已读</a>
        ),
      ],
    },
  ];

  return (
    <ProTable
      headerTitle="站内信"
      actionRef={actionRef}
      rowKey="id"
      request={async (params) => {
        const res = await notificationList({ ...params, pageSize: params.pageSize, current: params.current });
        return { data: res.data || [], total: res.total || 0, success: true };
      }}
      columns={columns}
      search={false}
    />
  );
};
