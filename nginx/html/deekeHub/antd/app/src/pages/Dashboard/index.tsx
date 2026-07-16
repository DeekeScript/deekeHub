import { dashboard } from '@/services/api/api';
import { StatisticCard } from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { useModel } from 'umi';
import { TeamOutlined, MobileOutlined, CodeOutlined, ThunderboltOutlined, ApartmentOutlined, ScheduleOutlined } from '@ant-design/icons';
import { fmtGB } from '@/utils/constants';

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isAdmin = roleType === 'super_admin';
  const isDeveloper = roleType === 'developer';

  const [data, setData] = useState<any>({});

  useEffect(() => {
    dashboard().then(res => { if (res.code === 0) setData(res.data); });
  }, []);

  if (isAdmin) {
    return (
      <>
        <StatisticCard.Group>
          <StatisticCard statistic={{ title: '开发者', value: data.developer_count || 0, icon: <TeamOutlined /> }} />
          <StatisticCard statistic={{ title: '运营', value: data.user_count || 0, icon: <TeamOutlined /> }} />
          <StatisticCard statistic={{ title: '设备', value: `${data.device_count || 0} / ${data.online_device_count || 0}`, icon: <MobileOutlined />, description: '总数 / 在线' }} />
          <StatisticCard statistic={{ title: '脚本', value: data.script_count || 0, icon: <CodeOutlined /> }} />
          <StatisticCard statistic={{ title: '工作流', value: data.workflow_count || 0, icon: <ApartmentOutlined /> }} />
          <StatisticCard statistic={{ title: '任务', value: `${data.task_count || 0} / ${data.running_task_count || 0}`, icon: <ScheduleOutlined />, description: '总数 / 运行中' }} />
        </StatisticCard.Group>
        <StatisticCard.Group style={{ marginTop: 16 }}>
          <StatisticCard statistic={{ title: '累计额度', value: fmtGB(data.total_points ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '可分配额度', value: fmtGB(data.available_points ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '已分配额度', value: fmtGB(data.allocated_points ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '已消耗额度', value: fmtGB(data.consumed_points ?? 0), icon: <ThunderboltOutlined /> }} />
        </StatisticCard.Group>
      </>
    );
  }

  if (isDeveloper) {
    return (
      <>
        <StatisticCard.Group>
          <StatisticCard statistic={{ title: '运营', value: data.user_count || 0, icon: <TeamOutlined /> }} />
          <StatisticCard statistic={{ title: '设备', value: `${data.device_count || 0}`, icon: <MobileOutlined />, description: `在线 ${data.online_device_count || 0} 台` }} />
          <StatisticCard statistic={{ title: '脚本数', value: data.script_count || 0, icon: <CodeOutlined /> }} />
          <StatisticCard statistic={{ title: '工作流', value: data.workflow_count || 0, icon: <ApartmentOutlined /> }} />
          <StatisticCard statistic={{ title: '任务', value: `${data.task_count || 0} / ${data.running_task_count || 0}`, icon: <ScheduleOutlined />, description: '总数 / 运行中' }} />
        </StatisticCard.Group>
        <StatisticCard.Group style={{ marginTop: 16 }}>
          <StatisticCard statistic={{ title: '累计额度', value: fmtGB(data.total_points ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '可分配额度', value: fmtGB(data.frame_balance ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '已分配额度', value: fmtGB(data.allocated_points ?? 0), icon: <ThunderboltOutlined /> }} />
          <StatisticCard statistic={{ title: '已消耗额度', value: fmtGB(data.consumed_points ?? 0), icon: <ThunderboltOutlined /> }} />
        </StatisticCard.Group>
      </>
    );
  }

  // User dashboard
  return (
    <>
      <StatisticCard.Group>
        <StatisticCard statistic={{ title: '设备', value: `${data.device_count || 0} / ${data.online_device_count || 0}`, icon: <MobileOutlined />, description: '总数 / 在线' }} />
        <StatisticCard statistic={{ title: '任务', value: `${data.task_count || 0} / ${data.running_task_count || 0}`, icon: <ScheduleOutlined />, description: '总数 / 运行中' }} />
      </StatisticCard.Group>
      <StatisticCard.Group style={{ marginTop: 16 }}>
        <StatisticCard statistic={{ title: '总额度', value: fmtGB(data.total_points ?? 0), icon: <ThunderboltOutlined /> }} />
        <StatisticCard statistic={{ title: '剩余额度', value: fmtGB(data.frame_balance ?? 0), icon: <ThunderboltOutlined /> }} />
        <StatisticCard statistic={{ title: '已消耗额度', value: fmtGB(data.consumed_points ?? 0), icon: <ThunderboltOutlined /> }} />
      </StatisticCard.Group>
    </>
  );
};
