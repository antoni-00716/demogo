# DemoGo Agent Instructions

请始终用中文与项目负责人交流，表达简洁、直接、实事求是。DemoGo 的负责人不是技术背景，但具备清晰的产品判断力，因此所有技术决策都要说明业务含义、实现逻辑、关键取舍和验证方式。

## 项目定位

DemoGo 是一个试用链接生成与部署平台，目标是让开发出来的产品尽快被用户打开、试用和反馈。

DemoGo 不是电商平台，也不是通用云厂商。长期目标是具备部署完整应用的能力：从静态网页、前端项目，到 Node.js 单服务、MySQL 试用数据库，再逐步增强到可支撑接近完整应用的试用部署。

当前核心闭环：

```text
项目文件或源码 -> DemoGo 检查 -> 生成试用链接 -> 分享给用户 -> 收集反馈
```

## 当前真实状态

当前线上版本：`v0.9.3`，以 `https://demogo.cn/api/health` 返回为准。

当前本地开发版本：`v0.9.3`，以根目录 `VERSION` 为准。

当前 npm CLI：`@demogo-cn/cli@0.9.3` 已发布并验证。

当前本地 CLI / MCP 源码版本：`0.9.3`，已发布到 npm。

当前 npx 验证结果：

```powershell
npx --yes @demogo-cn/cli@latest --version
# 0.9.1

npx --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
# 平台连接正常：demogo-server 0.9.1
# AI 发布口令：有效
```

当前邮件验证码状态：

- 注册邮箱验证码已开启。
- SMTP 使用 163 邮箱。
- 发送验证码已测试通过。
- 服务器使用的是 163 SMTP 授权码，不是邮箱登录密码。
- 如果只修改邮箱登录密码、没有修改 SMTP 授权码，通常不需要更新服务器配置。
- 如果后续验证码发送失败，再检查 `/etc/systemd/system/demogo-server.service.d/email.conf` 中的 `SMTP_PASS`。

## 当前支持

- 静态网页、单 HTML 页面、H5 页面、活动页、报名页、作品集。
- `dist`、`build`、`out`、`public` 等前端构建产物。
- 可构建成静态页面的 React、Vue、Vite 等前端源码项目。
- Node.js 单服务试用环境，线上运行器已开启。
- MySQL 空试用数据库，线上数据库能力已开启。
- Supabase 外部后端可识别、可填写配置、可做基础连接检测，并在构建或运行时注入环境变量。
- Web 上传、CLI、MCP、Codex Skill、Codex Plugin、Claude Code Plugin、Agent API 发布。
- AI/CLI/MCP 更新已有链接，链接保持不变。
- 结构化失败诊断，失败后给出原因、证据、处理动作和“复制给 AI 怎么改”。
- 内容安全检查。
- 自动表单收集。
- 套餐额度、升级申请、链接后缀权益和管理后台。
- Free 首次发布使用随机链接。
- Lite/Pro 可在用户端修改 `/d/...` 链接后缀。
- Pro 可提交 `xxx.demogo.cn` 二级域名申请。

## v0.5.0 已完成

v0.5.0 的定位是“项目识别 2.0”，只做识别和诊断，不扩张完整应用运行能力。

已完成能力：

- 识别 Vite、React、Vue。
- 识别 Next.js、TanStack Start、Nuxt、SvelteKit、Astro。
- 识别 Express、Fastify、Hono、Koa、NestJS。
- 识别 Supabase、Postgres、MySQL。
- 识别 Prisma、Drizzle、Sequelize、TypeORM。
- 识别 `.env.example`、数据库变量、API Key 等运行配置线索。
- 输出结构化项目诊断：项目类型、前端框架、后端框架、数据库线索、环境变量、缺失条件、当前是否可发布、下一步让 AI 怎么改。
- 用户端展示识别结果和“可以发布 / 先处理后发布”状态。
- 管理端展示项目识别结果，便于运营判断用户卡点。
- 未导出的 SSR/全栈项目不会被误判为可完整发布。
- 已导出的 `out/dist/build/public` 产物优先按可发布网页处理。

## v0.5.1 本地已完成

v0.5.1 的定位是“完整应用运行闭环 1.0”。

核心边界：

```text
一个项目 -> 一个 Node 服务 -> 一个端口 -> 一个试用链接
```

已完成能力：

