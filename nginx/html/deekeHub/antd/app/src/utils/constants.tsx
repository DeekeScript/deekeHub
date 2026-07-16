import React from 'react';
import { Space } from 'antd';

// ==================== 设备状态映射 ====================

export const deviceStatusMap: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '待激活' },
  1: { color: 'default', text: '离线' },
  2: { color: 'green', text: '在线' },
  3: { color: 'orange', text: '忙碌' },
};

export const deviceStatusValueEnum = {
  0: '待激活',
  1: '离线',
  2: '在线',
  3: '忙碌',
  expired: '已过期',
};

// ==================== 过期检查 ====================

export const isExpired = (r: any): boolean =>
  r.expired_at && new Date(r.expired_at) < new Date();

// ==================== 画质选项 ====================

export const qualityOptions = [
  { label: '省流模式 (1fps)', value: 1 },
  { label: '标准模式 (5fps)', value: 5 },
  { label: '流畅模式 (10fps)', value: 10 },
];

export const qualityMap: Record<number, string> = {
  1: '省流模式(1fps)',
  5: '标准模式(5fps)',
  10: '流畅模式(10fps)',
};

// ==================== 标签颜色选择器 ====================

export const TAG_COLORS = [
  '#f50', '#2db7f5', '#87d068', '#108ee9', '#ff85c0',
  '#faad14', '#722ed1', '#13c2c2', '#52c41a', '#fa541c',
  '#eb2f96', '#a0d911', '#fadb14', '#1677ff', '#ff7a45',
];

export const ColorPicker: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({ value, onChange }) => (
  <Space wrap>
    {TAG_COLORS.map(c => (
      <div key={c}
        onClick={() => onChange?.(c)}
        style={{
          width: 32, height: 32, borderRadius: 6, backgroundColor: c, cursor: 'pointer',
          border: value === c ? '3px solid #000' : '3px solid transparent',
          boxShadow: value === c ? '0 0 4px rgba(0,0,0,0.3)' : undefined,
          transition: 'all 0.15s',
        }}
      />
    ))}
  </Space>
);

// ==================== 格式化工具 ====================

export const fmtSeconds = (s: number): string => {
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${s % 60}秒`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}时${m}分`;
};

export const fmtSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

export const BYTES_PER_GB = 1073741824;

export const fmtGB = (bytes: number): string => {
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
};
