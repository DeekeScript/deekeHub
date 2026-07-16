# WebSocket 服务使用说明

## 概述

这是一个基于 Swoole 的 WebSocket 服务端，用于管理设备连接、发送任务指令和接收任务执行结果。

## 功能特性

1. **设备连接管理**
   - 设备通过 `android_id` 和 `token`（卡密）进行认证连接
   - 自动标记设备在线状态（存储在 Redis 中）
   - 支持设备断线重连（旧连接自动关闭）

2. **任务执行流程**
   - 服务端通过 API 接口发送任务到设备
   - 任务通过 Redis 队列传递到 WebSocket 服务器
   - WebSocket 服务器将任务推送给在线设备
   - 设备执行任务后返回结果
   - 任务执行结果通过队列异步写入数据库

3. **消息类型**
   - `connected`: 连接成功
   - `task`: 任务指令
   - `task_received`: 客户端确认收到任务
   - `task_result`: 任务执行结果
   - `heartbeat`: 心跳消息

## 安装和配置

### 1. 安装 Swoole 扩展

```bash
pecl install swoole
```

或者在 PHP 配置文件中启用 Swoole 扩展。

### 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# WebSocket 服务器配置
WS_HOST=0.0.0.0
WS_PORT=9501
WS_WORKER_NUM=4
WS_DAEMONIZE=false
WS_LOG_LEVEL=0
```

### 3. 启动 WebSocket 服务器

```bash
php artisan websocket:start
```

以守护进程模式运行：

```bash
php artisan websocket:start --daemon
```

指定主机和端口：

```bash
php artisan websocket:start --host=0.0.0.0 --port=9501
```

## API 接口

### 1. 检查设备在线状态

**接口**: `POST /api/checkDeviceOnline`

**请求参数**:
```json
{
  "android_ids": ["device1", "device2"]
}
```

**响应**:
```json
{
  "code": 0,
  "success": true,
  "data": {
    "device1": true,
    "device2": false
  }
}
```

### 2. 执行任务（发送任务到设备）

**接口**: `POST /api/executeTask`

**请求参数**:
```json
{
  "task_id": 123
}
```

**响应**:
```json
{
  "code": 0,
  "success": true,
  "msg": "任务已发送到 10 个设备，2 个设备离线",
  "data": {
    "success_count": 10,
    "fail_count": 2,
    "offline_devices": ["device1", "device2"]
  }
}
```

## 客户端连接

### 连接地址

```
ws://服务器地址:9501/?android_id=设备ID&token=卡密token
```

### 连接流程

1. **建立连接**
   - 客户端通过 WebSocket 连接到服务器
   - 服务器验证 `android_id` 和 `token`
   - 验证成功后返回连接成功消息

2. **接收任务**
   - 服务器发送任务消息：
   ```json
   {
     "type": "task",
     "task_name": "task_001",
     "task_data": {
       "command": "..."
     }
   }
   ```
   - 客户端收到任务后应立即发送确认消息：
   ```json
   {
     "type": "task_received",
     "task_name": "task_001"
   }
   ```

3. **执行任务并返回结果**
   - 客户端执行完任务后发送结果：
   ```json
   {
     "type": "task_result",
     "task_name": "task_001",
     "status": "success",  // 或 "failed"
     "log_content": "执行日志内容",
     "error_message": "错误信息（如果失败）"
   }
   ```

4. **心跳保持**
   - 客户端定期发送心跳：
   ```json
   {
     "type": "heartbeat"
   }
   ```
   - 服务器返回：
   ```json
   {
     "type": "heartbeat",
     "message": "pong"
   }
   ```

## 消息格式

### 服务端 -> 客户端

#### 连接成功
```json
{
  "type": "connected",
  "message": "连接成功",
  "device_id": 123
}
```

#### 任务指令
```json
{
  "type": "task",
  "task_name": "task_001",
  "task_data": {
    "command": "执行的具体命令或配置"
  }
}
```

#### 任务结果确认
```json
{
  "type": "task_result_received",
  "message": "任务执行结果已收到",
  "task_name": "task_001",
  "status": "success"
}
```

#### 错误消息
```json
{
  "type": "error",
  "message": "错误描述"
}
```

### 客户端 -> 服务端

#### 心跳
```json
{
  "type": "heartbeat"
}
```

#### 任务接收确认
```json
{
  "type": "task_received",
  "task_name": "task_001"
}
```

#### 任务执行结果
```json
{
  "type": "task_result",
  "task_name": "task_001",
  "status": "success",  // 或 "failed"
  "log_content": "执行日志（可选）",
  "error_message": "错误信息（失败时）"
}
```

## 数据库表结构

任务执行日志会记录到以下表中：

- `task_logs`: 任务执行日志表
- `task_devices`: 任务设备关联表（状态更新）

## 队列配置

任务执行日志通过 Laravel 队列异步写入数据库。确保队列工作进程正在运行：

```bash
php artisan queue:work
```

## 注意事项

1. **多进程环境**: WebSocket 服务器使用多进程架构，设备连接信息使用 Redis 进行共享
2. **设备在线状态**: 设备在线状态存储在 Redis 中，过期时间为 1 小时
3. **任务队列**: 任务通过 Redis 队列传递，确保任务能够正确发送到设备
4. **日志记录**: 所有重要操作都会记录到 Laravel 日志中

## 故障排查

1. **服务器无法启动**
   - 检查 Swoole 扩展是否已安装
   - 检查端口是否被占用
   - 查看日志文件：`storage/logs/websocket.log`

2. **设备无法连接**
   - 检查 `android_id` 和 `token` 是否正确
   - 检查设备是否在数据库中且状态正常
   - 查看 WebSocket 服务器日志

3. **任务未收到**
   - 检查设备是否在线
   - 检查 Redis 是否正常运行
   - 查看队列是否正常处理

4. **任务结果未记录**
   - 检查队列工作进程是否运行
   - 查看队列日志：`storage/logs/laravel.log`
   - 检查数据库连接是否正常


