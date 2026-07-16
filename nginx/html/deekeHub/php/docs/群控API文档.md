# 群控功能 API 文档

本文档依据后端 `routes/api.php`、`App\Http\Controllers\ApiController` 及前端 `antd/app/src/services/api/api.ts`、页面 `antd/app/src/pages/GroupControl/*` 整理，描述「群控管理」模块相关 HTTP 接口。

## 前置说明

### 登录与鉴权

**除下文列出的公开接口外，本文档中的群控及相关业务接口均需要鉴权**：请求头携带登录接口返回的 **JWT**，形如：

```http
Authorization: Bearer <token>
```

中间件会从 `Authorization` 解析 Bearer Token（见 `App\Http\Middleware\Authenticate`）。常见情况：

| HTTP 状态 | JSON `code` | 含义 |
|-----------|-------------|------|
| 401 | 401 | 未带 Token、JWT 无效或用户已被禁用等（文案如「登陆失效」） |
| 403 | 402 | Token 有效但 **无该接口权限**（`Role::isAccess` 不通过，msg 多为「没有访问权限」） |

另：若全局关闭群控，**设备端**部分接口会返回业务错误「群控功能未开启」（见 `DkeController` / `DkeeController`）；**管理端 ApiController** 群控接口主要依赖权限列表是否包含对应 action（`features.group_control_enabled` 为 false 时，权限列表会不下发群控 action，请求将表现为 **402/403** 一类无权限，而非单独文案）。

#### 公开接口（无需 `auth` 中间件）

下表仅列**与后台登录/验证码直接相关**的接口；其余未认证路由（如部分 `alipay/*`、`dke/*`、`statistics` 等）以 `routes/api.php` 为准。

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 登录（与 `/api/login/account` 等价别名） |
| `/api/login/account` | POST | 同上 |
| `/api/logout`、`/api/outLogin` | POST | 登出（路由未挂 `auth`，与多数业务接口不同） |
| `/api/config` | GET | 站点配置 |
| `/api/verify` | GET | **图形验证码**（登录前拉取，配合 `captcha_key`） |

#### `POST /api/login`（或 `/api/login/account`）

**控制器**：`ApiController::login`

**Body（JSON 或表单）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mobile` | string | 是 | 手机号 |
| `password` | string | 是 | 密码 |
| `role_type` | int | 是 | **0**=管理员（走 `User::login`），**1**=代理商（走 `Agent::login`） |
| `code` | string | 是 | 验证码内容 |
| `captcha_key` | string | 是 | 验证码标识（与 `/api/verify` 对应） |

**成功时**（`code === 0`）`data` 典型字段：`id`、`mobile`、`name`、`token`（JWT）、`role_type`。后续请求使用该 **`token`** 作为 Bearer。

**说明**：`role_type === 2` 等其它值在控制器中不会走登录逻辑，会返回登录失败；群控后台主要使用 **0 或 1**。

#### 登录后拉取当前用户（需鉴权）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/currentUser` | GET | 当前用户信息与权限列表（`permissions`）等 |

### 基础路径与群控接口范围

- 所有接口均在 Laravel 路由前缀 **`/api`** 下（见 `RouteServiceProvider`）。
- **群控相关接口**位于 **`Route::middleware(['request.params', 'auth'])`** 组内，必须先登录并携带 **JWT**（中间件类名为 **`Authenticate`**，路由中 `auth` 指向该类）。
- **`request.params` 分页**：鉴权通过后，中间件会把请求里的 **`current`→`page`、`pageSize`→`limit`** 写入请求（并与 ProTable 习惯一致）。若客户端只传 `page` 而不传 `current`，`page` 可能被覆盖为 `current` 的解析结果（默认 1），**建议列表请求同时携带 `current`/`pageSize` 或与后端约定一致**。
- 管理后台若未在全局配置中开启群控，权限服务会不下发群控相关 action，表现为 **无权限**（见上表）；对应配置一般为 `config('features.group_control_enabled')` / 环境变量（见 `.env.example`）。

### 统一响应格式

成功（基类 `Controller::success`）典型结构：

```json
{
  "code": 0,
  "success": true,
  "data": {},
  "total": 0,
  "msg": "成功"
}
```

列表类接口若传入 `['total' => n, 'data' => [...]]`，则顶层 `data` 为列表数组，`total` 为总条数。

失败（`error`）典型结构：

```json
{
  "code": 1,
  "success": false,
  "data": [],
  "msg": "错误说明"
}
```

### 角色说明（`role_type`）

- **0**：管理员 — 对群控多为**只读**（列表/详情/日志/平台与动作元数据）；具体以后端校验为准。
- **1**：代理商 — 可创建任务、执行、重试、撤回、维护标签与设备备注等（见各接口说明）。
- **2**：终端用户（设备侧账号）— 一般不调用这些管理接口。

