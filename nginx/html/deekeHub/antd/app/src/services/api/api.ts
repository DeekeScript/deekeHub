import { request } from 'umi';

/** 获取当前用户信息 */
export async function currentUser() {
  return request<API.ApiResponse>('/api/currentUser');
}

/** 获取站点配置 */
export async function config() {
  return request<API.ApiResponse>('/api/config');
}

/** 登录 */
export async function login(data: API.LoginParams) {
  return request<API.ApiResponse>('/api/login', { method: 'POST', data });
}

/** 开发者短信注册 */
export async function developerRegister(data: any) {
  return request<API.ApiResponse>('/api/developer/register', { method: 'POST', data });
}

/** 发送短信验证码 */
export async function developerSendSmsCode(phone: string, captchaKey?: string, captchaCode?: string) {
  return request<API.ApiResponse>('/api/sms/send-code', { method: 'POST', data: { phone, type: 'register', captcha_key: captchaKey, captcha_code: captchaCode } });
}
export async function developerSendLoginSms(phone: string, captchaKey?: string, captchaCode?: string) {
  return request<API.ApiResponse>('/api/sms/send-code', { method: 'POST', data: { phone, type: 'login', captcha_key: captchaKey, captcha_code: captchaCode } });
}

/** 登出 */
export async function outLogin() {
  return request<API.ApiResponse>('/api/outLogin', { method: 'POST' });
}

/** 修改密码 */
export async function editPassword(data: { old_password: string; password: string }) {
  return request<API.ApiResponse>('/api/editPassword', { method: 'POST', data });
}

// ==================== 通用 list 方法 ====================

export function createApi(path: string) {
  return {
    list: (params?: Record<string, any>) => request<API.ApiResponse>(`/api${path}`, { params }),
    add: (data?: Record<string, any>) => request<API.ApiResponse>(`/api${path}`, { method: 'POST', data }),
    update: (id: number, data?: Record<string, any>) => request<API.ApiResponse>(`/api${path}/${id}`, { method: 'PUT', data }),
    remove: (id: number) => request<API.ApiResponse>(`/api${path}/${id}`, { method: 'DELETE' }),
  };
}

// ==================== 统一 API（角色自适应，推荐使用） ====================

export const devices = createApi('/devices');
export async function dashboard() { return request<API.ApiResponse>('/api/dashboard'); }
export async function deviceStatus(deviceIds: number[]) { return request<API.ApiResponse>('/api/devices/status', { method: 'POST', data: { device_ids: deviceIds } }); }
export async function deviceUnbind(id: number) { return request<API.ApiResponse>(`/api/devices/${id}/unbind`, { method: 'PUT' }); }
export async function deviceLivekitToken(deviceId: number) { return request<API.ApiResponse>(`/api/devices/${deviceId}/livekit-token`); }
export async function deviceLivekitViewerToken(deviceId: number) { return request<API.ApiResponse>(`/api/devices/${deviceId}/livekit-viewer-token`); }
export async function deviceSetQuality(id: number, quality: number) { return request<API.ApiResponse>(`/api/devices/${id}/quality`, { method: 'PUT', data: { quality } }); }
export async function deviceBatchQuality(deviceIds: number[], quality: number) { return request<API.ApiResponse>('/api/devices/batch-quality', { method: 'PUT', data: { device_ids: deviceIds, quality } }); }
export async function deviceUpdateTags(deviceId: number, tagIds: number[]) { return request<API.ApiResponse>(`/api/devices/${deviceId}/tags`, { method: 'PUT', data: { tag_ids: tagIds } }); }
export async function deviceStreamStart(deviceId: number) { return request<API.ApiResponse>(`/api/devices/${deviceId}/stream-start`, { method: 'POST' }); }
export async function deviceStreamStop(deviceId: number) { return request<API.ApiResponse>(`/api/devices/${deviceId}/stream-stop`, { method: 'POST' }); }

export const tags = createApi('/tags');

export const scripts = createApi('/scripts');
export async function scriptDetail(scriptId: number) { return request<API.ApiResponse>(`/api/scripts/${scriptId}`); }

export const workflows = createApi('/workflows');

export async function taskList(params?: any) { return request<API.ApiResponse>('/api/tasks', { params }); }
export async function taskAdd(data: any) { return request<API.ApiResponse>('/api/tasks', { method: 'POST', data }); }
export async function taskDetail(id: number) { return request<API.ApiResponse>(`/api/tasks/${id}`); }
export async function taskExecute(id: number) { return request<API.ApiResponse>(`/api/tasks/${id}/execute`, { method: 'POST' }); }
export async function taskCancel(id: number) { return request<API.ApiResponse>(`/api/tasks/${id}/cancel`, { method: 'POST' }); }
export async function taskLogs(id: number, params?: any) { return request<API.ApiResponse>(`/api/tasks/${id}/logs`, { params }); }
export async function taskLogExport(id: number, taskDeviceId: number) { return request<API.ApiResponse>(`/api/tasks/${id}/log-export`, { method: 'POST', data: { task_device_id: taskDeviceId } }); }