- Next.js、Nuxt、TanStack Start 在满足单服务、start 命令、PORT 监听等条件时，可进入运行环境。
- Express、Fastify、Hono、Koa、NestJS 等 Node.js 单服务继续支持。
- `.env.example` 不再被当作敏感文件拦截，可作为运行配置模板。
- 用户端可保存运行配置，前端只展示脱敏值。
- 缺少运行配置时，项目可以先创建，状态为“等待运行配置”，补齐后再重启。
- MySQL 试用数据库支持 `schema.sql` 初始化。
- 用户端支持重置 MySQL 试用数据库，并重新执行 `schema.sql`。
- 用户端展示运行配置、数据库初始化状态、运行日志摘要和“复制给 AI 怎么改”。
- 管理端展示缺失运行配置、数据库初始化状态和最近运行日志。
- 本地已通过后端检查、后端烟雾测试、前端 lint 和前端构建。

注意：v0.5.1 已并入当前本地 v0.5.2 开发版本，不单独发布。

## v0.5.2 本地已完成

v0.5.2 的定位是“失败诊断 2.0”，目标是让发布、更新、运行和数据库初始化失败后，不再只返回一段错误，而是告诉用户哪里失败、为什么失败、下一步让 AI 怎么改。

已完成能力：

- 新增统一失败诊断服务 `failure-diagnosis-service.js`。
- 失败诊断对象包含：失败类别、严重程度、标题、摘要、证据、用户处理动作、AI 修复提示。
- 失败类别覆盖：额度限制、内容安全、项目包结构、不支持能力、运行配置缺失、依赖安装失败、构建失败、运行启动失败、数据库初始化失败和其他失败。
- Web/API/Agent 发布失败会返回 `diagnosis`。
- 异步发布任务失败会保存并返回 `diagnosis`。
- 项目检查失败会在 `inspection.failureDiagnosis` 中返回诊断。
- 运行环境失败或缺少运行配置时，会在 `runtime.failureDiagnosis` 中保存诊断。
- 公开链接触发自动重启失败、用户手动重启运行环境失败时，会持久化失败诊断。
- 用户端展示失败原因、证据、建议动作和“复制给 AI 怎么改”。
- 管理端展示失败诊断，便于运营判断用户卡点。
- 本地已通过后端检查、后端烟雾测试、前端 lint 和前端构建。

注意：v0.5.2 已并入当前本地 v0.5.3 开发版本，不单独发布。

## v0.5.3 本地已完成

v0.5.3 的定位是“Supabase 外部后端连接闭环 1.0”，合并 Supabase 配置、检测、注入和诊断。

已完成能力：

- Supabase 项目不再被简单判定为“不支持数据库”。
- 用户端项目详情页增加 Supabase 连接面板。
- 用户可填写 Supabase URL 和 anon key，保存后做基础连接检测。
- 保存配置时拒绝 `service_role` 高权限密钥。
- 构建前端源码或启动 Node.js 运行环境时，可注入 Supabase 环境变量。
- 失败诊断增加外部后端连接问题类别。
- 管理端展示外部后端状态、缺失配置和连接检测结果。
- 新增文档 `docs/V0_5_3_SUPABASE_EXTERNAL_BACKEND.md`。

注意：v0.5.3 已并入当前本地 v0.6.0 开发版本，不单独发布。

## v0.6.0 本地已完成

v0.6.0 的定位是“复杂应用部署验收 1.0”，目标是让 DemoGo 不只显示技术零件状态，而是告诉用户一个项目是否已经具备完整试用闭环。

核心验收对象：

```text
页面入口 -> 后端接口 -> 运行环境 -> 数据库/外部后端 -> 运行配置 -> 版本更新 -> 失败诊断
```

已完成能力：

- 新增完整应用试用闭环判断服务 `server/src/services/application-readiness-service.js`。
- 项目检查、发布结果、项目详情、管理端摘要返回 `applicationReadiness`。
- 用户端项目详情展示“完整应用试用闭环”面板。
- 管理端项目详情展示复杂应用卡点。
- smoke test 补充 `前端 + Node.js + MySQL` 和 `前端 + Supabase` 两条主链路的验收对象。
- 新增文档 `docs/V0_6_0_COMPLEX_APP_READINESS.md`。

注意：v0.6.0 已并入当前本地 v0.7.0 开发版本，不单独发布。

