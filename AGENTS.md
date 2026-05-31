# DemoGo Agent Instructions

## 核心工作原则

### 优先使用插件和技能

接受任务时按以下流程：
1. 先理解任务本质（部署、开发、调试、文档、设计、调研等）
2. 再匹配现有插件和技能
3. 然后检查插件商店
4. 最后才自定义开发

核心逻辑：先理解，再找工具，最后动手。

请始终用中文与项目负责人交流，表达简洁、直接、实事求是。所有技术决策需说明业务含义、实现逻辑、关键取舍和验证方式。

### 部署前强制检查清单

部署到线上前，必须完成以下全部检查（硬性门禁）：

1. `server npm run check` — 语法检查通过
2. `server npm run test` — 单元测试 0 失败
3. `server npm run test:integration` — 集成测试全部通过（硬性门禁）
4. `server npm run test:smoke` — 烟雾测试通过
5. `web npm run lint` — 前端 lint 通过
6. `web npm run build` — 前端构建成功
7. `npm audit` — server 和 web 均 0 漏洞
8. `node --check server/src/server.js` — 入口语法正确
9. 版本号统一：VERSION、server/package.json、cli/package.json、mcp/package.json

v0.9.4 事故教训：跳过集成测试导致缺少 start 脚本和 email/mailer.js 导出错误，服务无法启动。

## 项目定位

DemoGo 是一个试用链接生成与部署平台，让开发出的产品尽快被用户打开、试用和反馈。

核心闭环：项目文件或源码 → DemoGo 检查 → 生成试用链接 → 分享给用户 → 收集反馈。

## 当前支持

- 静态网页、dist/build/out/public 前端构建产物
- React/Vue/Vite 等源码构建项目
- Node.js 单服务运行环境
- MySQL 试用数据库，支持 schema.sql 初始化
- Supabase 外部后端连接
- Web/CLI/MCP/Codex Plugin/Claude Code Plugin/Agent API 发布
- 内容安全检查、自动表单收集、失败诊断

## 当前明确不支持

- Python/Java/Go 后端托管
- 多服务编排、Docker Compose
- Redis/MongoDB/PostgreSQL 自动托管
- WebSocket 长连接、真实支付系统
- .rar 项目包

## 产品原则

- 面向非技术用户表达，避免技术术语直接做核心说明
- 把方便留给用户，把麻烦留给 DemoGo
- AI 发布只给用户一条通用提示词
- 失败提示要告诉用户：为什么失败、有什么影响、下一步怎么改
- 不要制造能力错觉

## 技术架构

- 前端：React + Vite
- 后端：Node.js + Express（入口 server/src/server.js）
- 数据库：MySQL
- 静态托管：Nginx（/var/www/demogo-preview/d）
- 运行环境：Docker 容器化 Node.js
- 系统服务：systemd demogo-server.service，监听 3001

核心模块：
- `server/src/config.js` — 配置与版本
- `server/src/services/` — 15 个服务（项目识别、内容审查、失败诊断、运行环境等）
- `server/src/routes/` — 10 个路由
- `server/src/middleware/` — 认证、安全头、限流、请求 ID
- `server/src/lib/` — 密码工具、会话、限流器、日志
- `server/src/email/mailer.js` — 邮件发送

## 开发协作规则

- 较大改动前先给方案，确认后再改
- 不擅自做大规模重构、改无关代码、删文件
- 代码完成后必须测试，不能只说应该可以
- 优先复用现有模式，不引入不必要依赖
- 所有用户可见文案优先用非技术语言

## 版本和发布

- 开发完成不等于发布，只有明确说发布才部署
- 版本号以根目录 VERSION 为准
- 线上版本以 /api/health 返回为准
- 部署后必须同步验证 npm CLI 和 npx

## 测试要求

部署前至少执行：
```
server: npm run check → npm run test → npm run test:integration → npm run test:smoke
web: npm run lint → npm run build
```

## 打包与部署

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-demogo-packages.ps1
powershell -ExecutionPolicy Bypass -File scripts/deploy-demogo-release.ps1
```

详细说明见 docs/DEPLOYMENT.md 和 docs/OPERATIONS.md。

## 重要提醒

帮助用户区分：当前已支持什么、明确不支持什么、下一版本计划、长期方向。不要用模糊说法制造能力错觉。