export async function logList(params?: any) { return request<API.ApiResponse>('/api/logs', { params }); }
export async function logExport(params?: any) { return request<API.ApiResponse>('/api/logs/export', { params }); }

export const users = createApi('/users');
export async function userToggleStatus(id: number) { return request<API.ApiResponse>(`/api/users/${id}/toggle-status`, { method: 'PUT' }); }
export async function userFrameBalance(id: number, amount: number) { return request<API.ApiResponse>(`/api/users/${id}/frame-balance`, { method: 'PUT', data: { amount } }); }
export async function userAssignDevices(id: number, data: { device_ids: number[] }) { return request<API.ApiResponse>(`/api/users/${id}/assign-devices`, { method: 'PUT', data }); }

export async function frameUsageStart(deviceId: number) { return request<API.ApiResponse>('/api/frame-usage/start', { method: 'POST', data: { device_id: deviceId } }); }
export async function frameUsageEnd(id: number) { return request<API.ApiResponse>('/api/frame-usage/end', { method: 'POST', data: { id } }); }
export async function frameUsageList(params?: any) { return request<API.ApiResponse>('/api/frame-usage', { params }); }
export async function frameUsageStats() { return request<API.ApiResponse>('/api/frame-usage/stats'); }

export const plans = createApi('/plans');

export async function orderList(params?: any) { return request<API.ApiResponse>('/api/orders', { params }); }
export async function orderCreate(data: any) { return request<API.ApiResponse>('/api/orders', { method: 'POST', data }); }
export async function deviceOrderList(params?: any) { return request<API.ApiResponse>('/api/device-orders', { params }); }
export async function deviceOrderCreate(data: any) { return request<API.ApiResponse>('/api/device-orders', { method: 'POST', data }); }
export async function checkDeviceOrderStatus(orderNo: string) { return request<API.ApiResponse>('/api/device-orders/status', { params: { order_no: orderNo } }); }
export async function frameOrderList(params?: any) { return request<API.ApiResponse>('/api/frame-orders', { params }); }
export async function frameOrderCreate(data: any) { return request<API.ApiResponse>('/api/frame-orders', { method: 'POST', data }); }


export async function notificationList(params?: any) { return request<API.ApiResponse>('/api/notifications', { params }); }
export async function notificationRead(id: number) { return request<API.ApiResponse>(`/api/notifications/${id}/read`, { method: 'PUT' }); }
export async function notificationSettings(data: any) { return request<API.ApiResponse>('/api/notifications/settings', { method: 'PUT', data }); }

export const developers = createApi('/developers');
export async function developerToggleStatus(id: number) { return request<API.ApiResponse>(`/api/developers/${id}/toggle-status`, { method: 'PUT' }); }
export async function developerStats(id: number) { return request<API.ApiResponse>(`/api/developers/${id}/stats`); }
export async function developerAdjust(id: number, data: Record<string, any>) { return request<API.ApiResponse>(`/api/developers/${id}/adjust`, { method: 'PUT', data }); }
export async function developerAssignDevices(id: number, data: { count: number; expired_at: string }) { return request<API.ApiResponse>(`/api/developers/${id}/assign-devices`, { method: 'POST', data }); }
export async function developerLogs(id: number, params?: Record<string, any>) { return request<API.ApiResponse>(`/api/developers/${id}/logs`, { params }); }
export async function developerCleanup(id: number) { return request<API.ApiResponse>(`/api/developers/${id}/cleanup`, { method: 'POST' }); }
export async function allDeveloperLogs(params?: Record<string, any>) { return request<API.ApiResponse>('/api/developer-logs', { params }); }

export async function options() { return request<API.ApiResponse>('/api/options'); }
export async function updateOptions(data: Record<string, any>) { return request<API.ApiResponse>('/api/options', { method: 'PUT', data }); }

// ==================== 超管 API（兼容旧版，逐步废弃） ====================
export const adminDevelopers = createApi('/admin/developers');
export const adminDevices = createApi('/admin/devices');
export const adminPlans = createApi('/admin/plans');
export const adminDeviceOrders = createApi('/admin/device-orders');
export const adminFrameOrders = createApi('/admin/frame-orders');

