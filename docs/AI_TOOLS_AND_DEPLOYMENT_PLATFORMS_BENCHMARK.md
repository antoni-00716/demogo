# AI 编程工具与部署平台调研矩阵

## 调研目标

DemoGo 后续要覆盖的不是抽象的“项目”，而是 AI 编程工具真实生成、修改、发布出来的项目。

本调研围绕两类对象：

- 主流 AI 编程工具和 Agent 工具 10 个。
- 主流部署平台 10 个，其中加入 Zeabur 作为重点参考对象。

目标是回答三个问题：

1. AI 工具主要产出什么项目形态。
2. 主流部署平台如何承接这些项目。
3. DemoGo 要满足约 95% 常见试用部署需求，应优先建设哪些能力。

## 一、主流 AI 编程工具 10 个

| 工具 | 典型产物 | 高频技术栈/能力 | 对 DemoGo 的启发 |
| --- | --- | --- | --- |
| Lovable | 全栈网站、SaaS 原型、业务系统、落地页 | 新项目为 TanStack Start + SSR；老项目为 React + Vite；Tailwind；Lovable Cloud、Supabase、第三方 API | 必须识别 TanStack Start 和 SSR；不能只支持 Vite 静态前端；Supabase 要纳入规划 |
| Bolt.new | Web App、前端项目、Node 后端、原型应用 | JavaScript/TypeScript、Node.js、前端框架、Supabase/数据库连接 | JS/TS + Node 是主链路；数据库和环境变量是刚需 |
| v0 | UI、落地页、Dashboard、电商模板、轻量全栈应用 | Next.js、React、shadcn/ui、Vercel 生态、后端连接 | Next.js 项目会高频出现；需要支持静态导出和 Node 运行态两种路径 |
| Replit Agent | Web App、移动体验、数据看板、AI 工具、文档和原型 | API 路由、数据库、服务端逻辑、内置部署、第三方服务 | 用户预期是“应用可运行”，不是只看页面；运行状态和数据库状态必须可见 |
| Firebase Studio | AI 原型、全栈 agentic web app | Firebase 服务、Web App、自动 provision 服务、发布流程 | 外部 BaaS/云服务连接会常见；环境变量和服务连接配置必须产品化 |
| Cursor | 现有项目改造、Bug 修复、功能开发、自动发布脚本 | 终端命令、MCP、项目规则、代码编辑、测试 | DemoGo CLI/MCP/API 要稳定；失败提示要能直接给 Agent 修 |
| Windsurf / Cascade | IDE 内 Agent 开发、重构、工具调用 | Code/Chat 模式、工具调用、MCP、终端、检查点 | 需要可复制、低歧义的发布指令；发布动作要可审计 |
| Claude Code | 终端型 Agent 工程任务 | 读代码、改文件、跑命令、MCP、Hooks | CLI 发布和更新能力是核心入口；需要兼容本地项目目录工作流 |
| OpenAI Codex | 云端或本地 coding agent 任务 | 沙箱环境、读写代码、运行测试、依赖安装 | Agent 发布要能在一次任务中完成；失败原因要结构化返回 |
| GitHub Copilot Coding Agent | Issue 到 PR 的自动开发任务 | GitHub Actions 环境、仓库任务、PR、测试 | 未来可考虑 GitHub 集成；现在优先保证 CLI/API 可在 CI/Agent 环境调用 |

## 二、主流部署平台 10 个

