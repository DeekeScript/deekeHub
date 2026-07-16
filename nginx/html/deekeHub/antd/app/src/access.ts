/**
 * 权限控制
 */
export default function access(initialState: { currentUser?: API.CurrentUser } | undefined) {
  const { currentUser } = initialState ?? {};

  return {
    /** 是否为超管 */
    isSuperAdmin: currentUser?.role_type === 'super_admin',

    /** 是否为开发者 */
    isDeveloper: currentUser?.role_type === 'developer',

    /** 是否为运营 */
    isUser: currentUser?.role_type === 'user',

    /** 非运营（admin 或 developer） */
    isNotUser: currentUser?.role_type !== 'user',

    /** 路由过滤（兼容 ProLayout） */
    adminRouteFilter: (route: any) => {
      if (currentUser?.role_type === 'super_admin') return true;
      if (route.key && currentUser?.permissions) {
        return currentUser.permissions.includes(route.key);
      }
      return false;
    },
  };
}