### 设备 ID 约定

- 业务上的「设备」对应表 **`users`** 中 **`role_type = 2`** 的记录。
- **`users.id`** 在接口中常作为 **`device_id`** / 列表中的 **`id`**。
- **`android_id`** 为设备客户端标识；在线状态通过 Redis 键 `ws:device:{android_id}` 判断。

---

## 一、卡密与激活码管理（用户管理）

后台菜单常称为 **「激活码管理」** / **「激活码列表」**（前端路由如 `/user/list` → `User/List`）。数据存储在 **`users`** 表：**一条记录 = 一张卡密（终端席位）**，固定 **`role_type = 2`**（与管理员 `0`、代理商 `1` 区分）。**激活码字段**为 **`token`**（生成规则含代理商 ID 与时间戳等，见 `User::add`）。设备首次用卡密登录后，会写入 **`android_id`**、**`active`**、**`active_time`** 等，该记录即群控「设备管理」里看到的同一条数据。

> **与群控的关系**：`deviceList` / `deviceAll` 查的也是 `role_type = 2` 的 `users` 记录；**新增/删除卡密**不在群控接口里完成，而在本节 API（`addUser` / `removeUser` 等）。

### 1. `GET /api/userList` — 激活码列表

**前端封装**：`userList`（`api.ts`）

**权限**：管理员、代理商（`Role`：`role_type` 0、1）。

**说明**：代理商仅能看 **`agent_id` = 当前代理商** 的卡密；管理员可看全部。列表结果中 **`role_type <> 0`**（含卡密及可能存在的其它非管理员账号，业务以卡密为主）。

**查询参数（节选）**

| 参数 | 说明 |
|------|------|
| `page` / `limit` 或 `current` / `pageSize` | 分页（中间件会合并 `current`/`pageSize`） |
| `name` | 用户昵称模糊 |
| `token` | 激活码前缀匹配（`token%`） |
| `android_id` | 设备 ID 前缀匹配 |
| `remark` | 备注模糊 |

**响应**：`data` 为列表，`total` 为总数；代理商额外可能返回 **`machineCount`**（代理商剩余点数等相关，见 `Agent::machine_count` 与列表联动）。单项常含：`id`、`name`、`token`（激活码）、`type`（时长类型 0–6）、`remark`、`state`、`active`、`active_time`、`android_id`、`active_count`（剩余激活次数）、`agent_id`、`agent_name` 等。

---

### 2. `POST /api/addUser` — 批量生成卡密

**前端封装**：`addUser`

**权限**：管理员、代理商。

**行为**：按数量 **`num`** 批量插入多条 `users`（`role_type=2`），名称为 **`name` + 序号**（`name0`、`name1`…），**每条扣减代理商点数**（`Agent::incMachine`，扣减额与 **`type`** 对应 `User::DIANSHU`）。**`token`** 自动生成：`{代理商user_id}#{时间戳随机码}`。

**Body（核心字段）**

| 字段 | 说明 |
|------|------|
| `name` | 名称前缀，同一前缀下未删除记录不可重名（校验用 `name` 精确匹配） |
| `num` | 生成条数（循环次数） |
| `type` | 时长类型 **`0`～`6`**，对应 `User::TYPE` / `SHICHANG`（如 1年、1月、3天等）与 `DIANSHU`（扣点天数） |
| `state` | 状态（与业务/前端约定，通常为启用类取值） |
| `remark` | 可选，备注 |
| `active_count` | 可选，剩余激活次数；默认取全局配置 `default_active_count` |
| `order_id` | 可选 |

点数不足时返回失败（「点数不足」）。

**`type` 与时长、扣点（`User::TYPE` / `SHICHANG` / `DIANSHU`）**

| `type` | 时长文案（示例） | 扣点天数（`DIANSHU`） |
|--------|-------------------|------------------------|
| 0 | 1年 | 365 |
| 1 | 1月 | 30 |
| 2 | 3天 | 3 |
| 3 | 3月 | 90 |
| 4 | 7天 | 7 |
| 5 | 2年 | 730 |
| 6 | 1天 | 1 |

创建时 **`agent_id`**：一般由 **代理商** 写入当前代理商 ID；管理员创建时的归属规则以源码 `User::add` 为准。

---

### 3. `POST /api/updateUser` — 编辑卡密

**前端封装**：`updateUser`

**权限**：管理员、代理商（`Role`）；代理商仅能改 **`agent_id` 为自己** 的记录。

**Body（常见）**：`id`（必填）、`name`、`remark`、`state`；可选 **`active_count`**（剩余激活次数）。

---

### 4. `GET` 或 `POST` `/api/removeUser` — 删除卡密

**前端封装**：`removeUser`

**权限**：管理员、代理商；**不能删除自己**（`id` 与当前登录用户相同会拒绝）。

