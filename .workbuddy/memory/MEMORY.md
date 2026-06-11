# Project Knowledge Base - DemoGo

## Project Overview
DemoGo: 试用链接生成与部署平台。让开发者上传项目包 -> 自动生成可访问的试用链接 -> 分享收集反馈。

## Codebase Architecture (Server v0.9.38)
- **server.js** (2630行): 主入口，模块组装 + 部署管线函数
- **Services** (23个): 拆分的业务逻辑模块
  - `deployment-executor.js` — 部署核心：提取→构建→保存
  - `runtime-service.js` — Docker/主机 Node.js 运行时管理
  - `build-service.js` — 前端构建 + 表单/追踪脚本注入
  - `deployment-job-service.js` — 异步队列部署任务管理
  - `failure-diagnosis-service.js` — 用户友好的错误诊断
  - `content-review-service.js` — 敏感内容扫描
  - `trial-analytics-service.js` — 分析事件
  - `project-classifier-service.js` — 项目类型识别
- **Routes** (10个): agent, auth, feedback, subdomain, plan-upgrade, forms, misc, deploy, demos, admin
- **Middleware**: auth(会话/token/admin Basic Auth), csrf, rate-limiter, security(CSP), upload(multer), error-handler
- **Lib** (22个): data-access, archive-analyzer, session-store, storage, logger, audit-log, etc.
- **Queue**: BullMQ + Redis 异步部署
- **Email**: 从零实现的自定义 SMTP 协议（raw TCP/TLS Socket）
- **Storage**: local 文件系统 / MinIO S3 双后端抽象
- **Tests**: 19个测试文件，~6200行，覆盖 unit + integration + smoke
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + zustand, 85个源文件

## Server Deployment Config
- 阿里云 2C2G 40GB, Alibaba Cloud Linux 8
- Nginx(SSL) + Node.js(Express:3001) + Redis + MySQL + Docker
- `DEMOGO_RUNTIME_MAX_INSTANCES=1`, `DEMOGO_RUNTIME_MEMORY=384m`
- 数据文件每日 3:00 crontab 自动备份

## Known Issues
1. 数据并发写风险: JSON文件读写无锁
2. SMTP 邮件器无连接池/重试
3. server.js 2630行仍然过大
4. 32个残留调试文件在 server/src/
5. 36个调试工具文件在项目根目录
6. 服务优雅关闭未实现（停机时 Docker 容器悬空）
7. 登录限流器纯内存（重启清零）
8. 无性能监控/告警
9. MySQL 已修复为仅监听 127.0.0.1
10. 无用户级磁盘配额（恶意用户可上传大文件撑满40GB）
