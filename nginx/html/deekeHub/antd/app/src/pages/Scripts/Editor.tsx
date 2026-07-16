import { scripts, scriptDetail } from '@/services/api/api';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Form, Input, message, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, history } from 'umi';
import MonacoEditor from '@/components/MonacoEditor';

export default () => {
  const { id } = useParams<{ id: string }>();
  const scriptId = Number(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const res = await scriptDetail(scriptId);
        if (res.code === 0) {
          form.setFieldsValue({ name: res.data.name, remark: res.data.remark });
          setContent(res.data.content || '');
        }
      } finally { setLoading(false); }
    })();
  }, [scriptId]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await scripts.update(scriptId, { ...values, content });
      message.success('保存成功');
      history.push('/scripts');
    } catch { setSaving(false); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '120px auto' }} />;

  return (
    <PageContainer title="脚本编辑" onBack={() => history.push('/scripts')}>
      <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
        <Form.Item name="name" label="脚本名称" rules={[{ required: true }]}>
          <Input placeholder="请输入脚本名称" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea placeholder="请输入备注" rows={2} />
        </Form.Item>
        <Form.Item label="脚本内容">
          <MonacoEditor value={content} onChange={setContent} language="javascript" height="calc(100vh - 400px)" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSave} loading={saving}>保存</Button>
        </Form.Item>
      </Form>
    </PageContainer>
  );
};