## v0.6.1 本地已完成

v0.6.1 的定位是“复杂应用样本验收包 1.0”，目标是用更接近真实用户项目的样本持续验收 DemoGo 的复杂应用部署能力。

已完成能力：

- 在 smoke test 中新增“轻电商/商品预约”复杂应用样本。
- 样本覆盖页面访问、Node.js 后端接口、MySQL 试用数据库、`schema.sql` 初始化、预约留资接口。
- 样本验证更新版本后 Demo ID、slug 和试用链接保持不变。
- 样本验证 `applicationReadiness.kind=frontend_node_mysql` 且状态达到可试用。
- 新增文档 `docs/V0_6_1_COMPLEX_APP_SAMPLE_PACK.md`。

注意：v0.6.1 已并入当前本地 v0.7.0 开发版本，不单独发布。

## v0.6.2 本地已完成

v0.6.2 的定位是“复杂应用失败样本库 + 诊断闭环强化”，目标是让复杂应用发布失败后，DemoGo 能稳定说清楚为什么失败、证据是什么、用户下一步怎么处理、复制给 AI 怎么改。

已完成能力：

- 在 smoke test 中新增 5 类复杂应用失败样本。
- 覆盖缺少 `scripts.start`、缺少运行配置、未监听 `process.env.PORT`、依赖安装失败、Redis 不支持。
- 修复失败诊断分类顺序，优先识别具体失败原因，再落到泛化项目包结构问题。
- 修复缺 start、npm 依赖失败、Redis 不支持等场景的误分类问题。
- 修复 Windows 本地 JSON 写入偶发 `EPERM/EBUSY rename` 导致的测试假失败。
- 新增文档 `docs/V0_6_2_COMPLEX_FAILURE_SAMPLES.md`。

注意：v0.6.2 已并入当前本地 v0.7.0 开发版本，不单独发布。

## v0.7.0 本地已完成

v0.7.0 的定位是“试用交付报告 + 完整应用验收矩阵”，目标是把 DemoGo 从显示技术状态推进到直接判断项目是否可以交付给用户试用。

已完成能力：

- 在 `applicationReadiness` 中新增 `deliveryReport`。
- 交付报告包含是否可以分享、是否可以开始收集反馈、完成度、下一步动作、已具备能力证据和风险项。
- 用户端项目详情展示“试用交付报告”。
- 管理端展示交付判断和交付动作，便于运营识别真实卡点。
- smoke test 验证 `前端 + Node.js + MySQL` 项目能返回 `ready_to_share`。
- 复杂商品预约样本验证交付报告可分享、可反馈。
- 数据库重置后会刷新交付报告。
- 新增 mock MySQL schema 失败验收，坏 `schema.sql` 返回 `database_init` 诊断。
- 新增文档 `docs/V0_7_0_TRIAL_DELIVERY_REPORT.md`。

注意：v0.7.0 尚未发布线上，也未发布 npm CLI。只有项目负责人明确说“发布 v0.7.0”时才部署和发布 npm。

## v0.8.0 本地开发中

v0.8.0 的定位是“AI 编程工具插件化集成 1.0”，目标是让 DemoGo 更自然地融入 Codex、Claude Code、Cursor 等 AI 编程工具。

已完成能力：

- 用户端 AI 发布页统一为一条通用 AI 发布提示词，不再让用户区分 Codex、Claude Code、Cursor 等工具。
- 新增 `codex-plugin/demogo` 插件雏形。
- Codex Plugin 内置 DemoGo Skill，并通过 MCP 复用发布、更新和项目检查能力。
- 打包脚本、上传脚本和一键部署脚本新增 `demogo-codex-plugin-v<版本号>.zip`。

核心原则：把方便留给用户，把麻烦留给 DemoGo。凡是 DemoGo 或 AI 工具能自动判断、自动处理、自动兜底的事项，不要让用户选择、填写、区分或记命令。

## v0.9.0 已完成

v0.9.0 的定位是"AI 工具接入闭环"，目标是在 v0.8.0 Codex Plugin 基础上补齐 Claude Code 和 MCP 发布前诊断。

已完成能力：

- MCP 新增 `demogo_doctor`，可以检查平台地址和 AI 发布口令。
- 新增 `claude-code-plugin/demogo` 插件包，包含 Skill、MCP 配置和 publish/update/doctor 命令说明。
- 用户端 AI 发布页展示工具接入状态，但仍然只保留一条通用 AI 发布提示词。
- 打包脚本、上传脚本和一键部署脚本新增 `demogo-claude-code-plugin-v<版本号>.zip`。

