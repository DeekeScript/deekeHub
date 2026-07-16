import { adminPlans } from '@/services/api/api';
import { PlusOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormDigit, ProFormSelect, ProFormMoney, ProFormGroup } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useRef, useState } from 'react';

const cycleLabel: Record<string, string> = { day: '天', month: '月', year: '年' };

export default () => {
  const actionRef = useRef<any>();
  const [editVisible, setEditVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<any>({});
  const [addVisible, setAddVisible] = useState(false);
  const [addType, setAddType] = useState<string>('device');
  const [editType, setEditType] = useState<string>('device');

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '类型', dataIndex: 'type',
      render: (_: any, r: any) => r.type === 'device' ? <Tag color="blue">设备套餐</Tag> : <Tag color="orange">实时画面额度套餐</Tag>,
      valueEnum: { device: '设备套餐', frame: '实时画面额度套餐' },
    },
    { title: '名称', dataIndex: 'name' },
    { title: '时长', render: (_: any, r: any) => `${r.unit_count || 1}${cycleLabel[r.billing_cycle] || '月'}` },
    { title: '配额', dataIndex: 'quota', render: (_: any, r: any) => r.type === 'frame' ? `${r.quota} GB` : `${r.quota} 台` },
    { title: '价格', dataIndex: 'price', render: (_: any, r: any) => `¥${r.price}` },
    { title: '营销文案', dataIndex: 'slogan', ellipsis: true },
    { title: '赠送天数', dataIndex: 'bonus_days' },
    { title: '状态', dataIndex: 'status', render: (_: any, r: any) => r.status ? <Tag color="green">上架</Tag> : <Tag color="default">下架</Tag> },
    {
      title: '操作', valueType: 'option' as const, width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" onClick={() => { setEditRecord(record); setEditType(record.type || 'device'); setEditVisible(true); }}>编辑</Button>
          <Popconfirm key="del" title="确定删除?" onConfirm={async () => { await adminPlans.remove(record.id); actionRef.current?.reload(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable
        headerTitle="套餐列表"
        actionRef={actionRef}
        rowKey="id"
        request={async (params: any) => {
          const res = await adminPlans.list(params);
          return { data: res.data || [], total: res.total || 0, success: true };
        }}
        columns={columns}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setAddVisible(true)}>创建套餐</Button>,
        ]}
      />
      <ModalForm title="创建套餐" open={addVisible} onOpenChange={setAddVisible}
        onFinish={async (values: any) => {
          await adminPlans.add(values);
          message.success('创建成功');
          setAddVisible(false);
          actionRef.current?.reload();
          return true;
        }}>
        <ProFormSelect name="type" label="类型" options={[{ label: '设备套餐', value: 'device' }, { label: '实时画面额度套餐', value: 'frame' }]} rules={[{ required: true }]} fieldProps={{ onChange: (v) => setAddType(v as string) }} />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormDigit name="quota" label={addType === 'frame' ? '流量(GB)' : '设备数量(台)'} rules={[{ required: true }]} initialValue={1} fieldProps={{ precision: addType === 'frame' ? 2 : 0 }} />
        <ProFormGroup title="时长">
          <ProFormDigit name="unit_count" label="数量" rules={[{ required: true }]} initialValue={1} width="sm" />
          <ProFormSelect name="billing_cycle" label="周期" options={[{ label: '天', value: 'day' }, { label: '月', value: 'month' }, { label: '年', value: 'year' }]} rules={[{ required: true }]} width="sm" />
        </ProFormGroup>
        <ProFormMoney name="price" label="价格(元)" rules={[{ required: true }]} />
        <ProFormText name="slogan" label="营销文案" />
        <ProFormDigit name="bonus_days" label="赠送天数" initialValue={0} />
        <ProFormSelect name="status" label="状态" options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]} initialValue={1} />
      </ModalForm>
      <ModalForm title="编辑套餐" key={editRecord.id} open={editVisible} onOpenChange={setEditVisible} initialValues={editRecord}
        onFinish={async (values: any) => {
          await adminPlans.update(editRecord.id, values);
          message.success('更新成功');
          setEditVisible(false);
          actionRef.current?.reload();
          return true;
        }}>
        <ProFormSelect name="type" label="类型" options={[{ label: '设备套餐', value: 'device' }, { label: '实时画面额度套餐', value: 'frame' }]} fieldProps={{ onChange: (v) => setEditType(v as string) }} />
        <ProFormText name="name" label="名称" />
        <ProFormDigit name="quota" label={editType === 'frame' ? '流量(GB)' : '设备数量(台)'} fieldProps={{ precision: editType === 'frame' ? 2 : 0 }} />
        <ProFormGroup title="时长">
          <ProFormDigit name="unit_count" label="数量" width="sm" />
          <ProFormSelect name="billing_cycle" label="周期" options={[{ label: '天', value: 'day' }, { label: '月', value: 'month' }, { label: '年', value: 'year' }]} width="sm" />
        </ProFormGroup>
        <ProFormMoney name="price" label="价格(元)" />
        <ProFormText name="slogan" label="营销文案" />
        <ProFormDigit name="bonus_days" label="赠送天数" />
        <ProFormSelect name="status" label="状态" options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]} />
      </ModalForm>
    </>
  );
};
