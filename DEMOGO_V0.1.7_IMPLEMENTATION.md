# DemoGo v0.1.7 技术实施方案

更新时间：2026-05-11

## 1. 当前确认

数据库环境已确认：

| 项目 | 结果 |
|---|---|
| 数据库类型 | MySQL |
| 版本 | 8.0.45 |
| 部署位置 | 阿里云 ECS 本机 |
| 服务名 | `mysqld` |
| 数据库名 | `demogo` |
| 应用账号 | `demogo_app` |
| 配置文件 | `/root/demogo-db.env` |

注意：数据库密码已重置，后续不要在聊天或文档中记录明文密码。

## 2. v0.1.7 实施目标

v0.1.7 只做四件事：

1. 将核心数据从 JSON 主存储迁移到 MySQL；
2. 增强项目检测结果；
3. 生成规则体检报告；
4. 优化用户端发布体验。

不做：

- 大模型 AI；
- 正式表单托管；
- 管理后台套餐调整；
- 支付；
- Docker；
- 完整后端应用运行；
- 全量微服务拆分。

## 3. 数据库表

v0.1.7 实际落地 7 张表：

```text
users
sessions
plans
demos
demo_versions
project_inspections
audit_logs
```

暂不落地：

```text
forms
form_fields
form_submissions
orders
payments
ai_reports
```

原因：

- v0.1.7 的重点是地基稳定；
- 表单托管是 v0.2；
- 大模型 AI 报告后置；
- 订单支付后置。

## 4. 建议新增文件

建议新增：

```text
server/src/db/mysql.js
server/src/db/schema.sql
server/src/db/seed-plans.sql
server/src/db/migrate-json-to-mysql.js
server/src/db/verify-migration.js
server/src/repositories/users.js
server/src/repositories/sessions.js
server/src/repositories/demos.js
server/src/repositories/auditLogs.js
server/src/repositories/plans.js
server/src/repositories/inspections.js
```

如果为了降低 v0.1.7 改动量，也可以先不完整拆模块，采用较小步方式：

```text
server/src/db.js
server/src/repository.js
```

但不建议继续在 `server.js` 中直接写所有 SQL。

## 5. 依赖变化

当前后端依赖：

```json
{
  "cookie-parser": "^1.4.7",
  "express": "^4.19.2",
  "multer": "^2.0.2",
  "unzipper": "^0.12.3"
}
```

v0.1.7 需要新增 MySQL 驱动：

```text
mysql2
```

原因：

- 支持 Promise；
- 与 MySQL 8 兼容；
- Node.js 生态成熟。

## 6. 环境变量

后端新增数据库配置：

```text
DEMOGO_DB_HOST=127.0.0.1
DEMOGO_DB_PORT=3306
DEMOGO_DB_NAME=demogo
DEMOGO_DB_USER=demogo_app
DEMOGO_DB_PASSWORD=从 /root/demogo-db.env 读取
```

部署时建议 systemd 服务加载环境文件：

```text
EnvironmentFile=/root/demogo-db.env
```

## 7. JSON 到 MySQL 迁移映射

### 7.1 users.json -> users

| JSON 字段 | MySQL 字段 |
|---|---|
| `id` | `id` |
| `email` | `email` |
| `passwordHash` | `password_hash` |
| `plan` | `plan_code` |
| `createdAt` | `created_at` |

补默认值：

- `role`: `user`
- `status`: `active`
- `updated_at`: `createdAt` 或当前时间

### 7.2 sessions.json -> sessions

| JSON 字段 | MySQL 字段 |
|---|---|
| `token` | `token` |
| `userId` | `user_id` |
| `createdAt` | `created_at` |
| `expiresAt` | `expires_at` |

### 7.3 demos.json -> demos

| JSON 字段 | MySQL 字段 |
|---|---|
| `id` | `id` |
| `userId` | `user_id` |
| `slug` | `slug` |
| `name` | `name` |
| `status` | `status` |
| `publicUrl` | `public_url` |
| `version` | `current_version` |
| `detectedType` | `detected_type` |
| `fileCount` | `file_count` |
| `extractedBytes` | `total_bytes` |
| `expiresAt` | `expires_at` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `offlineAt` | `offline_at` |
| `deletedAt` | `deleted_at` |

补充：

- `output_path`: `/var/www/demogo-preview/d/{slug}`
- `entry_file`: 从 `inspection.entryFile` 或增强检测结果提取，旧数据可为空
- `project_type`: 旧数据可为空

### 7.4 demos.json deployEvents -> demo_versions

如果旧 Demo 有 `deployEvents`：

- 每条事件生成一条 `demo_versions`；
- `type` 映射为 `action`；
- `at` 映射为 `created_at`。

如果没有 `deployEvents`：

- 用 `createdAt` 生成一条 `create` 版本记录。

### 7.5 demos.json inspection -> project_inspections

如果旧 Demo 有 `inspection`：

- 将检测摘要写入 `project_inspections`；
- JSON 结构字段写入 `issues_json`、`recommendations_json`、`ignored_files_json` 等。

如果没有：

- 不强制补历史检测记录。

### 7.6 audit-logs.json -> audit_logs