## v0.9.3 已完成

v0.9.3 的定位是"CLI 体验优化 + Agent API 增强"，目标是让 CLI 发布后显示更多信息，并让 AI 工具可以查询项目状态。

已完成能力：

- CLI 发布成功后显示运行环境状态、数据库状态、环境变量数量。
- 新增 Agent API 项目详情接口 `GET /api/agent/project/:id`。
- 优化 CLI 错误提示，显示失败诊断详细信息（失败类别、原因、证据、用户操作建议、AI 修复提示）。

## 当前明确不支持

不要把“不支持”包装成“实验能力”。支持就是支持，不支持就是不支持。

当前不支持：

- Python、Java、Go 后端托管。
- FastAPI、Flask、Django 等非 Node 后端托管。
- 多服务编排。
- Docker Compose 用户项目自动运行。
- Redis、MongoDB、PostgreSQL 自动分配或自动托管。
- Remix、SvelteKit、Astro 等完整应用运行态。
- 需要 Redis、MongoDB、PostgreSQL、多服务编排或 WebSocket 的完整应用。
- WebSocket 长连接。
- 真实支付系统托管。
- 生产级用户登录系统托管。
- AI Proxy 后端托管。
- 自动 DNS/SSL 自助绑定企业独立域名。
- `.rar` 项目包。

说明：Postgres、Redis、MongoDB 等线索可以被识别，但当前不是“自动可运行支持”。Supabase 当前支持“连接用户自己的 Supabase”，不是 DemoGo 自己托管 Supabase。

## 后续路线

版本节奏必须先给方案并等用户确认。不要擅自改变版本号或版本范围。

近期建议路线：

- `v0.5.1`：Node/SSR 运行态增强、环境变量配置闭环、MySQL schema 初始化和重置闭环。
- `v0.5.2`：失败诊断 2.0，覆盖发布、更新、运行、数据库初始化等失败场景。
- `v0.5.3`：Supabase 外部后端连接闭环，合并配置、检测、注入和诊断。
- `v0.6.0`：复杂应用部署验收，覆盖 `前端 + Node.js + MySQL` 和 `前端 + Supabase` 两类主链路。
- `v0.6.1`：复杂应用样本验收包，用真实样本持续验收前端、Node.js、MySQL、接口和版本更新。
- `v0.6.2`：复杂应用失败样本库，覆盖常见失败路径并强化诊断分类。
- `v0.7.0`：试用交付报告，把技术状态转换成“是否可以发给用户试用”的产品判断。
- `v0.8.0`：AI 编程工具插件化集成，把 DemoGo 做成 Codex Plugin，并把 AI 发布提示词统一为一条。
- `v0.9.0`：AI 工具接入闭环，补齐 Claude Code Plugin 和 MCP doctor。
- `v0.9.3`：CLI 体验优化 + Agent API 增强。

“完整电商平台项目”只是 DemoGo 发布能力边界的验收样本，不是要让 DemoGo 自己做电商业务。

如果 DemoGo 能稳定部署一个包含前端、后端、数据库、管理后台、环境变量和初始化脚本的完整应用样本，就说明试用部署能力基本成型。

Supabase 方向的产品边界：

- DemoGo 先识别和连接用户自己的 Supabase。
- 用户端引导填写 Supabase URL 和 anon key。
- 根据项目类型注入 `VITE_SUPABASE_*`、`NEXT_PUBLIC_SUPABASE_*` 或服务端变量。
- 不托管 Supabase，不自动创建 Supabase 项目。
- 不保存或暴露 `service_role` 高权限密钥。
- 不在未确认安全边界前自动执行用户外部数据库迁移。

## 产品原则