**参数**：`id` — 卡密记录 ID。逻辑删除（`deleted = 1`），并按规则尝试**退回代理商点数**（见 `User::remove`）。

---

### 5. `POST /api/exportUser` — 导出激活码（CSV）

**前端封装**：`exportUser`

**权限**：管理员、代理商。

**行为**：按与列表相同的筛选条件导出（内部 `getList` 单页最多 1000 条），返回 **`data`** 为 **UTF-8 CSV 字符串**（含 BOM），列包括：ID、用户昵称、时长、激活状态、激活时间、消耗点数、剩余点数、设备 ID、**激活码**、备注、创建时间等（见 `ApiController::exportUser`）。

---

### 6. `POST /api/increaseActiveCount` — 增加剩余激活次数

**前端封装**：`increaseActiveCount`

**权限**：**仅代理商**（`ApiController` 与 `Role` 均限制）。

**Body**：`id`（卡密记录 ID）、`count`（正整数，要增加的次数）。

**行为**：在原有 `active_count` 上累加；记录不存在或无权限时返回错误。

---

## 二、设备管理

> **数据来源**：与 **「一、卡密与激活码管理」** 为同一批 `users` 记录（`role_type = 2`）。**新增/删除设备（卡密）**请使用 **`addUser` / `removeUser`** 等，而非本节已禁用的 `deviceAdd` / `deviceDelete`。

### 1. `GET /api/deviceList` — 设备列表

**前端封装**：`deviceList`（`api.ts`）

**权限**：管理员、代理商（列表数据范围不同）。

**查询参数（节选）**

| 参数 | 说明 |
|------|------|
| `page` | 页码，默认 1 |
| `limit` | 每页条数，默认 15（前端 ProTable 常传 `current` / `pageSize`，需与后端约定；当前后端读 `page`、`limit`） |
| `android_id` | 模糊搜索设备 ID |
| `name` | 模糊搜索用户名称 |
| `user_id` | 精确匹配 `users.id` |
| `tag_id` | 按标签筛选（`device_tags` 关联） |
| `is_online` | `1` 在线 / `0` 离线（基于 Redis） |
| `agent_id` | **管理员**可按代理商筛选 |

**响应 `data` 单项字段（典型）**：`id`、`user_id`、`android_id`、`name`、`remark`、`agent_id`、`is_online`、`tags`（`{id,name,color}[]`）、`created_at`。

**说明**：在线状态在服务端计算后再分页；添加设备/删除设备接口被后端禁用，需在激活码（卡密）管理中操作（见 `deviceAdd` / `deviceDelete`）。

---

### 2. `POST /api/deviceAdd` — 添加设备

**前端封装**：`deviceAdd`

**行为**：固定返回错误，提示设备通过激活码管理页面添加（后端未实现添加）。

---

### 3. `POST /api/deviceUpdate` — 更新设备

**前端封装**：`deviceUpdate`

**权限**：仅**代理商**；管理员会提示无权限。

**JSON Body**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 设备对应 **`users.id`** |
| `remark` | string | 可选，备注 |
| `tag_ids` | number[] | 可选，标签 ID 列表；会先清空 `device_tags` 再写入 |

---

### 4. `GET` 或 `POST` `/api/deviceDelete` — 删除设备

**前端封装**：`deviceDelete`（POST，`{ id }`）

**行为**：固定返回错误，提示在激活码管理页面删除。

---

### 5. `GET /api/deviceAll` — 获取全部设备（任务选设备）

**前端封装**：`deviceAll`

**权限**：仅**代理商**。

**查询参数**

| 参数 | 说明 |
|------|------|
| `tag_ids` | 数组，或逗号分隔字符串，或单个数字；按标签交集筛选设备 |
| `min_success_rate` / `max_success_rate` | 按任务成功占比（%）区间筛选 |
| `is_online` | `1` 仅在线 / `0` 仅离线 |

**响应 `data[]` 字段（典型）**：`id`、`android_id`、`name`、`task_success_count`、`task_fail_count`、`task_total_count`、`success_rate`、`is_online`、`tags`。

---

### 6. `POST /api/checkDeviceOnline` — 批量查询在线状态

**说明**：路由已注册，**前端 `api.ts` 未封装**；供需要按 `android_id` 批量探测在线状态时使用。

**权限**：仅代理商（`Role` 配置）。

**参数**

| 参数 | 说明 |
|------|------|
| `android_ids` | string[]，必填 |

**响应 `data`**：与 `WebSocketHelper::checkDevicesOnline` 一致的结构（各 `android_id` 是否在线）。

---

## 三、标签管理

### 1. `GET /api/tagList` — 标签列表

**前端封装**：`tagList`

**查询参数**：`page`、`limit`、`name`（模糊）等；管理员可通过 `agent_id` 筛选。

