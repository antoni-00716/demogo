## DemoGo 项目技术架构分析报告

### 一、项目整体理解

DemoGo 是一个「试用链接生成与部署平台」，核心价值是让 AI 编程工具（Cursor、Windsurf、Codex、Claude Code 等）生成的产品能够快速被用户打开、试用和收集反馈。它解决的痛点是：AI 可以写代码，但生成的项目往往停留在本地，难以快速变成一个可访问的在线链接。

产品闭环非常清晰：项目文件/源码上传 → DemoGo 自动检查（项目识别、安全扫描、内容审查）→ 生成试用链接 → 分享给用户 → 收集反馈。

当前版本 v0.9.33 处于 pre-1.0 阶段，迭代速度很快（从 v0.9.7 到 v0.9.33 大约一周时间），功能覆盖面已经相当完整。

---

### 二、技术架构实现

#### 2.1 整体架构

项目采用 monorepo 结构，包含以下子模块：

| 模块 | 技术栈 | 职责 |
|---|---|---|
| `server/` | Node.js + Express + ES Modules | 后端核心，部署引擎、API 服务 |
| `web/` | React 19 + TypeScript + Vite 8 + Zustand | 前端 Web 界面 |
| `cli/` | 纯 Node.js（零外部依赖） | 命令行发布工具 |
| `mcp/` | 纯 Node.js（零外部依赖） | MCP 协议服务器（AI 工具集成） |
| `shared/` | 纯 Node.js | CLI 和 MCP 共享的部署核心逻辑 |
| `codex-plugin/` | 纯 Markdown/YAML | Codex 平台插件（指令文档） |
| `claude-code-plugin/` | 纯 Markdown | Claude Code 平台插件（指令文档） |

后端是一个单体 Express 应用，内部采用分层架构：routes → services → lib/db，通过工厂函数做依赖注入，避免了循环依赖问题。前端是一个 MPA（多页应用）架构的 React 项目，有 4 个 HTML 入口（首页、登录、用户仪表盘、管理后台），没有使用路由库，靠 state 切换视图。

#### 2.2 核心业务能力

**项目识别引擎**（project-classifier-service.js，675 行）是系统最核心的模块之一。它通过规则匹配分析上传的项目压缩包，识别出 16 种项目类型（静态站点、SPA、前端构建产物、Node.js 服务、全栈框架、小程序、桌面应用等），并推断前端框架（React/Vue/Next.js/Nuxt/Svelte）、构建工具（Vite/Webpack/Rollup）、后端框架（Express/Koa/Fastify/NestJS/Hono）、数据库栈（MySQL/PostgreSQL/Supabase/MongoDB）等。

**部署流水线**是一个多步骤过程：接收上传 → 解压分析 → 安全检查 → 项目识别 → 自动构建 → 内容审查 → 数据库初始化 → 表单托管检测 → 发布 → 生成链接。支持两种部署路径：静态部署（注入追踪脚本后直接放到 Nginx 目录）和运行时部署（通过 Docker 容器或宿主进程启动 Node.js 应用，反向代理到 /d/:slug/）。

**内容安全审查**（content-review-service.js，707 行）包含 9 类正则规则（诈骗、赌博、色情、违禁品、恶意软件、敏感数据收集等），支持严重程度分级（block/review/notice），同时扫描源文件和发布产物。

**运行时管理**（runtime-service.js，855 行）管理 Node.js 应用的生命周期：Docker 容器隔离、内存/CPU 限制、端口分配、健康检查、TTL 自动过期（默认 120 分钟）、状态持久化（重启后恢复）。

**失败诊断系统**（failure-diagnosis-service.js，708 行）将部署失败分为 10 个类别，每个类别有结构化的用户友好提示和 AI 修复建议，这是产品体验的一个亮点。

#### 2.3 多渠道发布策略

DemoGo 的发布渠道设计很有特色——5 种渠道共享同一套核心逻辑：

- **Web 界面**：用户通过浏览器上传项目
- **CLI**（`@demogo-cn/cli`）：命令行工具，支持 `npx` 零安装使用
- **MCP Server**（`demogo-mcp`）：JSON-RPC 2.0 协议，AI 工具直接调用
- **Agent API**：REST API，Bearer Token 认证
- **Codex/Claude Code 插件**：纯指令文档，引导 AI 使用 MCP 或 CLI

插件设计的「用户负担原则」（User Burden Rule）很值得注意：明确禁止让 AI 去做 DemoGo 自己能推断的事情（比如重命名文件、选择链接后缀、检测框架），把复杂性留给平台。

#### 2.4 数据存储