- 面向非技术用户表达，避免把 React、Vite、SSR、Docker、API 等技术词直接作为核心说明。
- 把方便留给用户，把麻烦留给 DemoGo；凡是系统能自动判断、自动处理、自动兜底的事项，不要让用户选择、填写、区分或记命令。
- AI 发布只给用户一条通用提示词，不按 Codex、Claude Code、Cursor 等工具拆成多套提示词。
- 首页、用户端、管理后台的文案都要让非技术用户理解 DemoGo 能解决什么问题、适合谁、能做什么、暂不能做什么。
- 失败提示要告诉用户：为什么失败、有什么影响、下一步让 AI 怎么改。
- 不要制造能力错觉，尤其是完整应用、数据库、支付、登录系统、SSR 运行态。
- 页面风格、UI 设计、配色、字体、按钮、卡片规则要统一，确保这是一个系统。
- 不要让按钮被挡住，不要出现单字换行、奇怪换行、文字压缩、颜色对比不足。
- 用户端项目管理应以清晰工作流为主：项目列表、项目详情、发布记录、操作区、表单记录。
- 管理后台应让运营人员快速看用户、项目、失败原因、升级申请、反馈、表单记录、运行环境和项目识别结果。

## 技术架构

当前架构：

- 前端：React + Vite。
- 后端：Node.js + Express。
- 数据库：MySQL，通过 `server/src/db/mysql-store.js` 兼容原 JSON 读写接口。
- 静态托管：Nginx 服务 `/var/www/demogo-preview`。
- 用户 Demo 发布目录：`/var/www/demogo-preview/d`。
- 后端服务：systemd `demogo-server.service`，监听 3001。
- Node.js 运行器：Docker，当前线上已开启。
- MySQL 试用数据库：当前线上已开启。
- 部署入口：PowerShell 上传脚本 + 服务器 Bash 部署脚本。

重要文件：

- 后端主文件：`server/src/server.js`
- 后端配置：`server/src/config.js`
- 数据库 schema：`server/src/db/schema.sql`
- MySQL 兼容存储：`server/src/db/mysql-store.js`
- 后端烟雾测试：`server/src/tests/smoke-test.js`
- 内容检查服务：`server/src/services/content-review-service.js`
- 托管架构服务：`server/src/services/hosting-architecture-service.js`
- 项目识别服务：`server/src/services/project-classifier-service.js`
- 运行器服务：`server/src/services/runtime-service.js`
- 数据库服务：`server/src/services/demo-database-service.js`
- 失败诊断服务：`server/src/services/failure-diagnosis-service.js`
- 首页：`web/src/pages/HomePage.tsx`
- 用户端：`web/src/pages/UserDashboard.tsx`
- 管理后台：`web/src/pages/AdminDashboard.tsx`
- 前端 API：`web/src/api`
- 用户端样式：`web/src/styles/dashboard.css`
- 首页样式：`web/src/styles/home.css`
- 打包脚本：`scripts/build-demogo-packages.ps1`
- 上传脚本：`scripts/upload-demogo-packages.ps1`
- 一键发布脚本：`scripts/deploy-demogo-release.ps1`
- 当前部署脚本：`scripts/server-deploy-demogo-v0.5.0.sh`
- 当前回滚脚本：`scripts/server-rollback-demogo-v0.5.0.sh`
- 验证脚本：`scripts/server-verify-demogo.sh`
- CLI：`cli/bin/demogo.js`
- MCP：`mcp/bin/demogo-mcp.js`
- Codex Skill：`codex-skill/demogo-deploy/SKILL.md`
- Codex Plugin：`codex-plugin/demogo/.codex-plugin/plugin.json`
- Claude Code Plugin：`claude-code-plugin/demogo/plugin.json`

## 开发协作规则

- 任何较大改动前必须先给方案，用户确认后再改。
- 用户明确要求“继续”“按计划推进”时，可以继续当前已确认版本范围内的实现。
- 不要因为发现新问题就随意改变版本定位。
- 不要擅自做大规模重构。
- 不要改无关代码。
- 不要删除历史部署脚本，除非用户明确要求。
- 当前项目不一定是 Git 仓库，不要依赖 `git diff` 作为唯一判断。
- 修改代码前先读现有结构和调用链。
- 优先复用现有模式，不为了“架构高级”而引入不必要依赖。
- 所有用户可见文案要优先用非技术语言。
- 需要技术文案时，用“业务含义 + 技术逻辑 + 实现方式”解释。
- 代码完成后必须尽可能测试，不能只说“应该可以”。

## 版本和发布规则

- 开发完成不等于发布。
- 不是每个版本都发布。
- 只有项目负责人明确说“发布这个版本”时，才进行线上部署和 npm 发布。
- 每次涉及 CLI 版本更新并实际发布线上版本时，必须同步验证 npm 和 npx。
- 版本号以根目录 `VERSION` 为准。
- 线上真实版本以 `https://demogo.cn/api/health` 返回为准。
- npm CLI 版本以 `npm view @demogo-cn/cli version` 返回为准。

