import { login } from '@/services/api/api';
import { LockOutlined, PhoneOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { history, useModel, request } from 'umi';
import styles from './Login/index.less';

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 20 }} message={content} type="error" showIcon />
);

const OperatorLogin: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<any>({});
  const { initialState, setInitialState } = useModel('@@initialState');
  const [captchaImg, setCaptchaImg] = useState<string>('');
  const [captchaKey, setCaptchaKey] = useState<string>('');
  const [form] = Form.useForm();

  const fetchCaptcha = async () => {
    try {
      const res = await request<API.ApiResponse>('/api/verify', { method: 'GET' });
      if (res.code === 0 && res.data) {
        setCaptchaImg(res.data.img || '');
        setCaptchaKey(res.data.key || '');
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { fetchCaptcha(); }, []);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) await setInitialState((s) => ({ ...s, currentUser: userInfo }));
  };

  const handleLogin = async (values: any) => {
    try {
      const msg = await login({
        role_type: 'user',
        phone: values.phone,
        developer_phone: values.developer_phone,
        password: values.password,
        captcha_key: captchaKey, captcha_code: values.captcha_code,
      });
      if (msg.code === 0) {
        message.success('登录成功');
        localStorage.setItem('token', msg.data.token);
        localStorage.setItem('roleType', msg.data.role_type);
        await fetchUserInfo();
        history.push('/welcome');
        return;
      }
      fetchCaptcha();
      setUserLoginState({ success: false, msg: msg.msg });
    } catch (error) {
      message.error('登录失败，请重试');
      fetchCaptcha();
    }
  };

  const { success, msg } = userLoginState;

  return (
    <div className={styles.container}>
      <a href="/" className={styles.backHome}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回首页
      </a>
      <div className={styles.wrap}>
        {/* Left: tech visual */}
        <div className={styles.visual}>
          <div className={styles.visualGrid} />
          <div className={`${styles.visualOrb} ${styles.visualOrb1}`} />
          <div className={`${styles.visualOrb} ${styles.visualOrb2}`} />
          <span className={`${styles.visualDot} ${styles.vd1}`} />
          <span className={`${styles.visualDot} ${styles.vd2}`} />
          <span className={`${styles.visualDot} ${styles.vd3}`} />
          <span className={`${styles.visualDot} ${styles.vd4}`} />
          <span className={`${styles.visualDot} ${styles.vd5}`} />
          <span className={`${styles.visualDot} ${styles.vd6}`} />

          <div className={styles.visualBrand}>
            <img className={styles.visualBrandLogo} alt="DeekeHub" src="/logo.png" />
            <h2 className={styles.visualBrandTitle}>DeekeHub</h2>
            <p className={styles.visualBrandDesc}>智能多设备自动化管理平台</p>
          </div>
        </div>

        {/* Right: login form */}
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <div className={styles.header}>
              <div className={styles.title}>运营登录</div>
              <div className={styles.subtitle}>请输入您的手机号和密码</div>
            </div>

            {success === false && <LoginMessage content={msg} />}

            <Form form={form} onFinish={handleLogin} size="large" layout="vertical" requiredMark={false}>
              <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input prefix={<PhoneOutlined className={styles.prefixIcon} />} placeholder="手机号" />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<LockOutlined className={styles.prefixIcon} />} placeholder="密码" />
              </Form.Item>

              <Form.Item name="captcha_code" rules={[{ required: true, message: '请输入验证码' }]}>
                <Input prefix={<SafetyCertificateOutlined className={styles.prefixIcon} />} placeholder="图片验证码"
                  suffix={<img title="点击刷新" onClick={fetchCaptcha} style={{ width: 90, height: 36, cursor: 'pointer', objectFit: 'contain' }}
                    src={captchaImg || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'} alt="验证码" />}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 16 }}>
                <Button type="primary" htmlType="submit" block size="large" style={{ height: 44, borderRadius: 8, fontSize: 15 }}>
                  登 录
                </Button>
              </Form.Item>
            </Form>

            <div className={styles.loginHint}>
              <a href="/user/login">开发者登录</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorLogin;