采用双存储策略：JSON 文件存储（默认，14 个 JSON 文件）和 MySQL 存储（通过 mysql2 连接池）。MySQL 的写入模式是「全量替换」（DELETE ALL + INSERT ALL），简单但不具备良好的可扩展性。BullMQ + Redis 用于异步部署任务队列。

#### 2.5 部署与运维

部署采用 SSH 推送方式：本地 PowerShell 脚本打包 → SCP 到服务器 → 服务端 Shell 脚本解压部署 → systemd 重启服务 → 健康检查。GitHub Actions CI 覆盖了语法检查、单元测试、前端 lint 和构建。

---

### 三、当前技术实现的问题

#### 3.1 架构层面的问题

**God Object 入口文件。** `server.js` 仍有约 2675 行，其中 `performCreateDeployment`（约 380 行）和 `performUpdateDeployment`（约 390 行）是最复杂的两个函数，却没有被提取到独立的 service 中。这导致核心部署逻辑散落在入口文件里，难以独立测试和维护。

**MySQL 全量替换写入模式。** 每次写入操作都做 DELETE ALL + INSERT ALL，这意味着写入 1000 个 demo 就需要 1000 次删除 + 1000 次插入。当数据量增长时，这将成为严重的性能瓶颈。MySQL 在这个模式下本质上只是一个带额外开销的 JSON 文档存储。

**JSON 文件存储的并发安全问题。** JSON 文件路径的读写没有锁机制，并发请求可能读到过期数据并覆盖彼此的修改。MySQL 路径有 `withWriteLock`，但 JSON 路径没有。

**inspection 对象跨层传递膨胀。** 一个 inspection 对象在 archive-analyzer → failure-diagnosis → project-classifier → hosting-architecture → runtime-service → content-review → server.js → routes 的传递过程中不断累积 40+ 个字段，使得任何一层都难以理解自己真正依赖什么。

**无 TypeScript 类型安全。** 后端完全是纯 JavaScript，考虑到数据结构的复杂性（inspection 对象 30+ 字段、demo 对象 40+ 字段），引入 TypeScript 接口定义会显著提升可维护性。

#### 3.2 代码质量问题

**代码重复。** `createDeploymentSteps`、`markDeploymentStep` 等函数在 `server.js` 和 `deployment-job-service.js` 中各有一份。`exists()` 辅助函数在多个文件中重复定义。`formatBytes()` 在 shared 和 web 中有略微不同的实现。登录限流逻辑在 middleware 和 lib 中各有一份。

**shared 模块中的截断函数。** `getProjectDetails` 函数的声明在 `shared/lib/core.js` 第 292 行被截断——参数默认值的模板字符串未闭合，整个函数体缺失。这会在运行时导致语法错误。

**中文编码问题。** `server.js` 和 `AGENTS.md` 中的部分中文字符串显示为乱码，可能是文件编码混用导致。作为面向中文用户的产品，核心文件中的乱码是一个需要修复的问题。

**大文件需要进一步拆分。** `failure-diagnosis-service.js`（36.7 KB）、`runtime-service.js`（32.4 KB）、`project-classifier-service.js`（28.8 KB）、`archive-analyzer.js`（27.9 KB）都已经接近需要进一步分解的阈值。前端 `UserDashboard.tsx` 有 771 行，编排逻辑过于密集。

#### 3.3 运维与基础设施问题

**回滚脚本是空壳。** 三个版本的回滚脚本都只有一行 echo，如果部署失败没有自动回滚能力。CHANGELOG 声称 v0.9.32 添加了回滚功能，但实际上只是占位符。

**CI 缺失集成测试和烟雾测试。** v0.9.4 的事故就是因为跳过了集成测试，但 GitHub Actions CI 仍然只运行单元测试和前端构建，不运行 `test:integration` 和 `test:smoke`。

**关键服务器配置未纳入版本控制。** systemd 的 `demogo-server.service` 文件、Docker 配置、Nginx 生产配置都只存在于服务器上，不在仓库中。如果需要重建服务器，这些关键配置需要从记忆中恢复。

**以 root 身份部署和运行。** SSH 部署目标是 root 用户，systemd worker 也以 root 运行，数据清理脚本需要 root 权限。这是一个安全隐患。

**node_modules 管理方式脆弱。** 部署脚本备份恢复 node_modules 而不是运行 npm install，当依赖发生变化时会静默失败，且没有检测是否需要重新安装的机制。

**监控脚本使用了手写 SMTP 实现。** `monitor.js` 使用原始 socket 级 SMTP（包括 STARTTLS），而不是使用 nodemailer 这样的成熟库，容易在 SMTP 服务器行为变化时出问题。

#### 3.4 测试覆盖缺口