**响应**：`total` + `data`（`id, name, color, remark, agent_id, ...`）。

---

### 2. `POST /api/tagAdd` — 新增标签

**前端封装**：`tagAdd`

**权限**：仅代理商。

**Body**：`name`（必填）、`color`（必填）、`remark`（可选）；后端写入 `agent_id` 为当前用户。

---

### 3. `POST /api/tagUpdate` — 更新标签

**前端封装**：`tagUpdate`

**权限**：仅代理商；仅能改自己 `agent_id` 下的标签。

**Body**：含 `id` 及需更新字段。

---

### 4. `GET` 或 `POST` `/api/tagDelete` — 删除标签

**前端封装**：`tagDelete`（POST，`{ id }`）

**权限**：仅代理商；逻辑删除（`deleted = 1`）。

---

## 四、任务管理

### 1. `GET /api/taskList` — 任务列表

**前端封装**：`taskList`

**查询参数**

| 参数 | 说明 |
|------|------|
| `page` / `limit` | 分页 |
| `name` | 任务名称模糊 |
| `status` | `0` 待执行 / `1` 执行中 / `2` 已完成 / `3` 已失败 |
| `platform` | 如 `douyin`、`wechat`、`wechat_channels`、`xiaohongshu`、`system` |
| `action_type` | 动作 key，与 `getTaskActionTypes` 一致 |

**说明**：列表中的 `success_count` / `fail_count` 来自 `task_devices` 汇总，可能与任务表字段不完全相同（见 `Task::getList`）。

---

### 2. `POST /api/taskAdd` — 创建任务

**前端封装**：`taskAdd`

**权限**：仅代理商。

**Body（核心字段）**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 任务名称 |
| `description` | string | 可选 |
| `device_ids` | number[] | **必填**，元素为 `users.id`，且须属于当前代理商 |
| `platform` | string | 默认 `douyin` |
| `action_type` | string | 与平台匹配的动作 key |
| 其它动态字段 | - | 由 `getTaskActionTypes` 返回的 `attr.fields` 决定，如 `video_url`、`account`、`comment` 等 |
| `comment_batch_id` | number | 可选；引用评论批次时，可与 `comment`/`reply_comment`/`moments_comment` 互斥校验 |
| `image_groups` | array | 举报类证据截图；结构为数组，元素可为 `{ images: string[] }`。**必填校验**当前在 `validateTaskParams` 中针对 **微信公众号** 的 **`report_account`、`report_article`**；抖音 `report_account`/`report_video`、视频号 `report_channels_video` 等若传 `image_groups` 会写入 `params`，但**未必**走同一套「至少一张」校验，以源码为准 |

服务端将动态字段序列化进 `tasks.params`（JSON）。**微信公众号账号投诉 / 文章投诉**时后端强制 **`image_groups` 非空且至少一张图**。

---

### 3. `POST /api/taskUpdate` — 更新任务

**前端封装**：`taskUpdate`

**权限**：仅代理商。

**限制**：仅 **`status = 待执行`** 的任务可改。

**Body**：`id` 必填；可更新 `name`、`description`、`platform`、`action_type`、`device_ids` 及动作相关字段；规则同 `taskAdd`。

---

### 4. `GET` 或 `POST` `/api/taskDelete` — 删除任务

**前端封装**：`taskDelete`（POST，`{ id }`）

**权限**：仅代理商。

**限制**：**执行中**的任务不可删。

---

### 5. `GET /api/taskDetail` — 任务详情

**前端封装**：`taskDetail`

**权限**：管理员可看全部；代理商仅看自己 `agent_id`。

**查询参数**：`id` — 任务 ID。

**响应**：在任务模型基础上合并解析后的 `params`、`action_type_name`，举报类会带 `category_label` / `subcategory_label`；若使用 `comment_batch_id`，会计算 `device_comments`（设备 ID → 分配的评论文案）。

---

### 6. `GET /api/taskLogList` — 任务执行日志

**前端封装**：`taskLogList`

**约束**：**必须**提供 `task_id` 或 `device_id` 之一（设备页用 `device_id` 查某设备日志）。

**常用查询参数**

| 参数 | 说明 |
|------|------|
| `page` / `limit` | 分页 |
| `task_id` | 任务 ID |
| `device_id` | 设备 `users.id` |
| `action_type` | 按任务动作类型筛 |
| `is_revoked` | 是否撤回 |
| `start_time` / `end_time` | Unix 时间戳，筛选 `executed_at` |
| `status` | 日志状态 |
| `device_id_search` | 按 `android_id` 模糊搜 |

**响应项**：含 `task` 嵌套（名称、`action_type`、`platform` 等）、`device`（`android_id` 等）、`status`、`log_content`、`error_message`、`is_revoked`、`revoke_status`、`executed_at` 等。

