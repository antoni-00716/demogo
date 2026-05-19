# DemoGo 数据模型

更新时间：2026-05-11

## 1. 基本判断

DemoGo 可以在极早期用 JSON 文件跑通 MVP，但准商业化版本需要数据库和正式表结构。

关键原则：

> 存储介质可以演进，但业务数据模型必须先稳定。

下一阶段引入关系型数据库，当前已明确使用 MySQL。后续表结构、迁移脚本、备份方案和部署配置都以 MySQL 为准。

## 2. 数据库分组

建议将数据表分为 8 组：

| 分组 | 表 |
|---|---|
| 账号与权限 | `users`、`sessions` |
| 套餐与商业化 | `plans`、`user_plan_changes`、`orders`、`payments` |
| Demo 发布 | `demos`、`demo_versions`、`deployment_jobs` |
| 项目体检 | `project_inspections`、`ai_reports` |
| 表单托管 | `forms`、`form_fields`、`form_submissions` |
| 统计分析 | `usage_events`、`usage_daily_stats` |
| 运营审计 | `audit_logs` |
| 系统配置 | `system_settings` |

v0.1.7 不一定全部实现，但表结构要按这个方向设计。

## 3. 第一批必须落地的表

### 3.1 users

用户账号表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 用户 ID |
| `email` | varchar(255) | 邮箱 |
| `phone` | varchar(32), nullable | 手机号，后续可用 |
| `password_hash` | varchar(255) | 密码哈希 |
| `role` | varchar(32) | `user` / `admin` |
| `status` | varchar(32) | `active` / `disabled` / `deleted` |
| `plan_code` | varchar(32) | 当前套餐 code |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |
| `last_login_at` | datetime, nullable | 最后登录时间 |

约束：

- `email` 唯一；
- `plan_code` 默认 `free`；
- `status` 默认 `active`。

### 3.2 sessions

登录会话表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `token` | varchar(128) | Session token |
| `user_id` | varchar(36) | 用户 ID |
| `created_at` | datetime | 创建时间 |
| `expires_at` | datetime | 过期时间 |
| `ip` | varchar(64), nullable | 登录 IP |
| `user_agent` | text, nullable | 浏览器信息 |

### 3.3 plans

套餐定义表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `code` | varchar(32) | `free` / `lite` / `pro` |
| `name` | varchar(64) | 套餐名称 |
| `max_online_demos` | int | 最大在线 Demo 数 |
| `monthly_deploy_limit` | int | 每月发布/更新次数 |
| `demo_retention_days` | int | Demo 保留天数 |
| `max_zip_size_mb` | int | 最大上传包 |
| `max_forms` | int | 最大表单数 |
| `max_form_submissions` | int | 最大表单提交数 |
| `status` | varchar(32) | `active` / `inactive` |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

### 3.4 user_plan_changes

用户套餐变更记录。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 记录 ID |
| `user_id` | varchar(36) | 用户 ID |
| `from_plan_code` | varchar(32) | 原套餐 |
| `to_plan_code` | varchar(32) | 新套餐 |
| `reason` | varchar(255), nullable | 变更原因 |
| `actor_type` | varchar(32) | `admin` / `system` / `payment` |
| `actor_id` | varchar(36), nullable | 操作者 ID |
| `created_at` | datetime | 创建时间 |

### 3.5 demos

Demo 主表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | Demo ID |
| `user_id` | varchar(36) | 所属用户 |
| `slug` | varchar(128) | 访问路径 |
| `name` | varchar(255) | Demo 名称 |
| `status` | varchar(32) | `published` / `offline` / `expired` / `deleted` |
| `public_url` | varchar(512) | 访问链接 |
| `current_version` | int | 当前版本号 |
| `project_type` | varchar(64), nullable | 项目类型 |
| `detected_type` | varchar(64), nullable | 检测类型 |
| `entry_file` | varchar(255), nullable | 入口文件 |
| `file_count` | int | 当前发布文件数 |
| `total_bytes` | bigint | 当前发布体积 |
| `source_zip_path` | varchar(512), nullable | 源 zip 路径 |
| `output_path` | varchar(512) | 发布目录 |
| `expires_at` | datetime, nullable | 到期时间 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |
| `offline_at` | datetime, nullable | 下线时间 |
| `deleted_at` | datetime, nullable | 删除时间 |

