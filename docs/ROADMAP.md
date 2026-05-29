# 路线图

## 方向

DemoGo 的目标不是做电商平台，而是具备部署完整应用的能力。

“完整电商平台项目”只是能力验收样本，因为它通常同时包含：

- 前端页面。
- 后端 API。
- 数据库。
- 管理后台。
- 环境变量。
- 初始化脚本。
- 运行日志和错误诊断。

如果 DemoGo 能稳定部署这类完整应用，就说明它的试用部署能力基本成型。

## 能力主线

后续完整应用能力分两条主线推进：

- 内置试用环境：DemoGo 提供 Node.js 单服务运行环境和 MySQL 试用数据库，适合需要快速演示的完整应用。
- 外部后端连接：DemoGo 识别并连接用户自己的 Supabase/Postgres 等外部后端，适合 Lovable、Bolt 等 AI 工具生成的常见项目。

Supabase 路线的原则是先“连接用户自己的 Supabase”，不是 DemoGo 自己托管 Supabase，也不自动创建用户的 Supabase 项目。

## 近期版本

### v0.4.4 完整应用部署架构确认

- 确认完整应用部署能力边界。
- 调研主流 AI 编程工具和 Agent 工具的产物形态。
- 调研主流部署平台的能力模型，补充 Zeabur 作为重点参考对象。
- 明确项目识别、后端运行、试用数据库、环境变量、失败诊断和用户端呈现方式。
- 输出后续 5 个版本的开发依据。
- 详见 [AI 编程工具与部署平台调研矩阵](AI_TOOLS_AND_DEPLOYMENT_PLATFORMS_BENCHMARK.md)。
- 详见 [AI 编程工具产物形态调研](AI_TOOL_OUTPUT_RESEARCH.md)。
- 详见 [完整应用部署能力架构方案](FULL_APP_HOSTING_ARCHITECTURE.md)。

### v0.4.3 项目治理与文档重建

- 清理旧文档、旧脚本、临时目录。
- 重建当前文档体系。
- 建立 `VERSION` 单一版本源。
- 明确后续不是每个版本都发布。

### v0.5.0 项目识别 2.0

- 识别 Vite、Next.js、TanStack Start、Nuxt、SvelteKit、Astro。
- 识别 Express、Fastify、Hono、Koa、NestJS。
- 识别 Supabase、Postgres、MySQL、Prisma、Drizzle、Sequelize、TypeORM。
- 用户端展示识别结果、当前是否可发布和缺失条件。
- 管理端展示项目识别结果，便于运营判断用户卡点。
- 当前只做识别和诊断，不扩张完整应用运行能力。
- 详见 [v0.5.0 项目识别 2.0 功能方案](V0_5_0_PROJECT_CLASSIFIER_PLAN.md)。

### v0.5.1 完整应用运行闭环

- 支持符合条件的 Next.js、Nuxt、TanStack Start 单服务运行。
- 继续支持 Express、Fastify、Hono、Koa、NestJS 等 Node.js 单服务。
- 支持 `.env.example` 作为运行配置模板，用户端可保存运行配置并只展示脱敏值。
- 缺少运行配置时，项目可以先创建，补齐后再重启。
- MySQL 试用数据库支持 `schema.sql` 初始化和重置。
- 用户端和管理端展示运行配置、数据库初始化状态和运行日志摘要。
- 详见 [v0.5.1 完整应用运行闭环](V0_5_1_RUNTIME_CLOSURE.md)。

### v0.5.2 失败诊断 2.0

- 建立统一失败诊断对象，覆盖发布、更新、异步任务、运行重启、数据库初始化等失败场景。
- 区分额度、内容安全、项目包结构、不支持能力、运行配置、依赖安装、构建失败、启动失败、数据库初始化失败等类别。
- 用户端展示失败原因、证据、处理动作和“复制给 AI 怎么改”。
- 管理端展示失败诊断，便于运营判断用户卡点。
- Agent API、CLI/MCP 调用失败时返回结构化诊断，方便 AI 工具自动修复。
- 详见 [v0.5.2 失败诊断 2.0](V0_5_2_FAILURE_DIAGNOSIS.md)。

### v0.5.3 Supabase 外部后端连接闭环

- 将 Supabase 配置、检测、注入和诊断合并为一个版本。
- 识别 Supabase 项目线索：`@supabase/supabase-js`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`VITE_SUPABASE_*`、`NEXT_PUBLIC_SUPABASE_*`。
- 用户端增加 Supabase 连接配置，引导填写项目地址和 anon key。
- 保存配置时做基础连通性检测。
- 根据项目类型注入对应环境变量，例如 Vite 使用 `VITE_SUPABASE_*`，Next.js 使用 `NEXT_PUBLIC_SUPABASE_*`，Node.js 使用 `SUPABASE_*`。
- 拒绝保存 `service_role` 高权限密钥。
- 管理端展示外部后端状态，便于判断用户卡点。
- 保持边界：不托管 Supabase，不自动创建 Supabase 项目，不自动执行外部数据库迁移。
- 详见 [v0.5.3 Supabase 外部后端连接闭环](V0_5_3_SUPABASE_EXTERNAL_BACKEND.md)。

