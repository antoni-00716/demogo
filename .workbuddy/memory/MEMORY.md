# Project Knowledge Base - DemoGo

## Project Overview
DemoGo: 试用链接生成与部署平台。让开发者上传项目包 -> 自动生成可访问的试用链接 -> 分享收集反馈。

## Codebase Architecture (Server v0.9.39)
- **server.js** (1086行): 主入口，模块组装 + 部署管线函数
- **Services** (23个): 拆分的业务逻辑模块
  - `deployment-executor.js` — 部署核心：提取→构建→保存
  - `runtime-service.js` — Docker/主机 Node.js 运行时管理
  - `build-service.js` — 前端构建 + 表单/追踪脚本注入
  - `deployment-job-service.js` — 异步队列部署任务管理
  - `failure-diagnosis-service.js` — 用户友好的错误诊断
  - `content-review-service.js` — 敏感内容扫描
  - `trial-analytics-service.js` — 分析事件
  - `project-classifier-service.js` — 项目类型识别
- **Routes** (11个): admin, agent, auth, demo-track, demos, deploy, feedback, forms, misc, plan-upgrade, subdomain
- **Middleware**: auth(会话/token/admin Basic Auth), csrf, rate-limiter, security(CSP), upload(multer), error-handler
- **Lib** (22个): data-access, archive-analyzer, session-store, storage, logger, audit-log, etc.
- **Queue**: BullMQ + Redis 异步部署
- **Email**: 从零实现的自定义 SMTP 协议（raw TCP/TLS Socket）
- **Storage**: local 文件系统 / MinIO S3 双后端抽象
- **Tests**: 18个测试文件（含4个集成测试），~6200行，覆盖 unit + integration + smoke
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + zustand, 85个源文件

## Server Deployment Config
- 阿里云 2C2G 40GB, Alibaba Cloud Linux 8
- Nginx(SSL) + Node.js(Express:3001) + Redis + MySQL + Docker
- `DEMOGO_RUNTIME_MAX_INSTANCES=1`, `DEMOGO_RUNTIME_MEMORY=384m`
- 数据文件每日 3:00 crontab 自动备份
- 部署路径 /opt/demogo/，systemd 服务 demogo-server.service
- 站点预览 /var/www/demogo-preview，备份目录 /opt/demogo/backups/
- 健康检查端点 http://127.0.0.1:3001/api/health

## Infrastructure Artifacts (P2 Completed)
- **infra/** — 基础设施配置入库（nginx/systemd/env/backup）
- **CI** — 增加了 version-check 和 smoke-test jobs，完整的6步流水线
- **回滚脚本** — 9个版本的回滚脚本（v0.9.31-39），基于备份恢复的完整回滚逻辑

## Known Issues
> ✅ 全部 10 个已知问题已在 v0.9.39 前修复完毕。
> 详见 .workbuddy/memory/archive/known-issues-resolved.md
