import { outLogin, editPassword } from '@/services/api/api';
import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { DrawerForm, ProFormText } from '@ant-design/pro-components';
import { Avatar, Menu, message, Spin } from 'antd';
import type { ItemType } from 'antd/lib/menu/hooks/useItems';
import type { MenuInfo } from 'rc-menu/lib/interface';
import React, { useCallback } from 'react';
import { history, useModel } from 'umi';
import HeaderDropdown from '../HeaderDropdown';
import styles from './index.less';

export type GlobalHeaderRightProps = { menu?: boolean };

const roleLabels: Record<string, string> = {
  super_admin: '超管',
  developer: '开发者',
  user: '运营',
};

const loginOut = async () => {
  const roleType = localStorage.getItem('roleType') || '';
  await outLogin();
  localStorage.removeItem('token');
  localStorage.removeItem('roleType');
  if (roleType === 'super_admin') {
    history.replace('/admin/login');
  } else if (roleType === 'user') {
    history.replace('/operator/login');
  } else {
    history.replace('/user/login');
  }
};

const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({ menu }) => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const onMenuClick = useCallback(
    (event: MenuInfo) => {
      if (event.key === 'logout') {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
        loginOut();
      }
    },
    [setInitialState],
  );

  const loading = (
    <span className={`${styles.action} ${styles.account}`}>
      <Spin size="small" style={{ marginLeft: 8, marginRight: 8 }} />
    </span>
  );

  if (!initialState) return loading;

  const { currentUser } = initialState;
  if (!currentUser || (!currentUser.name && !currentUser.username)) return loading;

  const displayName = currentUser.name || currentUser.username || '';
  const firstChar = displayName.charAt(0);
  const roleLabel = roleLabels[currentUser.role_type] || '';

  const avatarColor = (() => {
    const map: Record<string, { bg: string; fg: string }> = {
      developer: { bg: '#bae7ff', fg: '#096dd9' },
      super_admin: { bg: '#ffd591', fg: '#d46b08' },
      user: { bg: '#d9f7be', fg: '#389e0d' },
    };
    return map[currentUser.role_type] || { bg: '#e8e8e8', fg: '#595959' };
  })();

  const menuItems: ItemType[] = [
    ...(menu ? [{
      key: 'settings',
      icon: <SettingOutlined />,
      label: (
        <DrawerForm
          trigger={<span>密码修改</span>}
          title="密码设置"
          layout="horizontal"
          autoFocusFirstInput
          drawerProps={{ destroyOnClose: true }}
          submitTimeout={2000}
          onFinish={async (values: any) => {
            const res = await editPassword({ old_password: values.old_password, password: values.password });
            if (res.code === 0) {
              message.success(res.msg);
              setTimeout(() => loginOut(), 700);
            }
          }}
          width="420px"
        >
          <ProFormText rules={[{ required: true, message: '旧密码不能为空' }]} name="old_password" labelCol={{ span: 5 }} label="旧密码" />
          <ProFormText.Password rules={[{ required: true, message: '新密码不能为空' }]} name="password" labelCol={{ span: 5 }} label="新密码" />
          <ProFormText.Password rules={[{ required: true, message: '确认密码不能为空' }]} name="repeat_password" labelCol={{ span: 5 }} label="确认密码" />
        </DrawerForm>
      ),
    }] : []),
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  const menuHeaderDropdown = (
    <Menu className={styles.menu} selectedKeys={[]} onClick={onMenuClick} items={menuItems} />
  );

  return (
    <HeaderDropdown overlay={menuHeaderDropdown}>
      <span className={`${styles.action} ${styles.account}`}>
        <Avatar size="small" className={styles.avatar} style={{ backgroundColor: avatarColor.bg, color: avatarColor.fg }}>{firstChar}</Avatar>
        <span className={`${styles.name} anticon`}>{displayName}</span>
        {roleLabel && <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>[{roleLabel}]</span>}
      </span>
    </HeaderDropdown>
  );
};

export default AvatarDropdown;