| JSON 字段 | MySQL 字段 |
|---|---|
| `id` | `id` |
| `action` | `action` |
| `actorType` | `actor_type` |
| `actorId` | `actor_id` |
| `targetType` | `target_type` |
| `targetId` | `target_id` |
| `ip` | `ip` |
| `metadata` | `metadata_json` |
| `createdAt` | `created_at` |

## 8. 后端改造范围

当前后端主要通过 `readJson` / `writeJson` 读写：

- `usersFile`
- `sessionsFile`
- `demosFile`
- `auditLogsFile`

v0.1.7 要替换的核心读写：

| 当前逻辑 | 改造目标 |
|---|---|
| 注册读取/写入 `users.json` | `users` 表 |
| 登录读取 `users.json` | `users` 表 |
| 创建 Session 写入 `sessions.json` | `sessions` 表 |
| 获取当前用户读取 `sessions.json` + `users.json` | 联查或两次查询 |
| Demo 列表读取 `demos.json` | `demos` 表 |
| 发布写入 `demos.json` | `demos` + `demo_versions` + `project_inspections` |
| 更新 Demo | `demos` + `demo_versions` |
| 下线/恢复/删除 | 更新 `demos.status` 等字段 |
| 审计日志 | `audit_logs` 表 |
| 访问统计 flush | 更新 `demos` 统计字段或后续统计表 |

为降低改造风险，v0.1.7 可以暂时保留 `demos` 表中的统计字段：

```text
visits
estimated_bytes
unique_visitors_estimate
last_visited_at
```

后续真实访问统计再拆到 `usage_events` 和 `usage_daily_stats`。

## 9. 项目检测增强

当前检测入口：

```text
inspectProjectZip
analyzeZipEntries
createInspectionSummary
extractStaticDemo
detectBuildAndNormalizeOutput
```

v0.1.7 增强：

- 检测入口文件；
- 检测 `package.json`；
- 检测 build 命令；
- 检测表单字段；
- 检测本地 API 调用；
- 生成规则体检报告。

检测结果建议新增字段：

```json
{
  "entryFile": "index.html",
  "hasPackageJson": true,
  "hasBuildScript": true,
  "formFields": [],
  "apiCalls": [],
  "ruleReport": {
    "projectCategory": "活动报名页",
    "publishability": "可以发布，但数据提交可能不可用",
    "risks": [],
    "recommendations": [],
    "fixPrompt": ""
  }
}
```

## 10. 前端改造范围

主要修改 `app.html`：

- 上传区域增加支持边界说明；
- “开始发布”说明自动检测；
- 检测结果展示入口文件、build 命令、表单/API；
- 发布失败展示结构化原因；
- 规则体检报告分块展示；
- AI 修复提示支持复制。

尽量不大规模重构页面结构。

## 11. 部署方案

v0.1.7 部署顺序建议：

1. 备份线上 JSON 数据；
2. 备份当前后端包和前端页面；
3. 上传 v0.1.7 包；
4. 安装新增依赖；
5. 创建/更新 MySQL 表；
6. 运行迁移脚本；
7. 校验迁移结果；
8. 配置 systemd 加载 `/root/demogo-db.env`；
9. 重启 `demogo-server`；
10. 健康检查；
11. 核心流程验证。

## 12. 回滚方案

如果 v0.1.7 部署失败：

1. 停止 `demogo-server`；
2. 恢复 v0.1.6 后端代码；
3. 恢复 v0.1.6 前端页面；
4. 移除或忽略数据库环境变量；
5. 确保旧 JSON 数据目录仍在；
6. 重启服务；
7. 验证 `/api/health` 返回 v0.1.6；
8. 验证注册、登录、Demo 列表和 Demo 链接。

重点：

- 迁移前必须完整备份 `/var/lib/demogo/data`；
- v0.1.7 初次上线不删除 JSON；
- 回滚时仍可回到 JSON 数据。

## 13. 自审重点

代码完成后必须自审：

- 是否所有用户只能访问自己的 Demo；
- 是否所有写操作都进入 MySQL；
- 是否旧 JSON 不再作为主数据源；
- 是否迁移脚本不会覆盖已有数据；
- 是否敏感文件检测仍有效；
- 是否发布失败不会污染数据库；
- 是否下线/恢复/删除状态正确；
- 是否审计日志完整。

## 14. 自测清单

本地或测试环境至少验证：

- 建表脚本可执行；
- 迁移脚本可执行；
- 迁移结果数量正确；
- 用户注册；
- 用户登录；
- 获取当前用户；
- 上传检测；
- 静态项目发布；
- 源码项目构建发布；
- Demo 更新；
- Demo 下线；
- Demo 恢复；
- Demo 删除；
- 管理后台概览；
- 规则体检报告；
- 表单/API 风险提示；
- `/api/health` 正常。

## 15. 下一步开发动作

确认后进入代码开发：

1. 新增 MySQL 依赖；
2. 新增数据库 schema；
3. 新增迁移脚本；
4. 改造后端读写；
5. 增强检测；
6. 优化前端展示；
7. 自审；
8. 自测；
9. 打包和部署说明。
