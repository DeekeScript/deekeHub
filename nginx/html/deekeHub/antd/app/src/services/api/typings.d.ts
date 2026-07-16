declare namespace API {
  type RoleType = 'super_admin' | 'developer' | 'user';

  interface CurrentUser {
    id: number;
    name?: string;
    username?: string;
    phone?: string;
    role_type: RoleType;
    developer_id?: number;
    status?: number;
    max_devices?: number;
    device_frame_balance?: number;
    permissions?: string[];
    avatar?: string;
  }

  interface LoginParams {
    role_type: RoleType;
    username?: string;     // 超管登录用
    phone?: string;         // 开发者/运营登录用
    password: string;
    developer_id?: number;  // 运营登录时需要
  }

  interface ApiResponse {
    code: number;
    msg: string;
    data?: any;
    total?: number;
  }

  interface PageParams {
    current?: number;
    pageSize?: number;
  }

  interface ListResult<T = any> {
    total: number;
    data: T[];
  }
}