export async function adminDashboard() {
  return request<API.ApiResponse>('/api/admin/dashboard');
}
export async function adminDeviceUnbind(id: number) {
  return request<API.ApiResponse>(`/api/admin/devices/${id}/unbind`, { method: 'PUT' });
}
export async function adminDeviceLivekitViewerToken(deviceId: number) {
  return request<API.ApiResponse>(`/api/admin/devices/${deviceId}/livekit-token`);
}
export async function adminDeviceStreamStart(deviceId: number) {
  return request<API.ApiResponse>(`/api/admin/devices/${deviceId}/stream-start`, { method: 'POST' });
}
export async function adminDeviceStreamStop(deviceId: number) {
  return request<API.ApiResponse>(`/api/admin/devices/${deviceId}/stream-stop`, { method: 'POST' });
}
export async function adminDevicesStatus(deviceIds: number[]) {
  return request<API.ApiResponse>('/api/admin/devices/status', { method: 'POST', data: { device_ids: deviceIds } });
}
export async function adminToggleDeveloperStatus(id: number) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/toggle-status`, { method: 'PUT' });
}
export async function adminDeveloperCleanup(id: number) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/cleanup`, { method: 'POST' });
}
export async function adminDeveloperStats(id: number) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/stats`);
}
export async function adminDeveloperAdjust(id: number, data: Record<string, any>) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/adjust`, { method: 'PUT', data });
}
export async function adminAssignDevices(id: number, data: { count: number; expired_at: string }) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/assign-devices`, { method: 'POST', data });
}
export async function adminDeveloperLogs(id: number, params?: Record<string, any>) {
  return request<API.ApiResponse>(`/api/admin/developers/${id}/logs`, { params });
}
export async function adminAllDeveloperLogs(params?: Record<string, any>) {
  return request<API.ApiResponse>('/api/admin/developer-logs', { params });
}
export async function adminOptions() {
  return request<API.ApiResponse>('/api/admin/options');
}
export async function adminUpdateOptions(data: Record<string, any>) {
  return request<API.ApiResponse>('/api/admin/options', { method: 'PUT', data });
}

// ==================== 开发者 API ====================
export async function developerDashboard() {
  return request<API.ApiResponse>('/api/developer/dashboard');
}

export const developerUsers = createApi('/developer/users');
export async function developerToggleUserStatus(id: number) {
  return request<API.ApiResponse>(`/api/developer/users/${id}/toggle-status`, { method: 'PUT' });
}
export async function developerUserFrameBalance(id: number, amount: number) {
  return request<API.ApiResponse>(`/api/developer/users/${id}/frame-balance`, { method: 'PUT', data: { amount } });
}
export async function developerUserAssignDevices(id: number, data: { device_ids: number[] }) {
  return request<API.ApiResponse>(`/api/developer/users/${id}/assign-devices`, { method: 'PUT', data });
}

export const developerScripts = createApi('/developer/scripts');

export const developerWorkflows = createApi('/developer/workflows');
export const developerDevices = createApi('/developer/devices');
export async function deviceCreate(data: any) {
  return request<API.ApiResponse>('/api/developer/devices', { method: 'POST', data });
}
export async function developerDeviceUnbind(id: number) {
  return request<API.ApiResponse>(`/api/developer/devices/${id}/unbind`, { method: 'PUT' });
}
export async function developerDeviceLivekitViewerToken(deviceId: number) {
  return request<API.ApiResponse>(`/api/developer/devices/${deviceId}/livekit-viewer-token`);
}
export async function developerDeviceStreamStart(deviceId: number) {
  return request<API.ApiResponse>(`/api/developer/devices/${deviceId}/stream-start`, { method: 'POST' });
}
export async function developerDeviceStreamStop(deviceId: number) {
  return request<API.ApiResponse>(`/api/developer/devices/${deviceId}/stream-stop`, { method: 'POST' });
}
export async function developerDevicesStatus(deviceIds: number[]) {
  return request<API.ApiResponse>('/api/developer/devices/status', { method: 'POST', data: { device_ids: deviceIds } });
}

export const developerTags = createApi('/developer/tags');

export async function developerTasks(params?: any) {
  return request<API.ApiResponse>('/api/developer/tasks', { params });
}
export async function developerTaskAdd(data: any) {
  return request<API.ApiResponse>('/api/developer/tasks', { method: 'POST', data });
}
export async function developerTaskDetail(id: number) {
  return request<API.ApiResponse>(`/api/developer/tasks/${id}`);
}
export async function developerTaskExecute(id: number) {
  return request<API.ApiResponse>(`/api/developer/tasks/${id}/execute`, { method: 'POST' });
}
export async function developerTaskCancel(id: number) {
  return request<API.ApiResponse>(`/api/developer/tasks/${id}/cancel`, { method: 'POST' });
}
export async function developerTaskLogs(id: number, params?: any) {
  return request<API.ApiResponse>(`/api/developer/tasks/${id}/logs`, { params });
}

export async function developerLogList(params?: any) {
  return request<API.ApiResponse>('/api/developer/logs', { params });
}
export async function developerLogsExport(params?: any) {
  return request<API.ApiResponse>('/api/developer/logs/export', { params });
}

export async function developerPlans() {
  return request<API.ApiResponse>('/api/developer/plans');
}
export async function developerDeviceOrderCreate(data: any) {
  return request<API.ApiResponse>('/api/developer/device-orders', { method: 'POST', data });
}
export async function developerCheckDeviceOrderStatus(orderNo: string) {
  return request<API.ApiResponse>('/api/developer/device-orders/status', { params: { order_no: orderNo } });
}
export async function developerDeviceOrderList(params?: any) {
  return request<API.ApiResponse>('/api/developer/device-orders', { params });
}
export async function developerFrameOrderCreate(data: any) {
  return request<API.ApiResponse>('/api/developer/frame-orders', { method: 'POST', data });
}
export async function developerFrameOrderList(params?: any) {
  return request<API.ApiResponse>('/api/developer/frame-orders', { params });
}


export async function developerNotifications(params?: any) {
  return request<API.ApiResponse>('/api/developer/notifications', { params });
}
export async function developerNotificationRead(id: number) {
  return request<API.ApiResponse>(`/api/developer/notifications/${id}/read`, { method: 'PUT' });
}
export async function developerNotificationSettings(data: any) {
  return request<API.ApiResponse>('/api/developer/notifications/settings', { method: 'PUT', data });
}

export async function developerFrameUsageStart(deviceId: number) {
  return request<API.ApiResponse>('/api/developer/frame-usage/start', { method: 'POST', data: { device_id: deviceId } });
}
export async function developerFrameUsageEnd(id: number) {
  return request<API.ApiResponse>('/api/developer/frame-usage/end', { method: 'POST', data: { id } });
}
export async function developerFrameUsageList(params?: any) {
  return request<API.ApiResponse>('/api/developer/frame-usage', { params });
}
export async function developerFrameUsageStats() {
  return request<API.ApiResponse>('/api/developer/frame-usage/stats');
}

// ==================== 运营 API ====================
export async function userDashboard() {
  return request<API.ApiResponse>('/api/user/dashboard');
}
export async function userResetPassword(data: { old_password: string; password: string }) {
  return request<API.ApiResponse>('/api/user/password', { method: 'PUT', data });
}

export const userDevices = createApi('/user/devices');
export async function userDeviceLivekitToken(deviceId: number) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/livekit-token`);
}
export async function userDeviceLivekitViewerToken(deviceId: number) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/livekit-viewer-token`);
}
export async function userDeviceStreamStart(deviceId: number) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/stream-start`, { method: 'POST' });
}
export async function userDeviceStreamStop(deviceId: number) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/stream-stop`, { method: 'POST' });
}
export async function userDevicesStatus(deviceIds: number[]) {
  return request<API.ApiResponse>('/api/user/devices/status', { method: 'POST', data: { device_ids: deviceIds } });
}
export async function userDeviceSetQuality(deviceId: number, quality: number) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/quality`, { method: 'PUT', data: { quality } });
}
export async function userDeviceUpdateTags(deviceId: number, tagIds: number[]) {
  return request<API.ApiResponse>(`/api/user/devices/${deviceId}/tags`, { method: 'PUT', data: { tag_ids: tagIds } });
}

