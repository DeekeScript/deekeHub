import { adminAllDeveloperLogs } from '@/services/api/api';
import { ProTable } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { fmtGB } from '@/utils/constants';

const actionMap: Record<string, { color: string; label: string }> = {
  adjust_devices: { color: 'blue', label: '调整设备数' },
  adjust_points: { color: 'orange', label: '调整实时画面额度' },
  toggle_status: { color: 'red', label: '启停账号' },
};

export default () => {
  return (
    <ProTable
      headerTitle="操作日志"
      rowKey="id"
      request={async (params: any) => {
        const res = await adminAllDeveloperLogs({
          ...params,
          developer_id: params.developer_id || undefined,
          action: params.action || undefined,
        });
        return { data: res.data || [], total: res.total || 0, success: true };
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
        { title: '开发商', dataIndex: ['developer', 'name'], ellipsis: true },
        { title: '开发商ID', dataIndex: 'developer_id', hideInTable: true, valueType: 'digit' },
        {
          title: '操作类型', dataIndex: 'action', width: 130,
          render: (_: any, r: any) => {
            const m = actionMap[r.action] || { color: 'default', label: r.action };
            return <Tag color={m.color}>{m.label}</Tag>;
          },
          valueEnum: {
            adjust_devices: '调整设备数',
            adjust_points: '调整实时画面额度',
            toggle_status: '启停账号',
          },
        },
        {
          title: '变化量', dataIndex: 'change_amount', width: 120, align: 'center',
          render: (_: any, r: any) => {
            const val = r.action === 'adjust_points' ? fmtGB(r.change_amount) : r.change_amount;
            return r.change_amount > 0
              ? <span style={{ color: '#52c41a', fontWeight: 500 }}>+{val}</span>
              : <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{val}</span>;
          },
        },
        { title: '操作前', dataIndex: 'before_value', width: 120, align: 'right',
          render: (_: any, r: any) => r.action === 'adjust_points' ? fmtGB(r.before_value) : r.before_value },
        { title: '操作后', dataIndex: 'after_value', width: 120, align: 'right',
          render: (_: any, r: any) => r.action === 'adjust_points' ? fmtGB(r.after_value) : r.after_value },
        { title: '原因', dataIndex: 'reason', ellipsis: true },
        { title: '操作人', dataIndex: 'operator', width: 100 },
      ]}
      search={{ labelWidth: 'auto' }}
    />
  );
};