---

### 7. `GET /api/getTaskPlatforms` — 平台列表

**前端封装**：`getTaskPlatforms`

**响应 `data[]`**：`{ value, label }`；实际列表受 `config('platforms.enabled.*')` 影响。

---

### 8. `GET /api/getTaskActionTypes` — 某平台下的动作类型定义

**前端封装**：`getTaskActionTypes`

**查询参数**：`platform`（默认 `douyin`）

**响应 `data[]`**：每项含 `key`、`name`、`attr`（含 `cancelable`、`cancel_action`、`fields` 等），**前端任务表单按此动态渲染**。

---

### 9. `GET /api/getTaskDelayConfig` — 任务随机延时配置

**前端封装**：`getTaskDelayConfig`

**响应 `data`**：`min_wait_second`、`max_wait_second`（代理商维度存储，见 `Option::getTaskDelaySetting`）。

---

### 10. `POST /api/updateTaskDelayConfig` — 更新任务随机延时

**前端封装**：`updateTaskDelayConfig`

**Body**：`min_wait_second`、`max_wait_second`（非负，且最小 ≤ 最大）。

---

### 11. `POST /api/executeTask` — 启动任务（下发到设备）

**前端封装**：`executeTask`

**权限**：仅代理商。

**Body**：`task_id`

**行为**：任务须为**待执行**；状态改为执行中，通过 WebSocket 向在线设备下发；离线设备记失败并记录日志。响应含 `success_count`、`fail_count`、`offline_devices`。

---

### 12. `POST /api/retryFailedTask` — 重试失败设备

**前端封装**：`retryFailedTask`

**权限**：仅代理商。

**Body**：`task_id`

**限制**：任务不能仍为待执行；不能有「撤回子任务」结构（`params.original_task_id`）；须存在 `task_devices` 状态为失败的记录。

**响应**：`sent_count`、`offline_devices` 等。

---

### 13. `POST /api/revokeTask` — 撤回任务

**前端封装**：`revokeTask`

**权限**：仅代理商。

**Body**：`task_id`

**条件**：原任务须**已完成**；动作在元数据中 `attr.cancelable === true` 且配置了 `cancel_action`。

**行为**：新建一条「撤回任务」记录，向曾**成功**执行的设备下发取消动作；响应含 `revoke_task_id` 等。

---

## 五、评论批次与 AI 评论（`comment_batch_id`）

### `comment_batch_id` 是什么

- 任务参数里的 **`comment_batch_id`** 对应数据库表 **`comment_batches`** 的主键 **`id`**（见模型 `CommentBatch`）。
- 一个批次里存的是 **字符串数组 `comments`**（多条评论文案）。任务执行时会按设备顺序 **轮询分配** 这些评论（见 `ApiController::buildTaskDataForDevice` 等）。
- **不一定只能是 AI**：批次可以来自「扣子生成 → 用户勾选确认 → 保存」，也可以来自 **用户手工编辑/粘贴** 后调用 **`saveCommentBatch`** 入库。只要有了批次 ID，任务里都可以传 `comment_batch_id`。
- 与 **`comment` / `reply_comment` / `moments_comment`** 等字段的关系：若传了有效的 `comment_batch_id`，校验逻辑里可把上述评论类字段视为**不必再手写**（见 `validateTaskParams` 中对 `comment_batch_id` 的处理）。

### AI 相关接口（需登录，在 `auth` 路由组内）

| 接口 | 方法 | 作用 |
|------|------|------|
| **`/api/getKouziSetting`** | GET | 读取扣子（Coze）配置：`domain`、`bot_id`、`access_token` 等（管理员读全局，代理商读本账号） |
| **`/api/updateKouziSetting`** | POST | 更新扣子配置（字段以控制器允许为准） |
| **`/api/generateComments`** | POST | **仅调用扣子智能体生成评论文案**，返回 `data.comments`；**不落库**、**不产生 `comment_batch_id`**。须已配置有效扣子参数。 |
| **`/api/saveCommentBatch`** | POST | **创建评论批次**：`comments: string[]` → `comment_batches`，响应 **`data.batch_id`**，即任务中的 **`comment_batch_id`**。 |
| **`/api/getCommentBatch`** | GET | 参数 **`batch_id`**：取回 `comments`。校验 **`batch.agent_id` 与当前用户一致**：代理商仅自己的批次；管理员对应 **`agent_id === 0`** 的批次（与 `saveCommentBatch` 写入规则一致）。 |

**`POST /api/generateComments` 请求体（节选）**

| 参数 | 说明 |
|------|------|
| `requirement` | 可选，对生成评论的额外文字要求 |
| `count` | 生成条数，**1～50** |

**`POST /api/saveCommentBatch` 请求体**