export const userTags = createApi('/user/tags');

export async function userWorkflows() {
  return request<API.ApiResponse>('/api/user/workflows');
}
export async function userTasks(params?: any) {
  return request<API.ApiResponse>('/api/user/tasks', { params });
}
export async function userTaskDetail(id: number) {
  return request<API.ApiResponse>(`/api/user/tasks/${id}`);
}
export async function userTaskExecute(id: number) {
  return request<API.ApiResponse>(`/api/user/tasks/${id}/execute`, { method: 'POST' });
}
export async function userTaskLogs(id: number) {
  return request<API.ApiResponse>(`/api/user/tasks/${id}/logs`);
}

export async function userLogs(params?: any) {
  return request<API.ApiResponse>('/api/user/logs', { params });
}
export async function userLogsExport(params?: any) {
  return request<API.ApiResponse>('/api/user/logs/export', { params });
}

export async function userNotifications(params?: any) {
  return request<API.ApiResponse>('/api/user/notifications', { params });
}
export async function userNotificationRead(id: number) {
  return request<API.ApiResponse>(`/api/user/notifications/${id}/read`, { method: 'PUT' });
}

export async function userFrameUsageStart(deviceId: number) {
  return request<API.ApiResponse>('/api/user/frame-usage/start', { method: 'POST', data: { device_id: deviceId } });
}
export async function userFrameUsageEnd(id: number) {
  return request<API.ApiResponse>('/api/user/frame-usage/end', { method: 'POST', data: { id } });
}
export async function userFrameUsageStats() {
  return request<API.ApiResponse>('/api/user/frame-usage/stats');
}