## AI 发布能力说明

当前 AI 发布链路：

```text
AI 工具
  -> DemoGo AI 发布口令
  -> DemoGo CLI / MCP / Agent API
  -> 复用项目检测、项目识别、安全检查、额度检查、部署记录
  -> 返回可试用链接
```

AI 发布口令规则：

- 用户端生成。
- 完整密钥只显示一次。
- 服务端只保存哈希。
- 用户重置后旧密钥失效。
- 普通查询只返回是否启用、前缀和生成时间。
- 不要要求用户每次发布都重新生成口令。

首选 CLI：

```powershell
npx --yes @demogo-cn/cli deploy --api https://demogo.cn --token <DemoGo AI 发布口令>
```

用户端只提供一条通用 AI 发布提示词。不要再按 Codex、Claude Code、Cursor 等工具拆分多套提示词；不同工具的适配由 DemoGo Plugin、Skill、MCP、CLI 和 Agent API 内部处理。

更新已有链接：

```powershell
npx --yes @demogo-cn/cli update --api https://demogo.cn --token <DemoGo AI 发布口令> --id <原 DemoGo 链接或 Demo ID>
```

如果 CLI 不可用，可以用 MCP 或 API 兜底，但必须明确说明“这是 API/MCP 兜底”，不能说成 CLI 发布成功。

Agent API：

- 新建：`POST /api/agent/deploy`
- 更新：`POST /api/agent/update`
- 项目包字段优先使用 `project`，兼容 `file` 和 `package`。
- 请求头使用 `Authorization: Bearer <DemoGo AI 发布口令>`。

## 内容安全规则

当前内容安全采用本地规则初筛，不是完整人工审核系统，也不是正式第三方内容安全服务。

正常允许：

- 市场营销。
- 报名。
- 预约。
- 咨询。
- 留资。
- 姓名、手机号、邮箱、公司、职位、留言等常规获客字段。

重点拦截：

- 诈骗。
- 赌博。
- 色情低俗。
- 违法交易。
- 恶意下载。
- 高风险金融引导。
- 身份证号、银行卡号、验证码、密码、人脸照片等高敏信息收集。

当前不能识别图片、视频、音频里的真实内容，只能对图片文件名做有限风险提示。

## 注册和邮件验证码

注册邮箱验证码已上线并测试可发送。

配置位置：

```text
/etc/systemd/system/demogo-server.service.d/email.conf
```

关键环境变量：

```text
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=demogocn@163.com
SMTP_PASS=<163 SMTP 授权码>
SMTP_FROM=DemoGo <demogocn@163.com>
SMTP_SECURE=1
DEMOGO_EMAIL_VERIFICATION_ENABLED=1
```

注意：

- `SMTP_PASS` 是 163 SMTP 授权码，不是邮箱登录密码。
- 只修改邮箱登录密码，通常不影响验证码发送。
- 如果修改或重置 SMTP 授权码，才需要更新服务器 `email.conf` 并重启服务。

验证：

```bash
curl https://demogo.cn/api/auth/register-options
```

期望：

```json
{"emailVerificationEnabled":true,"emailConfigured":true,"emailRequired":true,"canRegister":true}
```

发送测试：

```bash
curl -X POST https://demogo.cn/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"测试邮箱","password":"password123"}'
```

期望：

```json
{"ok":true,"expiresInSeconds":600,"resendAfterSeconds":60}
```

## 测试要求

每个大版本部署前至少执行：

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

重要测试覆盖：

- 注册登录。
- 邮箱验证码发送。
- 用户端项目发布。
- 项目更新，原链接保持不变。
- `.zip`、`.tar.gz`、`.tgz`。
- `dist`、`build`、`out`、`public`。
- 前端源码构建项目。
- Node.js 单服务项目。
- MySQL 空试用数据库项目。
- 无 build 命令源码项目检测拦截。
- 未导出的 SSR/全栈项目明确不支持完整运行。
- `.env`、密钥、脚本、危险路径拦截。
- 自动表单收集、表单托管补开和公开提交。
- 套餐升级申请和后台处理。
- AI 发布口令生成、重置、隐藏明文。
- Agent 发布 API。
- 发布前内容安全检查。
- 管理后台内容检查记录。
- 项目识别 2.0：Next.js、TanStack Start、Nuxt、SvelteKit、Astro、Express、Fastify、Hono、Supabase、Postgres、MySQL、Prisma、Drizzle。
- 失败诊断 2.0：额度、内容安全、项目包、不支持能力、运行配置、依赖安装、构建、启动、数据库初始化。
- SPA 深层路由刷新回退。
- 缺失静态资源仍然返回 404。