### v0.6.0 复杂应用部署验收

- 新增“完整应用试用闭环”判断对象 `applicationReadiness`。
- 用户端展示页面、后端、运行环境、数据库/外部后端、运行配置、版本更新和失败诊断的综合状态。
- 管理端展示复杂应用卡点，便于判断用户项目卡在配置、数据库、运行还是外部后端。
- smoke test 覆盖 `前端 + Node.js + MySQL` 和 `前端 + Supabase` 两条主链路。
- 样本可以接近电商项目能力边界，但 DemoGo 不做电商业务功能。
- 详见 [v0.6.0 复杂应用部署验收](V0_6_0_COMPLEX_APP_READINESS.md)。

### v0.6.1 复杂应用样本验收包

- 新增“轻电商/商品预约”复杂应用样本。
- 验收页面访问、Node.js 后端接口、MySQL 试用数据库、`schema.sql` 初始化、预约留资接口。
- 验证更新版本后 Demo ID、slug 和试用链接保持不变。
- 验证 `applicationReadiness` 在真实复杂样本中达到可试用状态。
- 详见 [v0.6.1 复杂应用样本验收包](V0_6_1_COMPLEX_APP_SAMPLE_PACK.md)。

### v0.6.2 复杂应用失败样本库

- 新增复杂应用失败样本库，覆盖缺少启动命令、缺少运行配置、端口监听错误、依赖安装失败、Redis 不支持等真实失败路径。
- 强化失败诊断分类顺序，优先识别具体失败原因，再落到泛化项目包问题。
- 验证失败后返回结构化诊断，包括失败类别、证据、处理动作和给 AI 的修复提示。
- 明确坏 `schema.sql` 的真实失败需要非 mock MySQL 集成测试，不放入当前 mock smoke test。
- 详见 [v0.6.2 复杂应用失败样本库](V0_6_2_COMPLEX_FAILURE_SAMPLES.md)。

### v0.7.0 试用交付报告与完整应用验收矩阵

- 新增 `deliveryReport`，把技术状态转换成“能不能发给用户试用”的交付判断。
- 用户端展示试用交付报告，明确是否可以分享、是否可以开始收集反馈、下一步先处理什么。
- 管理端展示交付判断和交付动作，便于运营判断用户项目是真可试用还是仍有卡点。
- 完整应用样本继续验收页面、Node.js、MySQL、接口、版本更新和交付报告。
- 新增 mock MySQL schema 失败验收，坏 `schema.sql` 会返回 `database_init` 诊断。
- 详见 [v0.7.0 试用交付报告与完整应用验收矩阵](V0_7_0_TRIAL_DELIVERY_REPORT.md)。

### v0.8.0 AI 编程工具插件化集成

- 用户端 AI 发布页只保留一条通用 AI 发布提示词，不再让用户区分 Codex、Claude Code、Cursor 等工具。
- 新增 Codex Plugin 雏形，把 DemoGo 发布能力包装成 Codex 可安装入口。
- 插件内置 DemoGo Skill，并通过 MCP 复用 `demogo_check_project`、`demogo_deploy_project`、`demogo_update_project` 等工具。
- 打包、上传和部署脚本新增 `demogo-codex-plugin-v<version>.zip`。
- 明确产品原则：把方便留给用户，把麻烦留给 DemoGo。
- 详见 [v0.8.0 AI 编程工具插件化集成](V0_8_0_AI_TOOL_PLUGIN_INTEGRATION.md)。

### v0.9.0 AI 工具接入闭环

- MCP 新增 `demogo_doctor`，用于检查平台地址和 AI 发布口令。
- 新增 Claude Code Plugin 包，包含 Skill、MCP 配置和 publish/update/doctor 命令说明。
- 用户端 AI 发布页展示接入状态：Codex、Claude Code 插件化；Cursor、Windsurf、OpenHands 通过 MCP/CLI。
- 打包、上传和部署脚本新增 `demogo-claude-code-plugin-v<version>.zip`。
- 继续坚持一条通用 AI 发布提示词，不把工具差异交给用户。
- 详见 [v0.9.0 AI 工具接入闭环](V0_9_0_AI_TOOL_CONNECTION_CLOSURE.md)。

## 暂不优先

- 微服务拆分。
- Redis、MongoDB、PostgreSQL 自动托管。
- Python/Go/Java 后端托管。
- 真实支付系统托管。
- CDN 和大规模性能优化。

这些不是不重要，而是在 Node + MySQL 主链路稳定前不应分散资源。
