# AI 编程工具产物形态调研

## 调研目的

DemoGo 要服务的不是传统开发者单一上传网页，而是 AI 编程工具和 Agent 工具生成出来的真实项目。

因此，完整应用部署能力不能只按 DemoGo 自己假设的项目形态设计，而要覆盖主流 AI 编程工具实际生成和维护的项目类型。目标是优先满足约 95% 的常见试用部署需求。

## 核心结论

当前主流 AI 编程工具产物高度集中在 JavaScript/TypeScript Web 应用生态。

高频形态包括：

- 静态网页、营销页、H5、作品页。
- React/Vite、Vue/Vite、普通 SPA。
- Next.js、TanStack Start、Nuxt 等全栈/SSR/元框架项目。
- Node.js 后端或框架内置后端路由。
- Supabase/Postgres、平台内置数据库、少量 MySQL。
- 登录、表单、文件上传、第三方 API、OpenAI API、Stripe 支付等能力。
- 通过 `package.json` 脚本完成安装、构建、启动和测试。

对 DemoGo 来说，真正的 95% 覆盖目标不是“支持所有语言和所有云服务”，而是：

```text
JavaScript/TypeScript 主链路
  + 静态/前端构建
  + Node 运行
  + SSR/元框架
  + 环境变量
  + 数据库连接/初始化
  + AI 工具可一键发布和更新
```

## 工具类型

### 1. AI App Builder

这类工具直接从自然语言生成应用，产物更标准化，技术栈更容易归纳。

代表工具：

- Lovable
- Bolt
- v0
- Replit Agent

典型产物：

- React/TypeScript 前端。
- Tailwind、shadcn/ui、Radix UI 或类似组件体系。
- Vite、Next.js、TanStack Start、Nuxt 等构建/运行框架。
- Supabase、平台内置数据库或外部 API。
- 登录、表单、后台、Dashboard、支付、AI API 调用。

### 2. IDE / Terminal Agent

这类工具不是固定生成某种技术栈，而是在用户已有代码库里改代码、跑命令、修复错误和提交变更。

代表工具：

- Cursor
- Claude Code
- OpenAI Codex
- Gemini CLI
- OpenCode
- OpenClaw 这类本地/自治 Agent

典型特点：

- 产物形态取决于用户当前代码库。
- 高频使用 `npm install`、`npm run build`、`npm run dev`、`npm test`。
- 需要读取项目说明文件，例如 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules`。
- 越来越多工具支持 MCP，用外部工具完成部署、数据库、浏览器测试等操作。

这类工具对 DemoGo 的要求不是“猜它会生成什么”，而是提供稳定的 CLI/MCP/Agent API，让它们能按明确指令完成发布和更新。

## 重点工具观察

### Lovable

官方文档显示，2026 年 5 月 13 日之后创建的新 Lovable 应用使用 TanStack Start 和 SSR；老项目使用 React + Vite。Lovable 使用 Tailwind，并通过 Lovable Cloud、Supabase 和第三方 API 支持后端能力。

对 DemoGo 的影响：

- 只支持静态 Vite 不够。
- 需要识别 TanStack Start。
- 需要支持 SSR/Node 运行态或至少给出清晰失败提示。
- Supabase 连接和密钥配置要进入能力规划。

### Bolt

Bolt 官方说明其重点是 JavaScript Web 技术，支持 Node.js 后端，前端支持浏览器原生 JavaScript 框架；数据库方面提供 Bolt Cloud 内置数据库，也可连接 Supabase。

对 DemoGo 的影响：

- JavaScript/TypeScript 是最优先主链路。
- Node 后端必须做稳。
- Expo/mobile 可以先支持 Web 预览，不必马上支持原生 App 打包。
- 数据库不能只考虑 MySQL，至少要兼容外部 Supabase/Postgres 连接。

### v0

v0 官方定位已经不只是 UI 生成，可以生成落地页、Dashboard、电商模板、AI 应用和 full-stack applications，并可连接后端和部署到 Vercel。

对 DemoGo 的影响：

- Next.js 和 Vercel 风格项目会很常见。
- 前端组件、页面、Dashboard、轻量全栈应用是高频场景。
- 需要支持 Next.js 静态导出、Node 运行态，或明确区分支持/暂不支持。

### Replit Agent

Replit Agent 官方说明它可以构建 Web app、mobile app、data dashboard、AI-powered tools，并能设置基础设施、配置数据库、测试和部署。

对 DemoGo 的影响：

- 用户会期望 DemoGo 不只是托管页面，而是能处理“应用 + 数据库 + 部署状态”。
- Dashboard、数据看板、AI 工具、小型业务系统都应作为主场景。
- 文件、CSV、PDF、数据可视化类项目也会出现，但优先级低于 Web 应用主链路。

### Cursor / Claude Code / Codex / Gemini CLI / OpenCode

这些工具更像“工程执行 Agent”，不是固定模板生成器。

共同点：

- 能读写文件。
- 能执行终端命令。
- 能跑测试和修复错误。
- 能连接 MCP 或外部工具。
- 能在现有项目上持续迭代。

对 DemoGo 的影响：

- DemoGo CLI、MCP、Agent API 是必须长期维护的入口。
- 发布指令必须简单、稳定、可复制。
- 更新已有链接能力非常关键。
- 失败提示要能直接告诉 AI 工具怎么修。

### OpenClaw

OpenClaw 相关公开信息目前搜索结果非常混杂，存在大量第三方站点、镜像站和安全风险讨论。它更适合作为“本地自治 Agent / 多工具执行平台”的代表，而不是某一种固定项目技术栈的代表。

对 DemoGo 的影响：

- 不应基于 OpenClaw 推断固定技术栈。
- 应把它归入“能调用 CLI/MCP/API 的通用 Agent”。
- DemoGo 需要提供低歧义、低权限风险、可审计的发布入口。

## 95% 覆盖目标

### 第一优先级：必须覆盖

- 单 HTML、静态网站、H5、营销页、报名页。
- React/Vite、Vue/Vite、普通 SPA。
- `dist`、`build`、`out`、`public` 构建产物。
- Node.js 单服务。
- Express、Fastify、Hono 等常见 Node Web 服务。
- Next.js、TanStack Start、Nuxt 的静态产物识别。
- `package.json` 中的 `build`、`start`、`dev`、`preview` 脚本识别。
- `.env.example`、`.env.template`、环境变量缺失提示。
- 外部 API Key 配置，例如 OpenAI、Stripe、邮件服务。
- 数据库连接信息配置和缺失诊断。
- AI/CLI/MCP 发布与更新已有链接。

### 第二优先级：为了完整应用必须逐步覆盖

- Next.js Node server 运行态。
- TanStack Start SSR 运行态。
- Nuxt Node server 运行态。
- Prisma、Drizzle、Sequelize、TypeORM 等数据库线索识别。
- `schema.sql`、`migrations/`、`prisma/schema.prisma` 初始化识别。
- Supabase/Postgres 外部连接配置。
- 内置试用数据库的初始化、重置、删除。
- 运行日志和启动失败诊断。

### 第三优先级：先说明边界

- Expo / React Native：先支持 Web 预览，不做原生 App 打包。
- Electron / Tauri：先支持 Web 部分或静态构建，不做桌面安装包。
- Flutter：暂不作为主链路。
- Python、Java、Go 后端：暂不纳入 95% 主链路。
- Redis、MongoDB、队列、对象存储：后续再扩展。
- WebSocket、实时协作、生产支付回调：先明确暂不支持。

## 对 DemoGo 架构方案的修正建议

原来“Node.js + MySQL”方向是必要的，但不足以覆盖主流 AI 工具产物。

建议把后续能力主线调整为：

```text
静态/前端构建
  -> Node 单服务
  -> Node 元框架运行态
  -> 环境变量和密钥配置
  -> 数据库连接和初始化
  -> Supabase/Postgres 外部后端连接
  -> 完整应用样本验收
