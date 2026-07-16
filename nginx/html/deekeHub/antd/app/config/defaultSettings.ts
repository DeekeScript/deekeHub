import { Settings as LayoutSettings } from '@ant-design/pro-components';

const Settings: LayoutSettings & {
  pwa?: boolean;
  logo?: string | boolean;
} = {
  navTheme: 'light',
  // 拂晓蓝
  primaryColor: '#1890ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: '后台管理系统',
  pwa: false,
  iconfontUrl: '//at.alicdn.com/t/c/font_3859213_3qci1afgpnb.js'
};

export default Settings;
