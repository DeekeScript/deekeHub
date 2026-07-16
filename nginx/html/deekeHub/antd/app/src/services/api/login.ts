import { request } from 'umi';

/** 获取图形验证码 */
export async function getCaptcha() {
  return request<API.ApiResponse>('/api/verify');
}
