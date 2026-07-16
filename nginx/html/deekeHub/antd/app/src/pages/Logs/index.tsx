import { logList, taskList } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { useEffect, useState } from 'react';
import { history, useModel } from 'umi';

const fmtSize = (bytes: number) => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const fmtChars = (chars: number) => {
  if (chars >= 100000000) return `${(chars / 1000000).toFixed(1)}M`;
  if (chars >= 100000) return `${(chars / 1000).toFixed(1)}K`;
  if (chars >= 1000) return `${(chars / 1000).toFixed(1)}K`;
  return `${chars}`;
};

const fmtTime = (v: string) => v ? v.replace('T', ' ').replace(/\.\d+Z/, '') : '';

export default () => {
  const { initialState } = useModel('@@initialState');
  const isUser = initialState?.currentUser?.role_type === 'user';

  const [taskOptions, setTaskOptions] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (!isUser) {
      taskList({ pageSize: 1000 }).then(res => {
        if (res.code === 0) setTaskOptions((res.data || []).map((t: any) => ({ label: t.name, value: t.id })));
      });
    }
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '任务', dataIndex: 'task_name', width: 160, ellipsis: true,
      render: (_: any, r: any) => r.task_id ? <a onClick={() => history.push(`/tasks`)}>{r.task_name}</a> : '-',
      valueType: 'select' as const, valueEnum: Object.fromEntries(taskOptions.map(o => [o.value, { text: o.label }])),
      fieldProps: { showSearch: true },
    },
    {
      title: '设备', dataIndex: 'device_name', width: 160, ellipsis: true,
      render: (_: any, r: any) => r.device_name || '-',
    },
    {
      title: '日志文件', dataIndex: 'url', ellipsis: true,
      render: (_: any, r: any) => r.url
        ? <Typography.Link href={r.url} target="_blank">{(r.url as string).split('/').pop()}</Typography.Link>
        : '-',
    },
    { title: '字符数', dataIndex: 'raw_chars', width: 100, align: 'right' as const, render: (_: any, r: any) => fmtChars(r.raw_chars || 0) },
    { title: '压缩大小', dataIndex: 'size', width: 100, align: 'right' as const, render: (_: any, r: any) => fmtSize(r.size || 0) },
    { title: '时间', dataIndex: 'created_at', width: 170, render: (_: any, r: any) => fmtTime(r.created_at) },
  ];

  return (
    <ProTable
      headerTitle="日志管理"
      rowKey="id"
      request={async (params: any) => {
        const res = await logList(params);
        return { data: res.data || [], total: res.total || 0, success: true };
      }}
      columns={columns}
      search={{ labelWidth: 'auto' }}
    />
  );
};
