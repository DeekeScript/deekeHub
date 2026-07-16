import { options, updateOptions, notificationSettings, currentUser, editPassword } from '@/services/api/api';
import { ProCard, ProForm, ProFormText, ProFormDigit, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Checkbox, Form, Input, message, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useModel } from 'umi';

const notifyEvents = [
  { key: 'task_start', label: '任务开始执行通知' },
  { key: 'task_complete', label: '任务执行完成通知' },
  { key: 'device_offline', label: '设备下线通知' },
  { key: 'device_online', label: '设备上线通知' },
];

export default () => {
  const { initialState } = useModel('@@initialState');
  const roleType = initialState?.currentUser?.role_type;
  const isAdmin = roleType === 'super_admin';
  const isDeveloper = roleType === 'developer';

  // Admin Settings
  if (isAdmin) return <AdminSettings />;
  // Developer Settings
  if (isDeveloper) return <DeveloperSettings />;
  // User Settings
  return <UserSettings />;
};

function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alipay');
  const [certStatus, setCertStatus] = useState<Record<string, boolean>>({});
  const [alipayForm] = ProForm.useForm();
  const [smsForm] = ProForm.useForm();
  const [rateForm] = ProForm.useForm();
  const [livekitForm] = ProForm.useForm();
  const [storageForm] = ProForm.useForm();
  const [otherForm] = ProForm.useForm();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await options();
      if (res.code === 0) {
        const vals = res.data;
        alipayForm.setFieldsValue(vals);
        smsForm.setFieldsValue(vals);
        rateForm.setFieldsValue(vals);
        livekitForm.setFieldsValue(vals);
        storageForm.setFieldsValue(vals);
        otherForm.setFieldsValue(vals);
        setCertStatus(vals._cert_status || {});
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (values: any) => {
    const res = await updateOptions(values);
    if (res.code === 0) {
      message.success('保存成功');
      const r = await options();
      if (r.code === 0) setCertStatus(r.data._cert_status || {});
    }
  };

  const certLabel = (key: string, fileName: string) => (
    <span>{fileName}{certStatus[key] ? <Tag color="green" style={{ marginLeft: 8 }}>已配置</Tag> : <Tag color="default" style={{ marginLeft: 8 }}>未配置</Tag>}</span>
  );

  const tabItems = [
    {
      key: 'alipay', label: '支付宝配置',
      children: (
        <ProForm form={alipayForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存支付宝配置' } }}>
          <ProFormText name="alipay_app_id" label="应用ID" placeholder="支付宝开放平台APPID" />
          <ProFormSelect name="alipay_sign_type" label="签名方式" options={[{ label: 'RSA2', value: 'RSA2' }, { label: 'RSA', value: 'RSA' }]} />
          <ProFormText name="alipay_notify_url" label="异步回调地址" />
          <div style={{ color: '#999', fontSize: 12, margin: '16px 0 8px' }}>将证书/PEM 文件内容完整粘贴到下方文本框中</div>
          <ProFormTextArea name="alipay_cert_content" label={certLabel('alipay_cert', 'alipayCertPublicKey_RSA2.crt')} fieldProps={{ rows: 6, style: { fontFamily: 'monospace', fontSize: 12 } }} />
          <ProFormTextArea name="alipay_root_cert_content" label={certLabel('alipay_root_cert', 'alipayRootCert.crt')} fieldProps={{ rows: 6, style: { fontFamily: 'monospace', fontSize: 12 } }} />
          <ProFormTextArea name="app_cert_content" label={certLabel('app_cert', 'appCertPublicKey.crt')} fieldProps={{ rows: 6, style: { fontFamily: 'monospace', fontSize: 12 } }} />
          <ProFormTextArea name="merchant_private_key_content" label={certLabel('merchant_private', 'merchant_private_key.pem')} fieldProps={{ rows: 8, style: { fontFamily: 'monospace', fontSize: 12 } }} />
        </ProForm>
      ),
    },
    {
      key: 'sms', label: '阿里云短信',
      children: (
        <ProForm form={smsForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存短信配置' } }}>
          <ProFormText name="sms_aliyun_access_key" label="AccessKey" />
          <ProFormText.Password name="sms_aliyun_access_secret" label="AccessSecret" />
          <ProFormText name="sms_aliyun_sign_name" label="短信签名" />
          <ProFormText name="sms_aliyun_template_code" label="短信模板Code" />
        </ProForm>
      ),
    },
    {
      key: 'rate', label: '频控配置',
      children: (
        <ProForm form={rateForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存频控配置' } }}>
          <ProCard title="登录频控（IP维度）" bordered style={{ marginBottom: 16 }}>
            <ProFormDigit name="rate_limit_login_per_minute" label="每分钟限制" min={1} />
            <ProFormDigit name="rate_limit_login_per_hour" label="每小时限制" min={1} />
            <ProFormDigit name="rate_limit_login_per_day" label="每天限制" min={1} />
          </ProCard>
          <ProCard title="注册频控（IP维度）" bordered style={{ marginBottom: 16 }}>
            <ProFormDigit name="rate_limit_register_per_minute" label="每分钟限制" min={1} />
            <ProFormDigit name="rate_limit_register_per_hour" label="每小时限制" min={1} />
            <ProFormDigit name="rate_limit_register_per_day" label="每天限制" min={1} />
          </ProCard>
          <ProCard title="短信频控（IP维度）" bordered>
            <ProFormDigit name="rate_limit_sms_per_minute" label="每分钟限制" min={1} />
            <ProFormDigit name="rate_limit_sms_per_hour" label="每小时限制" min={1} />
            <ProFormDigit name="rate_limit_sms_per_day" label="每天限制" min={1} />
          </ProCard>
        </ProForm>
      ),
    },
    {
      key: 'livekit', label: 'LiveKit 配置',
      children: (
        <ProForm form={livekitForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存 LiveKit 配置' } }}>
          <ProFormText name="livekit_api_key" label="API Key" />
          <ProFormText.Password name="livekit_api_secret" label="API Secret" />
          <ProFormText name="livekit_host" label="WS Host" placeholder="ws://192.168.31.150:7880" />
        </ProForm>
      ),
    },
    {
      key: 'storage', label: 'COS/OSS 配置',
      children: (
        <ProForm form={storageForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存存储配置' } }}>
          <ProFormSelect name="storage_provider" label="存储服务商"
            options={[
              { label: '腾讯云 COS', value: 'cos' },
              { label: '阿里云 OSS', value: 'oss' },
            ]} />
          <ProFormText name="storage_bucket" label="Bucket 名称" />
          <ProFormText name="storage_region" label="地域（region）" placeholder="如 ap-guangzhou" />
          <ProFormText name="storage_access_key" label="SecretId / AccessKey" />
          <ProFormText.Password name="storage_secret_key" label="SecretKey" />
          <ProFormText name="storage_cdn_domain" label="CDN 加速域名（可选）" placeholder="https://cdn.example.com" />
        </ProForm>
      ),
    },
    {
      key: 'other', label: '其他设置',
      children: (
        <ProForm form={otherForm} onFinish={handleSave} submitter={{ searchConfig: { submitText: '保存其他设置' } }}>
          <ProFormText name="site_name" label="站点名称" />
          <ProFormText name="page_logo" label="页面Logo路径" />
          <ProFormDigit name="log_retention_days" label="日志保留天数" min={1} max={365} />
          <ProFormDigit name="jwt_expire_days" label="JWT过期天数" min={1} max={365} />
          <ProCard title="任务日志限制" bordered style={{ marginTop: 16 }}>
            <ProFormDigit name="storage_log_max_chars" label="单条日志最大字符数" min={128} max={4096} initialValue={1024} />
            <ProFormDigit name="storage_log_daily_quota_chars" label="每日日志写入字符总上限" min={0} max={1000000000} initialValue={0} fieldProps={{ placeholder: '0 表示不限制' }} />
          </ProCard>
        </ProForm>
      ),
    },
  ];

  return (
    <ProCard title="系统设置" loading={loading}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </ProCard>
  );
}

function DeveloperSettings() {
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const res = await currentUser();
        if (res.code === 0 && res.data) {
          const d = res.data;
          form.setFieldsValue({
            dingtalk_webhook: d.dingtalk_webhook || '',
            wecom_webhook: d.wecom_webhook || '',
            notify_events: d.notify_events?.length ? d.notify_events : notifyEvents.map(e => e.key),
          });
        }
      } finally { setLoading(false); }
    })();
  }, [form]);

  return (
    <ProCard title="通知设置" loading={loading}>
      <Form form={form} layout="vertical" onFinish={async (values) => { await notificationSettings(values); message.success('通知设置已保存'); }}>
        <Tabs defaultActiveKey="robot" items={[
          {
            key: 'robot', label: '通知机器人',
            children: (
              <div style={{ maxWidth: 520 }}>
                <Form.Item name="dingtalk_webhook" label="钉钉机器人Webhook地址">
                  <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
                </Form.Item>
                <Form.Item name="wecom_webhook" label="企业微信机器人Webhook地址">
                  <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
                </Form.Item>
              </div>
            ),
          },
          {
            key: 'events', label: '通知事件',
            children: (
              <Form.Item name="notify_events" style={{ marginBottom: 0 }}>
                <Checkbox.Group>
                  {notifyEvents.map((e) => <div key={e.key} style={{ marginBottom: 12 }}><Checkbox value={e.key}>{e.label}</Checkbox></div>)}
                </Checkbox.Group>
              </Form.Item>
            ),
          },
        ]} />
        <Form.Item style={{ marginTop: 16 }}><Button type="primary" htmlType="submit">保存设置</Button></Form.Item>
      </Form>
    </ProCard>
  );
}

function UserSettings() {
  return (
    <ProCard title="密码修改">
      <ProForm onFinish={async (values: any) => { await editPassword(values); message.success('密码修改成功'); return true; }}
        submitter={{ searchConfig: { submitText: '修改密码' } }}>
        <ProFormText.Password name="old_password" label="旧密码" rules={[{ required: true }]} />
        <ProFormText.Password name="password" label="新密码" rules={[{ required: true, min: 6 }]} />
        <ProFormText.Password name="password_confirmation" label="确认新密码" dependencies={['password']}
          rules={[{ required: true }, ({ getFieldValue }: any) => ({ validator(_: any, value: string) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject('两次密码不一致'); } })]} />
      </ProForm>
    </ProCard>
  );
}
