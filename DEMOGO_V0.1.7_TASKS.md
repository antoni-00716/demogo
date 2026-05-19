# DemoGo v0.1.7 开发任务清单

更新时间：2026-05-11

## 1. 本版本目标

v0.1.7 只交付：

- MySQL 数据库地基；
- JSON 到 MySQL 迁移；
- 发布体验优化；
- 项目检测增强；
- 规则体检报告。

## 2. 开发任务

### A. 数据库

- [x] 新增 `mysql2` 依赖；
- [x] 新增 MySQL 连接模块；
- [x] 新增建表 SQL；
- [x] 新增套餐初始化 SQL；
- [x] 新增 JSON 到 MySQL 迁移脚本；
- [x] 新增迁移校验脚本；
- [x] 配置后端读取数据库环境变量；
- [x] 更新部署脚本，支持加载 `/root/demogo-db.env`。

### B. 后端数据读写

- [x] 注册改为写入 `users`；
- [x] 登录改为读取 `users`；
- [x] Session 改为写入 `sessions`；
- [x] `/api/me` 改为读取 MySQL；
- [x] `/api/demos` 改为读取 MySQL；
- [x] `/api/deploy` 改为写入 `demos`、`demo_versions`、`project_inspections`；
- [x] `/api/demos/:id/update` 改为写入 MySQL；
- [x] 下线、恢复、删除改为更新 MySQL；
- [x] 管理后台概览改为读取 MySQL；
- [x] 审计日志改为写入 `audit_logs`；
- [x] 访问统计 flush 改为更新 MySQL。

### C. 项目检测增强

- [x] 检测入口文件；
- [x] 检测 `package.json`；
- [x] 检测 build 命令；
- [x] 检测表单字段；
- [x] 检测本地 API 调用；
- [x] 检测结果写入 `project_inspections`；
- [x] 检测失败返回结构化原因。

### D. 规则体检报告

- [x] 根据规则判断项目类型；
- [x] 判断是否为报名/预约/留言类页面；
- [x] 判断本地 API 风险；
- [x] 生成风险提示；
- [x] 生成修复建议；
- [x] 生成可复制给 AI 编程工具的提示词。

### E. 前端用户端

- [x] 上传区显示支持边界；
- [x] “开始发布”说明会自动检测；
- [x] 检测结果显示入口文件、build 命令、表单、API；
- [x] 检测失败展示原因和建议；
- [x] 展示规则体检报告；
- [x] 修复提示支持复制；
- [x] 发布成功展示链接、有效期、项目类型和注意事项。

### F. 部署与运维

- [x] 新增 v0.1.7 部署脚本；
- [x] 新增部署前备份步骤；
- [x] 新增数据库迁移步骤；
- [x] 新增部署后验证步骤；
- [x] 新增回滚步骤。

## 3. 自审清单

开发完成后必须自审：

- [x] 没有删除用户数据；
- [x] 没有改无关页面和功能；
- [x] 不再用 JSON 作为主数据源；
- [x] 迁移脚本不会覆盖已有 MySQL 数据；
- [x] 权限边界未破坏；
- [x] 上传安全规则未削弱；
- [x] 发布失败不会留下脏数据；
- [x] 审计日志仍然记录关键操作；
- [x] 密码、密钥、数据库连接信息未写入代码；
- [x] v0.1.7 范围没有扩张到大模型、表单托管、支付或 Docker。

## 4. 自测清单

### 数据库测试

- [ ] MySQL 连接成功；`ECS 部署时验证`
- [ ] 建表成功；`ECS 部署时验证`
- [ ] plans 初始化成功；`ECS 部署时验证`
- [ ] JSON 迁移成功；`ECS 部署时验证`
- [ ] 迁移后用户数量正确；`ECS 部署时验证`
- [ ] 迁移后 Demo 数量正确；`ECS 部署时验证`
- [ ] 迁移后日志数量正确。`ECS 部署时验证`

### API 测试

- [x] `/api/health`；
- [x] `/api/auth/register`；
- [x] `/api/auth/login`；
- [x] `/api/auth/logout`；
- [x] `/api/me`；
- [x] `/api/inspect`；
- [x] `/api/deploy`；
- [x] `/api/demos`；
- [x] `/api/demos/:id/update`；
- [x] `/api/demos/:id/offline`；
- [x] `/api/demos/:id/restore`；
- [x] `/api/demos/:id/delete`；
- [x] `/api/admin/overview`。

### 项目包测试

- [x] 根目录 `index.html`；
- [x] `dist/index.html`；
- [x] `build/index.html`；
- [ ] Vite/React/Vue 源码项目；`未在本地联网安装依赖，ECS 可继续补测`
- [x] 包含 `.env` 的项目应被阻止；
- [x] 包含 `node_modules` 的项目应被忽略；
- [x] 包含表单的项目能识别字段；
- [x] 包含 `/api/submit` 的项目能提示风险。

### 前端测试

- [ ] 首页可访问；`ECS 部署后验证`
- [ ] 登录页可访问；`ECS 部署后验证`
- [x] 用户端可登录；
- [x] 上传区文案正确；
- [x] 检测结果展示正确；
- [x] 规则体检报告展示正确；
- [x] 修复提示可复制；
- [x] Demo 链接可访问；
- [x] 管理后台仍受保护。

## 5. 交付要求

交付给用户前必须提供：

- 变更说明；
- 自审结果；
- 自测结果；
- 部署包；
- 部署步骤；
- 数据备份步骤；
- 数据迁移步骤；
- 发布后验证步骤；
- 回滚步骤。