约束：

- `slug` 唯一；
- `status` 必须为枚举值之一；
- 已发布 Demo 不允许直接删除，应先下线。

### 3.6 demo_versions

Demo 版本表，用于记录每次创建或更新。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 版本 ID |
| `demo_id` | varchar(36) | Demo ID |
| `version` | int | 版本号 |
| `action` | varchar(32) | `create` / `update` |
| `status` | varchar(32) | `success` / `failed` |
| `detected_type` | varchar(64), nullable | 检测类型 |
| `file_count` | int | 文件数 |
| `total_bytes` | bigint | 文件体积 |
| `build_status` | varchar(32), nullable | `skipped` / `success` / `failed` |
| `build_log` | mediumtext, nullable | 构建日志 |
| `inspection_id` | varchar(36), nullable | 体检记录 ID |
| `created_at` | datetime | 创建时间 |

### 3.7 deployment_jobs

发布任务表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 任务 ID |
| `user_id` | varchar(36) | 用户 ID |
| `demo_id` | varchar(36), nullable | Demo ID |
| `type` | varchar(32) | `create` / `update` / `inspect` |
| `status` | varchar(32) | `queued` / `running` / `success` / `failed` |
| `source_zip_path` | varchar(512) | 上传包路径 |
| `error_message` | text, nullable | 失败原因 |
| `started_at` | datetime, nullable | 开始时间 |
| `finished_at` | datetime, nullable | 完成时间 |
| `created_at` | datetime | 创建时间 |

短期可以同步执行，但仍建议写入任务记录。

### 3.8 project_inspections

项目检测表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 检测 ID |
| `user_id` | varchar(36) | 用户 ID |
| `demo_id` | varchar(36), nullable | Demo ID |
| `deployment_job_id` | varchar(36), nullable | 发布任务 ID |
| `can_publish` | boolean | 是否可发布 |
| `detected_type` | varchar(64) | 检测类型 |
| `entry_file` | varchar(255), nullable | 入口文件 |
| `has_package_json` | boolean | 是否包含 `package.json` |
| `has_build_script` | boolean | 是否有 build 命令 |
| `publishable_file_count` | int | 可发布文件数 |
| `publishable_bytes` | bigint | 可发布体积 |
| `ignored_files_json` | json/text | 已忽略文件 |
| `blocked_files_json` | json/text | 被阻止文件 |
| `api_calls_json` | json/text | 疑似 API 调用 |
| `form_fields_json` | json/text | 疑似表单字段 |
| `issues_json` | json/text | 问题列表 |
| `recommendations_json` | json/text | 建议列表 |
| `created_at` | datetime | 创建时间 |

### 3.9 ai_reports

AI 体检报告表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 报告 ID |
| `inspection_id` | varchar(36) | 检测 ID |
| `project_category` | varchar(64) | 活动报名页、官网、预约页等 |
| `main_functions_json` | json/text | 主要功能 |
| `publishability` | varchar(64) | 发布判断 |
| `risk_summary` | text | 风险摘要 |
| `fix_prompt` | mediumtext | 给 AI 编程工具的修复指令 |
| `form_hosting_prompt` | mediumtext, nullable | 接入表单托管的指令 |
| `model_provider` | varchar(64), nullable | AI 服务提供方 |
| `model_name` | varchar(64), nullable | 模型名称 |
| `created_at` | datetime | 创建时间 |

### 3.10 audit_logs

审计日志表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 日志 ID |
| `action` | varchar(64) | 操作类型 |
| `actor_type` | varchar(32) | `user` / `admin` / `system` |
| `actor_id` | varchar(36), nullable | 操作者 ID |
| `target_type` | varchar(64) | 操作对象类型 |
| `target_id` | varchar(36), nullable | 操作对象 ID |
| `ip` | varchar(64), nullable | IP |
| `metadata_json` | json/text | 扩展信息 |
| `created_at` | datetime | 创建时间 |

## 4. 第二批表单托管相关表

### 4.1 forms

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 表单 ID |
| `user_id` | varchar(36) | 用户 ID |
| `demo_id` | varchar(36), nullable | 所属 Demo |
| `name` | varchar(255) | 表单名称 |
| `description` | text, nullable | 描述 |
| `submit_token` | varchar(128) | 提交凭证 |
| `status` | varchar(32) | `active` / `disabled` / `deleted` |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