| 平台 | 核心能力 | 关键设计 | 对 DemoGo 的启发 |
| --- | --- | --- | --- |
| Vercel | 前端和全栈部署、Preview URL、Next.js 生态 | 自动识别框架；每次部署生成唯一预览 URL；支持环境变量 | DemoGo 应强化框架识别、版本链接、预览链接和 Next.js 适配 |
| Netlify | 静态站、函数、Edge Functions、Deploy Preview | 原子部署、分支部署、部署上下文、环境变量按上下文隔离 | DemoGo 更新版本应保证链接稳定；发布记录和上下文配置要清晰 |
| Cloudflare Pages / Workers | 静态站、Pages Functions、边缘运行 | Production/Preview 环境变量、Functions bindings、全球网络 | DemoGo 暂不做边缘网络，但应学习“环境隔离”和函数边界表达 |
| Render | Web Service、静态站、数据库、私有网络 | Build/Start 命令、环境变量、Postgres、运行状态 | DemoGo 后端运行态要展示启动命令、健康状态和日志 |
| Railway | 服务、数据库、模板、变量共享 | Service 变量、Shared variables、数据库模板、Postgres/MySQL/Redis/Mongo 模板 | DemoGo 需要“项目 = 多资源集合”的模型，而不只是一个链接 |
| Zeabur | 应用部署、多服务、数据库、环境变量、测试子域名 | 自动注入 `PORT`、服务 Host、数据库凭据；提供 `.zeabur.app` 测试子域名 | 与 DemoGo 完整应用目标高度相关；环境变量和服务依赖要自动化 |
| Fly.io | 容器/机器运行、区域部署、卷、进程组 | `fly.toml`、Machines、Volumes、Process groups、Postgres | DemoGo 可参考容器状态、资源限制、重启和健康检查模型 |
| Heroku | 经典 PaaS、Dyno、Add-ons、Config Vars | Dyno Manager 运行进程；Postgres/Redis/Kafka 等 Add-ons | DemoGo 套餐和资源权益可参考 Dyno + Add-on 思路 |
| Firebase Hosting / App Hosting | Firebase 全栈部署、SSR、Secret/环境变量 | 与 Firebase Studio 产物天然结合；支持全栈 Web App | 对 AI 生成应用，BaaS 连接和密钥管理非常重要 |
| DigitalOcean App Platform | PaaS、Git/镜像部署、组件、数据库 | App spec、环境变量、数据库 bindable variables、日志和故障排查 | DemoGo 需要把“应用组件、数据库、环境变量、日志”统一成项目视图 |

说明：AWS Amplify 也是重要部署平台，但如果严格选 10 个，本轮优先纳入 Zeabur，因为 Zeabur 与 DemoGo 的“应用部署、多服务、数据库、环境变量、测试子域名”目标更接近。AWS Amplify 暂列为候补观察对象。

## 三、AI 工具产物的 95% 覆盖判断

### 必须优先覆盖

- 单 HTML、静态网页、H5、营销页、报名页。
- React/Vite、Vue/Vite、普通 SPA。
- Next.js、TanStack Start、Nuxt、SvelteKit、Astro 等元框架识别。
- Node.js 单服务。
- Express、Fastify、Hono 等常见 Node Web 服务。
- `package.json` 脚本识别：`build`、`start`、`start:prod`、`dev`、`preview`。
- 构建产物识别：`dist`、`build`、`out`、`.output`、`.next`、`public`。
- 环境变量识别：`.env.example`、`.env.template`、`.env.local.example`。
- 数据库线索识别：Supabase、Postgres、MySQL、Prisma、Drizzle、Sequelize、TypeORM。
- AI/CLI/MCP/API 发布和更新已有链接。
- 发布失败后的 AI 修复提示。

### 第二阶段覆盖

- Next.js Node 运行态。
- TanStack Start SSR 运行态。
- Nuxt Nitro 运行态。
- SvelteKit Node adapter。
- Supabase 外部连接配置。
- Postgres 外部连接配置。
- MySQL 试用数据库初始化。
- `schema.sql`、`migrations/`、`prisma/schema.prisma` 识别。
- 环境变量安全保存、注入和缺失诊断。
- 运行日志、构建日志、启动失败诊断。

### 暂不作为主链路

- Python、Java、Go 后端。
- Redis、MongoDB、队列、对象存储。
- Docker Compose 和多服务编排。
- WebSocket 长连接。
- 生产级支付回调。
- 生产级长期数据库托管。
- Expo/React Native 原生打包。
- Electron/Tauri 桌面安装包。

这些能力可以后续扩展，但不应阻碍当前 MVP 进入完整应用试用部署阶段。

## 四、DemoGo 能力矩阵

| 能力 | 当前状态 | 目标状态 | 优先级 |
| --- | --- | --- | --- |
| 静态网页发布 | 已支持 | 稳定保持 | P0 |
| 前端源码构建 | 已支持基础路径 | 扩展更多框架识别和失败提示 | P0 |
| AI/CLI/MCP 发布 | 已支持 | 持续稳定，强化更新版本 | P0 |
| Node 单服务 | 已具备基础能力 | 状态持久化、日志、健康检查 | P0 |
| SSR 元框架 | 识别不足 | Next/TanStack Start/Nuxt/SvelteKit 分类和运行策略 | P0 |
| 环境变量 | 仍偏技术化 | 用户端配置、Agent 提示、服务端安全注入 | P0 |
| MySQL 试用数据库 | 已有基础能力 | 初始化、重置、状态展示 | P1 |
| Supabase/Postgres 外部连接 | 尚未产品化 | 配置引导、变量注入、连接诊断 | P1 |
| 多服务编排 | 暂不支持 | 先做单服务完整应用，再评估 | P2 |
| 生产级托管 | 暂不支持 | 短期不做 | P3 |