| 参数 | 说明 |
|------|------|
| `comments` | 字符串数组，至少一条，单条不超过 1000 字 |

任务页（`GroupControl/Task.tsx`）在需要时会走：**生成 →（可选编辑）→ 保存批次 → 创建任务时带 `comment_batch_id`**。

权限见 `Role`（管理员与代理商均可使用上述接口，具体以部署为准）。

---

## 六、上传与证据图

任务中举报类字段可能使用图片 URL。前端通常先通过 **`GET /api/getCosSign`**（`ApiController`，需登录）获取 COS 上传凭证再传图（见 `Task.tsx`）。**说明**：安卓端等场景也可能使用 **`POST /dke/getCosSign`**（`DkeController`，另一套鉴权），与后台管理 **`/api/getCosSign`** 不同；本文档群控后台以 **`/api/getCosSign`** 为准。

**文档范围补充**：**设备端 / 代理端 HTTP API**（`DkeController`、`DkeeController` 等，用于 APP 与服务器交互）**不在**本文「后台 `ApiController` 群控接口」展开范围内；请直接查阅 `routes/api.php` 与对应控制器。

---

## 七、前端路由对应（antd）

| 路径 | 页面 | 主要使用的 API |
|------|------|----------------|
| `/user/list` 等 | `User/List` | `userList`、`addUser`、`updateUser`、`removeUser`、`exportUser`、`increaseActiveCount`（激活码/卡密管理） |
| `/groupControl/device` | `GroupControl/Device` | `deviceList`、`deviceUpdate`、`tagList`、`taskLogList`、`getTaskActionTypes` |
| `/groupControl/tag` | `GroupControl/Tag` | `tagList`、`tagAdd`、`tagUpdate`、`tagDelete` |
| `/groupControl/task` | `GroupControl/Task` | `taskList`、`taskAdd`、`taskUpdate`、`taskDelete`、`taskDetail`、`deviceAll`、`getTaskPlatforms`、`getTaskActionTypes`、`executeTask`、`retryFailedTask`、`revokeTask`、`getTaskDelayConfig`、`updateTaskDelayConfig`、`tagList`、评论批次与 COS 相关接口 |

---

## 八、附录：平台任务类型与表单字段（`Task.php`）

> 定义来源：`App\Models\Task::getActionTypes()`，其中微信公众号走 `getWechatActionTypesForPlatform()`，微信视频号走 `getWechatChannelsActionTypes()`。  
> **权威完整数据（含全部 `select` 的 `options`）请以接口 `GET /api/getTaskActionTypes?platform=...` 的响应为准**，与源码一致。  
> 创建/更新任务时，除下表所列「元数据字段」外，还可传 **`comment_batch_id`**（**评论批次** ID，多由 **`saveCommentBatch`** 创建；见「五、评论批次与 AI 评论」）。**微信公众号**「账号投诉 / 文章投诉」须传 **`image_groups`**（证据截图，**必填**，见 `ApiController::validateTaskParams`）；其它平台举报是否传图见接口与源码。

### 8.1 动作总览表

