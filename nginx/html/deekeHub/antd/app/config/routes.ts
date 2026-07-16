export default [
  { path: '/', component: '@/pages/Landing', layout: false },
  { name: '超管登录', path: '/admin/login', component: './Admin/Login', hideInMenu: true, layout: false },
  { name: '登录', path: '/user/login', component: './User/Login', hideInMenu: true, layout: false },
  { name: '运营登录', path: '/operator/login', component: './User/OperatorLogin', hideInMenu: true, layout: false },
  { path: '/welcome', redirect: '/dashboard' },

  // ==================== 仪表盘（三角色共用） ====================
  { path: '/dashboard', name: '仪表盘', icon: 'DashboardOutlined', component: './Dashboard' },

  // ==================== 开发者管理（超管专属） ====================
  { path: '/admin/developers', name: '开发者管理', icon: 'TeamOutlined', component: './Admin/Developers', access: 'isSuperAdmin' },

  // ==================== 设备管理（三角色共用） ====================
  { path: '/devices', name: '设备管理', icon: 'MobileOutlined', component: './Devices' },

  // ==================== 标签管理（三角色共用） ====================
  { path: '/tags', name: '标签管理', icon: 'TagsOutlined', component: './Tags' },

  // ==================== 脚本管理（admin + developer） ====================
  { path: '/scripts', name: '脚本管理', icon: 'CodeOutlined', component: './Scripts', access: 'isNotUser' },
  { path: '/scripts/:id', name: '脚本编辑', component: './Scripts/Editor', hideInMenu: true, access: 'isNotUser' },

  // ==================== 工作流（三角色共用，user 只读） ====================
  { path: '/workflows', name: '工作流', icon: 'ApartmentOutlined', component: './Workflows' },

  // ==================== 任务管理（三角色共用） ====================
  { path: '/tasks', name: '任务管理', icon: 'ScheduleOutlined', component: './Tasks' },
  // ==================== 日志管理（三角色共用） ====================
  { path: '/logs', name: '日志管理', icon: 'FileTextOutlined', component: './Logs' },

  // ==================== 运营管理（admin + developer） ====================
  { path: '/users', name: '运营管理', icon: 'TeamOutlined', component: './Users', access: 'isDeveloper' },

  // ==================== 额度账单（三角色共用） ====================
  { path: '/point-bill', name: '实时画面额度', icon: 'AccountBookOutlined', component: './PointBill' },

  // ==================== 订单（developer 下单，admin 在超管专属区查看） ====================
  { path: '/orders', name: '订单列表', icon: 'DollarOutlined', component: './Orders', access: 'isNotUser' },

  // ==================== 设置（三角色共用，内容自适应） ====================
  { path: '/settings', name: '设置', icon: 'SettingOutlined', component: './Settings', access: 'isNotUser' },

  // ==================== 超管专属 ====================
  { path: '/admin/plans', name: '套餐管理', icon: 'GoldOutlined', component: './Admin/Plans', access: 'isSuperAdmin' },
  { path: '/admin/developer-logs', name: '操作日志', icon: 'FileSearchOutlined', component: './Admin/DeveloperLogs', access: 'isSuperAdmin' },

  { component: './404' },
];
