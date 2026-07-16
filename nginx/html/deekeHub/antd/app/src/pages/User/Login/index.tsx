import { login, developerRegister, developerSendSmsCode, developerSendLoginSms } from '@/services/api/api';
import {
  LockOutlined, UserOutlined, PhoneOutlined, SafetyCertificateOutlined, MailOutlined, MobileOutlined,
} from '@ant-design/icons';
import { Alert, Button, message, Form, Input, Segmented } from 'antd';
import React, { useEffect, useState } from 'react';
import { history, useModel, request } from 'umi';
import styles from './index.less';

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 20 }} message={content} type="error" showIcon />
);

const DevLogin: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<any>({});
  const { initialState, setInitialState } = useModel('@@initialState');
  const [captchaImg, setCaptchaImg] = useState<string>('');
  const [captchaKey, setCaptchaKey] = useState<string>('');
  const [isRegister, setIsRegister] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [loginMode, setLoginMode] = useState<'password' | 'sms'>('password');
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
  useEffect(() => { form.resetFields(); }, [isRegister, loginMode]);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) await setInitialState((s) => ({ ...s, currentUser: userInfo }));
  };

  const handleLogin = async (values: any) => {
    if (loginMode === 'sms') {
      if (!values.sms_code) { message.error('请输入短信验证码'); return; }
    } else {
      if (!values.password) { message.error('请输入密码'); return; }
      if (!values.captcha_code) { message.error('请输入图片验证码'); return; }
    }

    try {
      const payload: any = {
        role_type: 'developer',
        phone: values.phone,
        login_mode: loginMode,
      };
      if (loginMode === 'sms') {
        payload.sms_code = values.sms_code;
      } else {
        payload.password = values.password;
        payload.captcha_key = captchaKey;
        payload.captcha_code = values.captcha_code;
      }
      const msg = await login(payload);
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

  const handleSendSms = async (mode: 'login' | 'register') => {
    const phone = form.getFieldValue('phone');
    if (!phone) { message.error('请先输入手机号'); return; }
    const captchaCode = form.getFieldValue('captcha_code');
    if (!captchaCode) { message.error('请先输入图片验证码'); return; }
    setSmsSending(true);
    try {
      const fn = mode === 'login' ? developerSendLoginSms : developerSendSmsCode;
      const res = await fn(phone, captchaKey, captchaCode);
      if (res.code === 0) {
        message.success('验证码已发送');
        setSmsCountdown(60);
        const timer = setInterval(() => setSmsCountdown((n) => { if (n <= 1) { clearInterval(timer); return 0; } return n - 1; }), 1000);
      }
    } catch (e) { message.error('发送失败'); }
    setSmsSending(false);
  };

  const handleRegister = async (values: any) => {
    try {
      const msg = await developerRegister(values);
      if (msg.code === 0) { message.success('注册成功，请登录'); setIsRegister(false); }
    } catch (e) { message.error('注册失败'); }
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
            <div className={styles.title}>{isRegister ? '开发者注册' : '开发者登录'}</div>
            <div className={styles.subtitle}>{isRegister ? '加入平台，管理您的自动化设备' : '专业 Android 自动化设备管理'}</div>
          </div>

          {!isRegister && (
            <Form.Item style={{ marginBottom: 24 }}>
              <Segmented block size="large" value={loginMode}
                onChange={(val) => setLoginMode(val as 'password' | 'sms')}
                options={[
                  { label: '密码登录', value: 'password', icon: <LockOutlined /> },
                  { label: '短信登录', value: 'sms', icon: <MobileOutlined /> },
                ]}
              />
            </Form.Item>
          )}

          {success === false && <LoginMessage content={msg} />}

          <Form form={form} onFinish={isRegister ? handleRegister : handleLogin} size="large" layout="vertical" requiredMark={false}>

            {isRegister && (
              <>
                <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
                  <Input prefix={<UserOutlined className={styles.prefixIcon} />} placeholder="名称（公司/工作室/个人）" />
                </Form.Item>
                <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                  <Input prefix={<PhoneOutlined className={styles.prefixIcon} />} placeholder="手机号" />
                </Form.Item>
                <Form.Item name="captcha_code" rules={[{ required: true, message: '请输入图片验证码' }]}>
                  <Input prefix={<SafetyCertificateOutlined className={styles.prefixIcon} />} placeholder="图片验证码"
                    suffix={<img title="点击刷新" onClick={fetchCaptcha} style={{ width: 90, height: 36, cursor: 'pointer', objectFit: 'contain' }}
                      src={captchaImg || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'} alt="验证码" />}
                  />
                </Form.Item>
                <Form.Item name="sms_code" rules={[{ required: true, message: '请输入短信验证码' }]}>
                  <Input prefix={<MailOutlined className={styles.prefixIcon} />} placeholder="短信验证码"
                    suffix={<Button type="link" size="small" loading={smsSending} disabled={smsCountdown > 0}
                      onClick={() => handleSendSms('register')}>{smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}</Button>}
                  />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined className={styles.prefixIcon} />} placeholder="密码" />
                </Form.Item>
              </>
            )}

            {!isRegister && (
              <>
                <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                  <Input prefix={<PhoneOutlined className={styles.prefixIcon} />} placeholder="手机号" />
                </Form.Item>

                {loginMode === 'password' && (
                  <>
                    <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password prefix={<LockOutlined className={styles.prefixIcon} />} placeholder="密码" />
                    </Form.Item>
                    <Form.Item name="captcha_code" rules={[{ required: true, message: '请输入验证码' }]}>
                      <Input prefix={<SafetyCertificateOutlined className={styles.prefixIcon} />} placeholder="图片验证码"
                        suffix={<img title="点击刷新" onClick={fetchCaptcha} style={{ width: 90, height: 36, cursor: 'pointer', objectFit: 'contain' }}
                          src={captchaImg || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'} alt="验证码" />}
                      />
                    </Form.Item>
                  </>
                )}

                {loginMode === 'sms' && (
                  <>
                    <Form.Item name="captcha_code" rules={[{ required: true, message: '请输入图片验证码' }]}>
                      <Input prefix={<SafetyCertificateOutlined className={styles.prefixIcon} />} placeholder="图片验证码"
                        suffix={<img title="点击刷新" onClick={fetchCaptcha} style={{ width: 90, height: 36, cursor: 'pointer', objectFit: 'contain' }}
                          src={captchaImg || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'} alt="验证码" />}
                      />
                    </Form.Item>
                    <Form.Item name="sms_code" rules={[{ required: true, message: '请输入短信验证码' }]}>
                      <Input prefix={<MailOutlined className={styles.prefixIcon} />} placeholder="短信验证码"
                        suffix={<Button type="link" size="small" loading={smsSending} disabled={smsCountdown > 0}
                          onClick={() => handleSendSms('login')}>{smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}</Button>}
                      />
                    </Form.Item>
                  </>
                )}
              </>
            )}

            <Form.Item style={{ marginBottom: 16 }}>
              <Button type="primary" htmlType="submit" block size="large" style={{ height: 44, borderRadius: 8, fontSize: 15 }}>
                {isRegister ? '注 册' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.loginHint}>
            {!isRegister && (
              <>
                <span>没有账号？<a onClick={() => setIsRegister(true)}>注册开发者账号</a></span>
                <a href="/operator/login">运营登录</a>
              </>
            )}
            {isRegister && <span>已有账号？<a onClick={() => setIsRegister(false)}>返回登录</a></span>}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DevLogin;