| platform | key（`action_type`） | 名称 | 可撤回 | 撤回对应 `cancel_action` |
|----------|----------------------|------|--------|----------------------------|
| `douyin` | `follow` | 账号关注 | 是 | `unfollow` |
| `douyin` | `vertical_nurture_douyin` | 垂直养号 | 否 | — |
| `douyin` | `report_account` | 账号举报 | 否 | — |
| `douyin` | `private_message` | 私信 | 否 | — |
| `douyin` | `like_video` | 视频点赞 | 是 | `unlike_video` |
| `douyin` | `watch_video` | 视频观看 | 否 | — |
| `douyin` | `collect_video` | 视频收藏 | 否 | — |
| `douyin` | `share_video` | 视频转发（至个人抖音） | 否 | — |
| `douyin` | `report_video` | 视频举报 | 否 | — |
| `douyin` | `comment_video` | 视频评论 | 否 | — |
| `douyin` | `like_comment` | 视频特定评论点赞 | 是 | `unlike_comment` |
| `douyin` | `dislike_comment` | 视频特定视频评论踩评论 | 是 | `undislike_comment` |
| `douyin` | `report_comment` | 视频特定评论举报 | 否 | — |
| `douyin` | `reply_comment` | 视频特定评论跟评 | 否 | — |
| `wechat` | `follow` | 账号关注 | 是 | `unfollow` |
| `wechat` | `report_account` | 账号投诉 | 否 | — |
| `wechat` | `share_article_to_moments` | 文章转发至朋友圈 | 是 | `unshare_article_from_moments` |
| `wechat` | `like_article` | 文章点赞 | 是 | `unlike_article` |
| `wechat` | `recommend_article` | 文章推荐 | 是 | `unrecommend_article` |
| `wechat` | `report_article` | 文章投诉 | 否 | — |
| `wechat` | `comment_article` | 文章评论 | 是 | `uncomment_article` |
| `wechat` | `like_comment` | 特定评论点赞 | 是 | `unlike_comment` |
| `wechat` | `dislike_article_comment` | 文章踩评论 | 是 | `undislike_article_comment` |
| `wechat` | `share_comment` | 特定评论转发 | 否 | — |
| `wechat` | `report_comment` | 特定评论投诉 | 否 | — |
| `wechat` | `reply_comment` | 特定评论跟评 | 否 | — |
| `wechat_channels` | `follow` | 账号关注 | 是 | `unfollow` |
| `wechat_channels` | `share_article_to_moments` | 视频转发至朋友圈 | 是 | `unshare_article_from_moments` |
| `wechat_channels` | `like_article` | 视频点赞 | 是 | `unlike_article` |
| `wechat_channels` | `recommend_article` | 视频推荐 | 是 | `unrecommend_article` |
| `wechat_channels` | `report_channels_video` | 视频投诉 | 否 | — |
| `wechat_channels` | `comment_article` | 视频评论 | 是 | `uncomment_article` |
| `wechat_channels` | `like_comment` | 特定评论点赞 | 是 | `unlike_comment` |
| `wechat_channels` | `dislike_article_comment` | 视频踩评论 | 否 | — |
| `wechat_channels` | `share_comment` | 特定评论转发 | 否 | — |
| `wechat_channels` | `report_comment` | 特定评论投诉 | 否 | — |
| `wechat_channels` | `reply_comment` | 特定评论跟评 | 否 | — |
| `xiaohongshu` | `vertical_nurture_xiaohongshu` | 垂直养号 | 否 | — |
| `system` | `system_screen_off` | 息屏 | 否 | — |
| `system` | `system_screen_on` | 亮屏 | 否 | — |
| `system` | `system_clear_gallery` | 清理下载图片 | 否 | — |
| `system` | `system_close_douyin` | 关闭抖音 | 否 | — |
| `system` | `system_upgrade_app` | 升级APP | 否 | — |

### 8.2 抖音 `douyin` — 各动作字段（`fields`）

表中「类型」对应元数据 `type`；**必填**为 `required === true`（若使用 `comment_batch_id`，部分评论类字段可不必填，以后端校验为准）。

| key | 字段 name | 标签 | 类型 | 必填 | 备注 |
|-----|-----------|------|------|------|------|
| `follow` | `account` | 账号 | text | 是 | 抖音号或昵称 |
| `vertical_nurture_douyin` | `keyword` | 关键词 | textarea | 是 | 逗号分隔 |
| 同上 | `like_rate` / `comment_rate` / `follow_rate` | 点赞/评论/关注频率（%） | slider | 是 | |
| 同上 | `video_count` | 最大刷视频数量 | number | 是 | |
| 同上 | `run_minutes` | 最大运行时间（分钟） | number | 是 | |
| 同上 | `comments` | 评论内容 | textarea | 是 | 多行，随机取；maxLength 2000 |
| `report_account` | `account` | 账号 | text | 是 | |
| 同上 | `category` | 大分类 | select | 是 | value/label 见源码 |
| 同上 | `subcategory` | 小分类 | select | 是 | `dependsOn: category`，选项与父级关联 |
| 同上 | `content` | 举报内容 | textarea | 是 | maxLength 1000 |
| `private_message` | `account` / `message` | 账号 / 私信内容 | text / textarea | 是 | message maxLength 500 |
| `like_video` | `video_url` | 视频链接 | url | 是 | |
| `watch_video` | `video_url` / `watch_duration` | 视频链接 / 观看时长（秒） | url / number | 是 | |
| `collect_video` / `share_video` | `video_url` | 视频链接 | url | 是 | |
| `report_video` | `video_url` | 视频链接 | url | 是 | |
| 同上 | `category` / `subcategory` | 大分类 / 小分类 | select | 是 | 与抖音视频举报类目一致，选项见接口 |
| 同上 | `content` | 举报内容 | textarea | 是 | maxLength 1000 |
| `comment_video` | `video_url` / `comment` | 视频链接 / 评论内容 | url / textarea | 是 | comment maxLength 1000 |
| `like_comment` / `dislike_comment` | `video_url` | 视频链接 | url | 是 | 用于定位评论 |
| `report_comment` | `video_url` / `category` | 视频链接 / 举报类型 | url / select | 是 | category 为单列举报类型枚举 |
| `reply_comment` | `video_url` / `reply_comment` | 视频链接 / 回复内容 | url / textarea | 是 | reply_comment maxLength 1000 |

### 8.3 微信公众号 `wechat` — 各动作字段