如做前端体验大改，还要本地打开检查：

- 首页 `/`
- 登录页 `/login.html`
- 用户端 `/app.html`
- 管理后台 `/admin.html`
- 用户端 `AI 发布` 页

## 打包与部署

本地打包：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
```

生成：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v<版本号>.zip
dist\demogo-ops-scripts-v<版本号>.zip
dist\demogo-cli-v<版本号>.zip
dist\demogo-mcp-v<版本号>.zip
dist\demogo-codex-skill-v<版本号>.zip
dist\demogo-codex-plugin-v<版本号>.zip
dist\demogo-claude-code-plugin-v<版本号>.zip
```

一键上传和部署：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\deploy-demogo-release.ps1
```

手动上传：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\upload-demogo-packages.ps1
```

服务器手动部署：

```bash
cd /tmp
unzip -o demogo-ops-scripts-v<版本号>.zip
sed -i 's/\r$//' server-deploy-demogo-v<版本号>.sh server-rollback-demogo-v<版本号>.sh server-verify-demogo.sh server-clean-demogo-data.sh
chmod +x server-deploy-demogo-v<版本号>.sh server-rollback-demogo-v<版本号>.sh server-verify-demogo.sh server-clean-demogo-data.sh
./server-deploy-demogo-v<版本号>.sh 2>&1 | tee /tmp/demogo-v<版本号>-deploy.log
./server-verify-demogo.sh
```

部署成功标准：

- `https://demogo.cn/api/health` 返回目标版本。
- `https://demogo.cn/api/hosting/capabilities` 返回目标版本。
- 首页、登录页、用户端返回 200。
- 管理后台返回 401 是正常的，因为有 Basic Auth。
- `demogo-server.service` 是 `active (running)`。
- 如本版本涉及 CLI，npm 和 npx 必须同步到同一版本。

## npm CLI 发布规则

每次线上部署完成后，如果本版本调整了 `cli/package.json` 版本或 CLI 代码，必须继续发布 npm 包并验证 `npx`，不能只部署服务器。

PowerShell 如遇到 `npm.ps1` 执行策略限制，使用 `npm.cmd` 和 `npx.cmd`：

```powershell
cd C:\Users\wei.gu\Documents\demogo\cli
& "C:\Program Files\nodejs\npm.cmd" publish --access public
& "C:\Program Files\nodejs\npm.cmd" view @demogo-cn/cli version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest --version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
```

最终确认标准：

- npm 返回版本必须与服务器 `/api/health` 版本一致。
- `npx --yes @demogo-cn/cli@latest --version` 必须与服务器版本一致。
- `npx --yes @demogo-cn/cli@latest doctor --api https://demogo.cn` 必须显示平台连接正常。

## 运维常用命令

查看线上版本：

```bash
curl https://demogo.cn/api/health
```

查看托管能力：

```bash
curl https://demogo.cn/api/hosting/capabilities
```

查看注册配置：

```bash
curl https://demogo.cn/api/auth/register-options
```

查看服务：

```bash
systemctl status demogo-server --no-pager
```

查看日志：

```bash
journalctl -u demogo-server -n 100 --no-pager
```

## 代码风格

- 优先 ASCII，除非文件本身已有中文文案。
- 注释要少，只在复杂逻辑前加简短解释。
- 不要把临时测试脚本当业务代码提交。
- 手工编辑优先使用补丁方式，避免无意义格式化。
- 不要在用户没有确认时引入新依赖。

## 重要提醒

DemoGo 的长期方向是成为 AI 编程产物和普通开发产物的试用链接平台，不是马上做完整云平台。

任何时候都要帮助用户区分：

- 当前已经支持什么。
- 当前明确不支持什么。
- 哪些是下一版本计划。
- 哪些是长期架构方向。

不要用模糊说法制造能力错觉。