已有测试覆盖了核心业务逻辑（项目分类、内容审查、部署任务），但以下关键模块没有测试：runtime-service（Docker/宿主进程管理）、demo-database-service（演示数据库创建）、hosting-architecture-service、failure-diagnosis-service、external-backend-service、archive-analyzer、队列系统。中间件、限流和工具模块的测试覆盖也很有限。

---

### 四、下一步改进建议

#### 4.1 短期（v1.0 前，建议 2-4 周内完成）

**提取部署核心逻辑。** 将 `performCreateDeployment` 和 `performUpdateDeployment` 从 `server.js` 提取到独立的 `deployment-pipeline-service.js`，使入口文件降到 1500 行以内，核心部署逻辑可以独立测试。

**修复已知 bug。** 修复 `shared/lib/core.js` 中截断的 `getProjectDetails` 函数。修复 `server.js` 和 `AGENTS.md` 中的中文编码乱码。修复部署脚本版本号读取的脆弱逻辑。

**补充 CI 门禁。** 在 GitHub Actions 中加入集成测试（`test:integration`）和烟雾测试（`test:smoke`）步骤，加入版本号一致性检查。这是 v0.9.4 事故的直接教训。

**基础设施代码入库。** 将 systemd service 文件、Docker 配置、Nginx 生产配置纳入仓库的 `infra/` 目录，实现基础设施即代码。

**实现真正的回滚脚本。** 基于已有的备份机制，实现自动回滚逻辑：停止服务 → 恢复备份 → 重启 → 验证健康。

#### 4.2 中期（v1.0 - v1.2，建议 1-2 个月）

**优化数据层。** 将 MySQL 的全量替换模式改为增量操作（INSERT ... ON DUPLICATE KEY UPDATE），引入分页查询替代全量加载。长期可以考虑将 JSON 文件存储作为开发模式，MySQL 作为生产模式的正式分离。

**引入后端 TypeScript。** 先为核心数据结构（Demo、User、Inspection、DeploymentJob 等）添加 JSDoc 类型注释或 TypeScript 声明文件，然后逐步将 service 层迁移到 TypeScript。

**拆分大文件。** 将 `runtime-service.js` 拆分为 docker-driver、host-driver、health-checker、port-allocator 等子模块。将 `archive-analyzer.js` 拆分为 archive-reader、file-classifier、package-analyzer 等。将 `UserDashboard.tsx` 的编排逻辑进一步拆分。

**补充关键模块测试。** 优先为 runtime-service、failure-diagnosis-service、archive-analyzer 添加单元测试，目标是将核心服务覆盖率提升到 80% 以上。

**改进部署安全性。** 创建专用的部署用户替代 root，限制权限范围。将监控脚本的 SMTP 实现替换为 nodemailer。

#### 4.3 长期（v1.5+，面向规模化）

**多实例支持。** 当前的内存态限流、运行时进程 Map、全局状态都假设单实例运行。如果要水平扩展，需要将这些状态迁移到 Redis，使用分布式锁替代进程内锁。

**多运行时支持。** 按 README 中的路线图，扩展 Python/Go/Java 后端托管。建议采用统一的运行时驱动接口，在现有 docker-driver 基础上扩展语言和框架适配层。

**CDN 与性能优化。** 利用已有的 Nginx 缓存配置（docs/nginx-cache.conf），为静态 demo 启用 CDN 分发。优化前端资源加载，考虑代码分割和按需加载。

**多服务编排。** 引入 docker-compose 或 Kubernetes 支持，允许用户上传包含多个服务的复杂项目（前端 + 后端 + 数据库）。

**API 版本化。** 当前的 `apiVersionMiddleware` 只设置 header，没有实际的版本路由和弃用机制。建议在 v1.0 时建立正式的 API 版本策略。

---

### 五、总结

DemoGo 在产品层面做得很扎实——核心闭环清晰、多渠道发布策略完善、用户体验设计周到（中文优先、非技术用户友好、失败诊断提示）。代码层面有良好的工程实践（工厂函数依赖注入、分层架构、共享核心逻辑、零依赖 CLI/MCP）。

主要技术债务集中在三个方面：一是 server.js 的 God Object 问题和数据层的可扩展性瓶颈，二是运维自动化和基础设施即代码的缺失（回滚脚本空壳、CI 不完整、服务器配置不在仓库中），三是测试覆盖的关键缺口。这些问题在当前的单服务器、单实例、pre-1.0 阶段是可以接受的，但在走向规模化的过程中需要优先解决。

建议优先顺序是：修 bug 和 CI 补全 → 核心逻辑提取 → 基础设施入库 → 数据层优化 → 测试补充 → TypeScript 迁移。