| key | 字段 name | 标签 | 类型 | 必填 | 备注 |
|-----|-----------|------|------|------|------|
| `follow` | `article_url` / `nickname` | 文章链接 / 公众号昵称 | url / text | 是 | |
| `report_account` | `article_url` / `nickname` | 文章链接 / 公众号名称 | url / text | 是 | **另需 `image_groups`** |
| 同上 | `category` / `subcategory` | 大分类 / 小分类 | select | 是 | `dependsOn`；部分大类无子项时后端可不强制小类 |
| 同上 | `content` | 投诉内容 | textarea | 是 | maxLength 1000 |
| `share_article_to_moments` | `article_url` / `article_title` / `moments_comment` | 文章链接 / 文章标题 / 评论内容 | url / text / textarea | 标题必填；评论选填 | 标题需完整；评论 maxLength 500 |
| `like_article` / `recommend_article` | `article_url` | 文章链接 | url | 是 | |
| `report_article` | `article_url` / `category` / `subcategory` | 文章链接 / 大分类 / 小分类 | url / select | 分类必填 | **另需 `image_groups`**；content 选填 maxLength 1000 |
| `comment_article` | `article_url` / `comment` | 文章链接 / 评论内容 | url / textarea | 是 | maxLength 1000 |
| `like_comment` / `dislike_article_comment` | `article_url` | 文章链接 | url | 是 | |
| `share_comment` | `article_url` / `forward_target` | 文章链接（评论分享链接）/ 转发对象 | url / text | 是 | |
| `report_comment` | `article_url` / `category` | 文章链接 / 投诉原因 | url / select | 链接必填；原因选填 | |
| `reply_comment` | `article_url` / `reply_comment` | 文章链接 / 回复内容 | url / textarea | 是 | maxLength 1000 |

### 8.4 微信视频号 `wechat_channels` — 各动作字段

视频类统一使用 **`video_url`**（`url`）。**特定评论**类以 **`group_name`（群名称）** 定位，无需视频标题。

| key | 字段 name | 标签 | 类型 | 必填 | 备注 |
|-----|-----------|------|------|------|------|
| `follow` | `account` | 视频号名称 | text | 是 | |
| 同上 | `group_name` | 群名称 | text | 是 | |
| `share_article_to_moments` | `video_url` | 视频链接 | url | 是 | 文案上为「视频转发至朋友圈」 |
| 同上 | `moments_comment` | 评论内容 | textarea | 选填 | maxLength 500 |
| `like_article` / `recommend_article` | `video_url` | 视频链接 | url | 是 | 文案为「视频点赞」「视频推荐」 |
| `report_channels_video` | `video_url` / `category` / `subcategory` | 视频链接 / 大分类 / 小分类 | url / select | 是 | `content` 选填，maxLength 1000 |
| 同上 | `content` | 投诉内容 | textarea | 选填 | |
| `comment_article` | `video_url` / `comment` | 视频链接 / 评论内容 | url / textarea | 是 | 文案为「视频评论」 |
| `like_comment` | `group_name` | 群名称 | text | 是 | 特定评论点赞 |
| `dislike_article_comment` | `group_name` | 群名称 | text | 是 | 视频踩评论 |
| `share_comment` | `group_name` / `comment` / `forward_target` | 群名称 / 转发评论 / 转发对象 | text / textarea / text | 是 | comment maxLength 1000 |
| `report_comment` | `group_name` / `category` | 群名称 / 投诉原因 | text / select | 群必填；原因选填 | |
| `reply_comment` | `group_name` / `reply_comment` | 群名称 / 回复内容 | text / textarea | 是 | reply maxLength 1000 |

### 8.5 小红书 `xiaohongshu`

| key | 字段 name | 标签 | 类型 | 必填 |
|-----|-----------|------|------|------|
| `vertical_nurture_xiaohongshu` | `keyword` | 关键词 | textarea | 是 |
| 同上 | `comment_rate` / `like_rate` / `collect_rate` | 评论/点赞/收藏频率（%） | slider | 是 |
| 同上 | `post_count` / `run_minutes` | 刷作品数量 / 运行时间（分钟） | number | 是 |
| 同上 | `comments` | 评论内容 | textarea | 是，maxLength 2000 |

### 8.6 系统 `system`

各指令 **`fields` 为空数组**，创建任务时仅需选择 `action_type` 与设备，无需填表单字段。

---

## 九、任务状态与日志状态（参考）

**任务 `tasks.status`**：`0` 待执行、`1` 执行中、`2` 已完成、`3` 已失败。

**任务设备 `task_devices.status`** 与 **日志 `task_logs.status`** 见模型 `Task`、`TaskLog` 中常量定义；撤回相关见 `is_revoked`、`revoke_status`。

---

*文档生成依据仓库内代码整理；若接口行为与运行环境配置不一致，以实际部署的 `config`、`.env` 及数据库为准。*
