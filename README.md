# DemoGo

DemoGo 是一个试用链接生成与部署平台，让 AI 编程工具生成的产品尽快被用户打开、试用和反馈。

核心闭环：项目文件/源码 → DemoGo 检查 → 生成试用链接 → 分享给用户 → 收集反馈。

## 核心能力

- 静态网页、前端构建产物（React/Vue/Vite 等）
- Node.js 单服务运行环境
- MySQL 试用数据库，支持 schema.sql 初始化
- Supabase 外部后端连接
- Web/CLI/MCP/Codex Plugin/Claude Code Plugin/Agent API 全渠道发布
- 内容安全检查、自动表单收集、失败诊断

详情见 [AGENTS.md](AGENTS.md)。

## 本地验证

`powershell
cd server
npm run check
npm run test:smoke

cd ..\web
npm run lint
npm run build
`

## 打包与部署

`powershell
powershell -ExecutionPolicy Bypass -File scripts/build-demogo-packages.ps1
powershell -ExecutionPolicy Bypass -File scripts/deploy-demogo-release.ps1
`

详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 后续方向

- 继续增强 Node + MySQL 主链路
- Redis/MongoDB/PostgreSQL 自动托管
- Python/Go/Java 后端托管
- 多服务编排
- CDN 和大规模性能优化

Node + MySQL 主链路稳定后逐步扩展。
