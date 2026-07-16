import { message } from 'antd';
import { RequestConfig, history } from 'umi';

export const requests: RequestConfig = {
  timeout: 30000,

  errorHandler: (err: any) => {
    return err.data;
  },

  errorConfig: {
    adaptor: (resData) => {
      return {
        ...resData,
        success: resData.code === 0,
        errorMessage: resData.msg,
      };
    },
  },

  requestInterceptors: [
    (url: string, options: any) => {
      const token = localStorage.getItem('token') || '';
      options.headers = options.headers || {};
      options.headers['Authorization'] = 'Bearer ' + token;
      return { url, options: { ...options, interceptors: true } };
    },
  ],

  responseInterceptors: [
    (response: any) => {
      const res = response.data;
      const { code, msg } = res || {};

      if (code === 401) {
        const roleType = localStorage.getItem('roleType') || '';
        localStorage.removeItem('token');
        localStorage.removeItem('roleType');
        if (roleType === 'super_admin') history.push('/admin/login');
        else if (roleType === 'user') history.push('/operator/login');
        else history.push('/user/login');
        return response;
      }

      if (code !== 0 && code !== undefined) {
        message.error(msg || '请求失败');
      }

      return response;
    },
  ],
};
