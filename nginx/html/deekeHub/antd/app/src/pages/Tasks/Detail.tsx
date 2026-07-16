import { taskDetail, taskLogs, taskLogExport } from '@/services/api/api';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { Button, List, Select, Spin, Tag, Drawer, Typography, message, Pagination } from 'antd';
import { useEffect, useState } from 'react';
import { useModel } from 'umi';

const taskStatusMap: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '等待中' },
  1: { color: 'blue', text: '运行中' },
  2: { color: 'green', text: '已完成' },
  3: { color: 'red', text: '失败' },
  4: { color: 'default', text: '已取消' },
};

interface Props {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailDrawer({ taskId, open, onClose }: Props) {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;

  const [task, setTask] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterTdId, setFilterTdId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchTask = async (id: number) => {
    setLoading(true);
    setTask(null);
    setLogs([]);
    setPage(1);
    const res = await taskDetail(id);
    if (res.code === 0) setTask(res.data);
    setLoading(false);
  };

  const fetchLogs = async (pageNum: number, taskDeviceId?: number) => {
    if (!taskId) return;
    const res = await taskLogs(taskId, { task_device_id: taskDeviceId, page: pageNum, pageSize: 100 });
    if (res.code === 0) {
      setLogs(res.data?.data || res.data || []);
      setLogTotal(res.data?.total || 0);
    }
  };

  useEffect(() => {
    if (taskId && open) { fetchTask(taskId); fetchLogs(1); }
  }, [taskId, open]);

  const handleFilterChange = (v: number | undefined) => {
    setFilterTdId(v);
    setPage(1);
    fetchLogs(1, v);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchLogs(p, filterTdId);
  };

  const handleExport = async () => {
    if (!filterTdId) { message.warning('请先选择设备'); return; }
    setExporting(true);
    const res = await taskLogExport(taskId!, filterTdId);
    if (res.code === 0) {
      message.success('日志已导出');
      if (res.data?.url) window.open(res.data.url, '_blank');
      // refresh task to get updated log files
      const taskRes = await taskDetail(taskId!);
      if (taskRes.code === 0) setTask(taskRes.data);
    }
    setExporting(false);
  };

  if (!open) return null;

  const fmtTime = (v: string) => v ? v.replace('T', ' ').replace(/\.\d+Z/, '') : '';

  return (
    <Drawer title={task ? task.name : '任务详情'} open={open} onClose={onClose} width={780} maskClosable destroyOnClose>
      {loading ? <Spin style={{ display: 'block', margin: '100px auto' }} /> : !task ? <div>任务不存在</div> : (
        <>
          <ProDescriptions column={3} bordered size="small">
            <ProDescriptions.Item label="工作流">{task.workflow?.name}</ProDescriptions.Item>
            <ProDescriptions.Item label="设备数">{task.task_devices?.length || 0}</ProDescriptions.Item>
            <ProDescriptions.Item label="创建时间">{fmtTime(task.created_at)}</ProDescriptions.Item>
          </ProDescriptions>

          <ProCard title="设备执行状态" size="small" style={{ marginTop: 16 }}>
            {(task.task_devices || []).map((td: any) => {
              const ds = taskStatusMap[td.status] || { color: 'default', text: '-' };
              return (
                <div key={td.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ marginRight: 12, fontWeight: 500 }}>{td.device?.name || td.device_id}</span>
                    <span style={{ color: '#999', fontSize: 12 }}>{td.device?.android_id || '-'}</span>
                  </div>
                  {td.error_reason && (
                    <Typography.Paragraph copyable={{ text: td.error_reason }} style={{ color: '#ff4d4f', fontSize: 12, width: 200, textAlign: 'right', marginRight: 12, marginBottom: 0, maxHeight: 48, overflowY: 'auto', wordBreak: 'break-all', lineHeight: '16px' }}>{td.error_reason}</Typography.Paragraph>
                  )}
                  <span style={{ color: '#999', fontSize: 12, width: 170, textAlign: 'right', marginRight: 12 }}>{td.started_at ? `开始: ${fmtTime(td.started_at)}` : ''}</span>
                  <span style={{ color: '#999', fontSize: 12, width: 170, textAlign: 'right', marginRight: 12 }}>{td.finished_at ? `结束: ${fmtTime(td.finished_at)}` : ''}</span>
                  <Tag color={ds.color} style={{ minWidth: 56, textAlign: 'center' }}>{ds.text}</Tag>
                </div>
              );
            })}
          </ProCard>

          <ProCard title="脚本执行日志" style={{ marginTop: 16 }} size="small"
            extra={
              <div style={{ display: 'flex', gap: 8 }}>
                <Select placeholder="全部设备" allowClear style={{ width: 200 }} value={filterTdId} onChange={handleFilterChange}>
                  {(task.task_devices || []).map((td: any) => (
                    <Select.Option key={td.id} value={td.id}>{td.device?.name || td.id}</Select.Option>
                  ))}
                </Select>
                <Button size="small" loading={exporting} onClick={handleExport}>导出日志</Button>
              </div>
            }>
            <List
              dataSource={logs}
              renderItem={(log: any) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'orange' : 'blue'} style={{ fontSize: 11, lineHeight: '18px' }}>{log.level}</Tag>
                        <span style={{ color: '#bbb', fontSize: 11 }}>{fmtTime(log.created_at)}</span>
                      </span>
                    }
                    description={<pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, color: '#333' }}>{log.message}</pre>}
                  />
                </List.Item>
              )}
            />
            {logTotal > 0 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination simple size="small" current={page} pageSize={100} total={logTotal} onChange={handlePageChange} />
              </div>
            )}
          </ProCard>

          {(task.task_log_files || []).length > 0 && (
            <ProCard title="日志文件" size="small" style={{ marginTop: 16 }}>
              {task.task_log_files.map((f: any) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <Typography.Link href={f.url} target="_blank" download>
                    {`task_${task.id}_device_${f.task_device_id}.log.gz`}
                  </Typography.Link>
                  <span style={{ color: '#999', fontSize: 12 }}>
                    {f.size >= 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}
                  </span>
                  <span style={{ color: '#bbb', fontSize: 11 }}>{fmtTime(f.created_at)}</span>
                </div>
              ))}
            </ProCard>
          )}
        </>
      )}
    </Drawer>
  );
}