### 4.2 form_fields

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 字段 ID |
| `form_id` | varchar(36) | 表单 ID |
| `field_key` | varchar(128) | 字段键名 |
| `label` | varchar(128) | 显示名称 |
| `type` | varchar(32) | `text` / `phone` / `email` / `number` / `textarea` / `select` |
| `required` | boolean | 是否必填 |
| `sort_order` | int | 排序 |
| `created_at` | datetime | 创建时间 |

### 4.3 form_submissions

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 提交记录 ID |
| `form_id` | varchar(36) | 表单 ID |
| `demo_id` | varchar(36), nullable | Demo ID |
| `user_id` | varchar(36) | 表单所属用户 ID |
| `data_json` | json/text | 提交数据 |
| `ip` | varchar(64), nullable | 提交 IP |
| `user_agent` | text, nullable | 浏览器信息 |
| `status` | varchar(32) | `valid` / `spam` / `deleted` |
| `created_at` | datetime | 提交时间 |

## 5. 统计相关表

### 5.1 usage_events

记录原始访问事件，可按成本决定保留时间。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 事件 ID |
| `demo_id` | varchar(36) | Demo ID |
| `slug` | varchar(128) | slug |
| `event_type` | varchar(32) | `visit` / `form_submit` |
| `bytes` | bigint | 估算或真实流量 |
| `ip_hash` | varchar(128), nullable | 脱敏 IP |
| `user_agent` | text, nullable | 浏览器信息 |
| `created_at` | datetime | 创建时间 |

### 5.2 usage_daily_stats

日汇总表。

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 记录 ID |
| `demo_id` | varchar(36) | Demo ID |
| `date` | date | 日期 |
| `visits` | int | 访问次数 |
| `unique_visitors` | int | 估算独立访客 |
| `bytes` | bigint | 流量 |
| `form_submissions` | int | 表单提交数 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

## 6. 商业化预留表

### 6.1 orders

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 订单 ID |
| `user_id` | varchar(36) | 用户 ID |
| `plan_code` | varchar(32) | 套餐 |
| `amount_cents` | int | 金额，单位分 |
| `currency` | varchar(16) | 币种 |
| `status` | varchar(32) | `pending` / `paid` / `cancelled` / `refunded` |
| `payment_method` | varchar(32), nullable | 支付方式 |
| `paid_at` | datetime, nullable | 支付时间 |
| `created_at` | datetime | 创建时间 |

### 6.2 payments

| 字段 | 类型建议 | 含义 |
|---|---|---|
| `id` | varchar(36) | 支付记录 ID |
| `order_id` | varchar(36) | 订单 ID |
| `provider` | varchar(32) | `wechat` / `alipay` / `manual` |
| `provider_trade_no` | varchar(128), nullable | 第三方交易号 |
| `amount_cents` | int | 金额 |
| `status` | varchar(32) | 状态 |
| `raw_payload_json` | json/text | 回调原始数据 |
| `created_at` | datetime | 创建时间 |

## 7. JSON 到数据库迁移

当前 JSON 文件：

| JSON 文件 | 目标表 |
|---|---|
| `users.json` | `users` |
| `sessions.json` | `sessions` |
| `demos.json` | `demos`、`demo_versions`、`project_inspections` |
| `audit-logs.json` | `audit_logs` |

迁移步骤：

1. 停止发布写入或短暂停机；
2. 备份 `/var/lib/demogo/data`；
3. 创建数据库和表；
4. 执行迁移脚本；
5. 校验用户数、Demo 数、审计日志数；
6. 后端切换为数据库读写；
7. 保留 JSON 备份，不再作为主数据源；
8. 观察 24-48 小时后归档旧 JSON。

## 8. v0.1.7 数据地基建议

v0.1.7 建议至少完成：

- `users`
- `sessions`
- `plans`
- `demos`
- `demo_versions`
- `project_inspections`
- `audit_logs`

v0.1.7 的 AI 能力先做规则报告，不接大模型。`ai_reports` 暂不作为第一批必做表，可以先预留设计，规则体检结果写入 `project_inspections`。

不建议继续在 JSON 上新增复杂表单、订单或套餐能力。
