# DemoGo

DemoGo 是一个试用链接生成与部署平台，目标是让开发出来的产品尽快被用户打开、试用和反馈。

它不是一个电商平台，也不是通用云厂商。DemoGo 的阶段目标是持续增强部署能力：从网页、前端项目，到 Node.js 单服务、MySQL 试用数据库，最终能够支撑完整应用项目的试用部署。

当前本地开发版本见根目录 `VERSION`。

## 当前支持

- 静态网页、单 HTML 页面、H5 页面、活动页、报名页、作品集。
- `dist`、`build`、`out`、`public` 等前端构建产物。
- 可构建成静态页面的 React、Vue、Vite 等前端源码项目。
- Node.js 单服务试用环境，需平台运行能力已开启。
- MySQL 空试用数据库，需平台数据库能力已开启。
- Supabase、Postgres 等外部后端线索可识别；后续优先支持连接用户自己的 Supabase。
- Next.js、Nuxt、TanStack Start 在满足单服务、start 命令、PORT 监听等条件时，可进入应用运行环境。
- 运行配置闭环：识别 `.env.example`，用户端可保存运行变量，明文不返回前端。
- MySQL 初始化闭环：项目包内 `schema.sql` 可在创建或重置试用库时执行。
- 项目识别 2.0：识别 Next.js、TanStack Start、Nuxt、SvelteKit、Astro、Express、Fastify、Hono、Supabase、Postgres、MySQL、Prisma、Drizzle 等线索，并给出缺失条件和 AI 修改建议。
- 复杂应用验收样本和失败样本：持续验证 `前端 + Node.js + MySQL` 主链路，以及缺启动命令、缺运行配置、端口监听错误、依赖安装失败、Redis 不支持等失败诊断。
- 试用交付报告：判断项目是否可以分享给用户试用、是否可以开始收集反馈，并给出下一步处理动作。
- Web 上传、CLI、MCP、Codex Skill、Codex Plugin、Claude Code Plugin、Agent API 发布。
- AI 发布页统一为一条通用提示词，让 Codex、Claude Code、Cursor 等工具共用同一套发布规则。
- AI/CLI/MCP 更新已有链接，链接保持不变。
- 内容安全检查、自动表单收集、套餐额度、管理后台。

## 当前不支持

- Python、Java、Go、FastAPI、Flask、Django 等非 Node 后端托管。
- 多服务编排、Docker Compose、Redis、MongoDB、PostgreSQL。
- DemoGo 自建或托管 Supabase。
- Remix、SvelteKit、Astro 等完整应用运行态。
- 需要 Redis、MongoDB、PostgreSQL、多服务编排或 WebSocket 的完整应用。
- WebSocket 长连接、真实支付系统、生产级用户登录系统托管。
- `.rar` 项目包。

## 本地验证

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

## 打包

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
```

只在明确需要发布时，再上传、部署和发布 npm CLI。

## 文档

- [当前状态](docs/CURRENT_STATUS.md)
- [技术架构](docs/ARCHITECTURE.md)
- [AI 发布与更新](docs/AI_PUBLISH.md)
- [部署说明](docs/DEPLOYMENT.md)
- [内容安全](docs/CONTENT_REVIEW.md)
- [AI 编程工具与部署平台调研矩阵](docs/AI_TOOLS_AND_DEPLOYMENT_PLATFORMS_BENCHMARK.md)
- [AI 编程工具产物形态调研](docs/AI_TOOL_OUTPUT_RESEARCH.md)
- [完整应用部署能力架构方案](docs/FULL_APP_HOSTING_ARCHITECTURE.md)
- [Supabase 集成规划](docs/SUPABASE_INTEGRATION_PLAN.md)
- [v0.5.0 项目识别 2.0 功能方案](docs/V0_5_0_PROJECT_CLASSIFIER_PLAN.md)
- [v0.5.1 完整应用运行闭环](docs/V0_5_1_RUNTIME_CLOSURE.md)
- [v0.5.2 失败诊断 2.0](docs/V0_5_2_FAILURE_DIAGNOSIS.md)
- [v0.5.3 Supabase 外部后端连接闭环](docs/V0_5_3_SUPABASE_EXTERNAL_BACKEND.md)
- [v0.6.0 复杂应用部署验收](docs/V0_6_0_COMPLEX_APP_READINESS.md)
- [v0.6.1 复杂应用样本验收包](docs/V0_6_1_COMPLEX_APP_SAMPLE_PACK.md)
- [v0.6.2 复杂应用失败样本库](docs/V0_6_2_COMPLEX_FAILURE_SAMPLES.md)
- [v0.7.0 试用交付报告与完整应用验收矩阵](docs/V0_7_0_TRIAL_DELIVERY_REPORT.md)
- [v0.8.0 AI 编程工具插件化集成](docs/V0_8_0_AI_TOOL_PLUGIN_INTEGRATION.md)
- [v0.9.0 AI 工具接入闭环](docs/V0_9_0_AI_TOOL_CONNECTION_CLOSURE.md)
- [路线图](docs/ROADMAP.md)
- [运维说明](docs/OPERATIONS.md)