```

其中最关键的变化是：

- 不要把“数据库能力”理解成只创建 MySQL。
- 要把 Supabase/Postgres 作为 AI App Builder 高频产物提前纳入规划。
- Supabase 第一阶段应是“连接用户自己的 Supabase”，不是 DemoGo 自己托管 Supabase。
- 对 SSR 元框架要有明确策略：能静态化就静态化，不能静态化就进入 Node 运行态。

## 建议版本节奏调整

### v0.4.4 AI 工具产物调研与能力矩阵

- 完成主流 AI 工具产物形态调研。
- 形成 DemoGo 95% 覆盖目标。
- 修正完整应用部署架构方案。

### v0.5.0 项目识别增强

- 强化项目识别器。
- 增加 Next.js、TanStack Start、Nuxt、Express、Fastify、Hono、Supabase、Prisma、Drizzle 等识别。
- 用户端展示“识别到的项目形态”和“当前是否可发布”。

### v0.5.1 完整应用运行闭环

- 不只支持简单 Node 服务。
- 支持符合条件的 Next.js、Nuxt、TanStack Start 单服务运行。
- 支持运行配置保存、缺失配置后补齐和 MySQL `schema.sql` 初始化。
- 用户端和管理端展示运行状态、数据库状态和日志摘要。

### v0.5.2 失败诊断 2.0

- 建立统一失败诊断对象。
- AI 发布失败时返回失败类别、证据、处理动作和 AI 修复提示。
- 用户端和管理端展示失败诊断，让用户知道下一步怎么改。

### v0.5.3 Supabase 外部后端连接闭环

- 合并 Supabase 配置、检测、注入和诊断。
- 识别 Supabase 项目线索和环境变量。
- 用户端支持填写 Supabase URL 和 anon key。
- 保存配置时做基础连通性检测。
- 根据项目类型注入 `VITE_SUPABASE_*`、`NEXT_PUBLIC_SUPABASE_*` 或服务端变量。
- 拒绝保存 `service_role` 高权限密钥。
- 外部后端配置不可用时返回结构化诊断和 AI 修复提示。
- 管理端区分 DemoGo MySQL 试用库和用户自有 Supabase。

### v0.6.0 完整应用样本验收

- 用接近电商平台结构的完整应用作为验收样本。
- 验证 `前端 + Node.js + MySQL` 和 `前端 + Supabase` 两类主链路。

## 调研来源

- Lovable FAQ: https://docs.lovable.dev/introduction/faq
- Bolt supported technologies: https://support.bolt.new/building/supported-technologies
- Bolt get started: https://bolt.new/get-started/
- v0 Docs: https://v0.app/docs
- v0 API Docs: https://v0.app/docs/api
- Replit Agent Docs: https://docs.replit.com/references/agent/overview
- Cursor Agent Docs: https://docs.cursor.com/agent
- Cursor Background Agents: https://docs.cursor.com/background-agents
- Claude Code Docs: https://code.claude.com/docs
- OpenAI Codex Docs: https://developers.openai.com/codex/cloud
- OpenAI Code Generation Guide: https://developers.openai.com/api/docs/guides/code-generation
- Gemini CLI Docs: https://developers.google.com/gemini-code-assist/docs/gemini-cli
- OpenCode: https://opencode.ai/
- TanStack Start Docs: https://tanstack.com/start/latest/docs/framework/react/overview
- Next.js Docs: https://nextjs.org/docs
- Nuxt Deployment Docs: https://nuxt.com/docs/4.x/getting-started/deployment
