// Suppress deprecation warnings from antd/pro-components React 18 compat
const _oe = console.error;
console.error = (...a: any[]) => {
  const m = typeof a[0] === 'string' ? a[0] : '';
  if (m.includes('Support for defaultProps')) return;
  if (m.includes('findDOMNode')) return;
  if (m.includes('two children with the same key')) return;
  if (m.includes('antd: Dropdown')) return;
  if (m.includes('Duplicated key')) return;
  _oe.call(console, ...a);
};

import Footer from '@/components/Footer';
import RightContent from '@/components/RightContent';
import type { MenuDataItem, Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import { RunTimeLayoutConfig } from 'umi';
import { history } from 'umi';
import defaultSettings from '../config/defaultSettings';
import { requests } from '../config/request';
import { currentUser as queryCurrentUser, config } from './services/api/api';
import 'moment/locale/zh-cn';

const loginPath = '/user/login';
const adminLoginPath = '/admin/login';
const publicPaths = ['/user/login', '/admin/login', '/operator/login'];
const isPublicPath = (pathname: string) =>
  pathname === '/' || publicPaths.some(p => pathname.startsWith(p));

let siteTitle = '自动化平台';
let pageLogo = '/logo.png';

/**
 * 初始化状态
 */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');

    let token = localStorage.getItem('token') || '';

    if (!token) {
      history.push(loginPath);
      return undefined;
    }

    // 临时设置 token 以供请求使用
    const storedToken = localStorage.getItem('token');
    if (!storedToken && token) {
      localStorage.setItem('token', token);
    }

    try {
      const msg = await queryCurrentUser();
      if (msg && msg.data) {
        const user = msg.data;
        // 如果 URL 角色参数存在且不匹配
        if (roleParam && roleParam !== user.role_type) {
          localStorage.removeItem('token');
          history.push(loginPath);
          return undefined;
        }
        return { ...user, role_type: user.role_type };
      }
      return undefined;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('token');
        history.push(loginPath);
      }
      console.error('获取用户信息失败:', error);
      return undefined;
    }
  };

  // 获取站点配置
  try {
    const res = await config();
    if (res.code === 0 && res.data) {
      siteTitle = res.data.name || siteTitle;
      pageLogo = res.data.page_logo || pageLogo;
    }
  } catch (error) {
    console.error('获取配置失败:', error);
  }

  const _isPublic = isPublicPath(history.location.pathname);
  if (!_isPublic) {
    const currentUser = await fetchUserInfo();
    return { fetchUserInfo, currentUser, settings: defaultSettings };
  }
  return { fetchUserInfo, settings: defaultSettings };
}

/** ProLayout 配置 */
const menuGroups: Record<string, { icon: string; children: string[] }> = {
  '设备管理': { icon: 'MobileOutlined', children: ['设备管理', '标签管理'] },
  '工作流管理': { icon: 'ApartmentOutlined', children: ['工作流', '脚本管理'] },
  '任务中心': { icon: 'ScheduleOutlined', children: ['任务管理', '日志管理'] },
  '账单': { icon: 'AccountBookOutlined', children: ['订单列表', '实时画面额度'] },
};

function groupMenuData(menuData: MenuDataItem[]): MenuDataItem[] {
  if (!menuData || menuData.length === 0) return menuData;

  const grouped = new Map<string, MenuDataItem[]>();
  const groupIcons = new Map<string, any>();
  const groupFirstIndex = new Map<string, number>();

  for (let i = 0; i < menuData.length; i++) {
    const item = menuData[i];
    for (const [groupName, groupDef] of Object.entries(menuGroups)) {
      if (groupDef.children.includes(item.name || '')) {
        if (!grouped.has(groupName)) {
          grouped.set(groupName, []);
          groupIcons.set(groupName, item.icon);
          groupFirstIndex.set(groupName, i);
        }
        grouped.get(groupName)!.push({ ...item, icon: undefined });
        break;
      }
    }
  }

  const emitted = new Set<string>();
  const result: MenuDataItem[] = [];
  for (const item of menuData) {
    let isGrouped = false;
    for (const [groupName, groupDef] of Object.entries(menuGroups)) {
      if (groupDef.children.includes(item.name || '')) {
        isGrouped = true;
        if (!emitted.has(groupName)) {
          emitted.add(groupName);
          result.push({
            name: groupName,
            key: groupName,
            path: '/' + groupName,
            icon: groupIcons.get(groupName),
            children: grouped.get(groupName)!,
          } as MenuDataItem);
        }
        break;
      }
    }
    if (!isGrouped) result.push(item);
  }
  return result;
}

export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    title: siteTitle,
    logo: pageLogo || '/logo.png',
    rightContentRender: () => <RightContent />,
    disableContentMargin: false,
    waterMarkProps: {
      content: initialState?.currentUser?.name || initialState?.currentUser?.username,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;

      // 公开页面直接放行
      if (isPublicPath(location.pathname)) {
        return;
      }

      // 已登录，确保 URL 角色参数存在
      if (initialState?.currentUser && location.pathname !== loginPath) {
        const urlParams = new URLSearchParams(location.search);
        if (!urlParams.get('role')) {
          const roleType = initialState.currentUser.role_type;
          if (roleType) {
            const separator = location.search ? '&' : '?';
            history.replace({
              pathname: location.pathname,
              search: location.search + separator + 'role=' + roleType,
            });
          }
        }
        return;
      }

      // 未登录且无 token，跳转登录
      if (!initialState?.currentUser) {
        const hasToken = !!localStorage.getItem('token');
        if (!hasToken) {
          const isAdminPath = location.pathname.startsWith('/admin');
          history.push(isAdminPath ? adminLoginPath : loginPath);
        }
      }
    },
    menuHeaderRender: undefined,
    menuDataRender: groupMenuData,
    childrenRender: (children: any, props: any) => {
      return (
        <>
          {children}
          {!props.location?.pathname?.includes('/login') && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

export const request = requests;