## 五、后续版本规划建议

### v0.4.4 调研和架构修正

- 完成 AI 工具和部署平台调研矩阵。
- 修正完整应用部署架构方案。
- 明确 DemoGo 95% 覆盖目标。

### v0.5.0 项目识别 2.0

- 强化项目识别器。
- 识别 Vite、Next.js、TanStack Start、Nuxt、SvelteKit、Astro。
- 识别 Express、Fastify、Hono。
- 识别 Supabase、Postgres、MySQL、Prisma、Drizzle。
- 用户端展示“识别结果 + 当前是否可发布 + 缺什么”。

### v0.5.1 完整应用运行闭环

- 支持符合条件的 Node.js 单服务和部分 SSR/元框架项目进入运行环境。
- 支持运行配置保存、缺失配置后补齐。
- 支持 MySQL 试用数据库 `schema.sql` 初始化和重置。
- 用户端和管理端展示运行状态、数据库状态和日志摘要。

### v0.5.2 失败诊断 2.0

- 建立统一失败诊断对象。
- AI 发布失败时返回失败类别、证据、处理动作和 AI 修复提示。
- 用户端和管理端展示失败诊断，帮助判断真实卡点。

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

- 用接近电商平台结构的完整应用做验收样本。
- 验收 `前端 + Node.js + MySQL` 和 `前端 + Supabase` 两类主链路。
- 目标不是开发电商平台，而是证明 DemoGo 能部署这类完整应用。

## 六、对产品表达的影响

DemoGo 首页和用户端后续可以从“发布网页”升级为：

```text
把你的产品变成一个可以试用的链接。

无论它是网页、原型、前端项目，还是带后端和数据库的完整应用，
DemoGo 都帮助你尽快让用户打开、试用、反馈。
```

但在能力没有完成前，页面不能提前承诺“完整应用均可部署”。应使用分阶段表达：

- 当前已支持：网页、前端项目、部分 Node 应用。
- 正在增强：SSR 应用、环境变量、数据库初始化。
- 暂不支持：多服务编排、生产级托管、复杂云资源。

## 主要参考资料

- Lovable FAQ: https://docs.lovable.dev/introduction/faq
- Bolt supported technologies: https://support.bolt.new/building/supported-technologies
- v0 Docs: https://v0.app/docs
- Replit Agent: https://docs.replit.com/core-concepts/agent/
- Replit Web Apps: https://docs.replit.com/replitai/web-apps
- Firebase Studio App Prototyping Agent: https://firebase.google.com/docs/studio/get-started-ai
- Cursor Agent Tools: https://docs.cursor.com/agent/tools
- Cursor CLI MCP: https://docs.cursor.com/cli/mcp
- Windsurf Cascade: https://docs.windsurf.com/windsurf/cascade
- Claude Code Overview: https://code.claude.com/docs/en/overview
- OpenAI Codex: https://platform.openai.com/docs/codex
- GitHub Copilot Coding Agent: https://docs.github.com/en/copilot/using-github-copilot/coding-agent/about-assigning-tasks-to-copilot
- Vercel Deployments: https://vercel.com/docs/deployments/overview
- Vercel Builds: https://vercel.com/docs/builds
- Netlify Deploy Overview: https://docs.netlify.com/deploy/deploy-overview
- Netlify Environment Variables: https://docs.netlify.com/build/environment-variables/overview
- Cloudflare Pages Bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Render Web Services: https://render.com/docs/web-services/
- Render Environment Variables: https://render.com/docs/environment-variables
- Railway Variables: https://docs.railway.com/variables
- Railway Deploy: https://docs.railway.com/cli/deploy
- Zeabur Environment Variables: https://zeabur.com/docs/en-US/deploy/special-variables
- Zeabur Quick Start: https://zeabur.com/docs/get-started/quick-start
- Fly Launch: https://www.fly.io/docs/launch/
- Fly App Configuration: https://www.fly.io/docs/reference/configuration/
- Heroku Dynos: https://www.heroku.com/dynos/configure/
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- DigitalOcean App Platform: https://docs.digitalocean.com/docs/app-platform
- DigitalOcean Environment Variables: https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/
