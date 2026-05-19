# DemoGo Agent Instructions

请始终用中文与项目负责人交流，表达简洁、直接、实事求是。DemoGo 的负责人不是技术背景，但具备清晰的产品判断力，因此所有技术决策都要说明业务含义、实现逻辑、关键取舍和验证方式。

## 项目定位

DemoGo 是一个面向 AI 编程工具产物的测试链接生成与试用平台。核心目标是让非技术用户把 AI 做出来的网页、Demo、活动页、报名页、作品集、产品原型快速发布成可打开、可分享、可验证的链接。

当前阶段是 MVP 迭代期，优先目标不是做成完整云平台，而是把“AI 生成项目 -> 快速发布 -> 得到可试用链接 -> 分享验证”这条主路径做到稳定、可信、易理解。

## 当前版本状态

当前开发目标版本：v0.2.4。线上已部署版本仍需以 `/api/health` 返回版本为准。

v0.1.21 基于 v0.1.20 已完成：

- 支持网页上传生成试用链接。
- 支持 `.zip`、`.tar.gz`、`.tgz`。
- 支持普通静态网页、`dist`、`build`、`out`、`public` 输出目录。
- 支持能通过 `npm run build` 生成静态页面的前端源码项目。
- 支持静态表单页识别和 DemoGo 自动表单收集。
- 支持用户端项目下线、恢复、删除、更新。
- 支持套餐额度、升级申请、反馈、运营后台。
- 支持 AI 发布口令。
- 支持 Agent 发布 API：`POST /api/agent/deploy`。
- 支持 React/Vue SPA 内部路由刷新回退到 `index.html`。
- 源码项目没有 `build` 命令时，检测阶段应直接拦截。
- 支持用户端项目详情抽屉，不再把详情堆在项目列表下方。
- 支持管理后台升级申请、Demo、用户、反馈、表单详情抽屉。

v0.1.22 当前目标：

- DemoGo CLI 最小可用版；当前交付包优先用本地安装后的 `demogo deploy`，`npx demogo` 需等 npm 正式发布后再作为默认方式。
- CLI 复用现有 Agent 发布 API，不重写后端发布逻辑。
- CLI 支持配置 DemoGo API 地址和 AI 发布口令。
- CLI 支持打包当前项目、过滤常见无关目录和敏感文件、上传并返回试用链接。
- 用户端“让 AI 帮我生成链接”补充 CLI 使用说明。
- 首页营销化改版并入本版本，面向非技术用户讲清楚“AI 做好的页面，马上发给别人试用”。

v0.1.23 当前目标：

- DemoGo MCP Server 初版。
- MCP 提供项目检查、生成试用链接、查看配置三个基础工具。
- CLI 打包方式改为 Node 内置实现，不依赖系统 `tar` 命令。
- 后端创建项目时先检查项目本身，再判断额度，避免额度提示挡住项目问题。
- 用户端 AI 发布页拆成“给用户看的说明”和“给 AI 执行的指令”两层。
- 取消普通用户发布码，普通用户登录后即可按套餐额度生成试用链接。
- 首页、用户端、运营后台进行三端前端重构，用户可见文案改为面向非技术用户的表达。

v0.1.24 当前目标：

- 修复 CLI 深层目录和长文件名打包失败问题。
- 修复 AI 发布指令固定 IP 问题，改为使用当前 DemoGo 平台地址。
- 修复 MCP 分发包依赖 CLI 外层目录的问题，让 MCP 包可独立使用。
- 提供 Codex Skill 初版和正式交付包，让 Codex/Agent 明确知道如何调用 DemoGo 生成试用链接。
- 继续复用 Agent 发布 API，不新增后端托管、数据库托管等长期能力。

v0.1.25 当前目标：

- 增加发布前内容安全检查，公开链接生成前必须先检查页面内容。
- `/api/inspect` 返回内容检查结果；不通过时 `canPublish=false`，但接口本身仍返回检查报告。
- `/api/deploy`、`/api/agent/deploy`、项目更新接口都强制执行内容检查；不通过、疑似风险、检查异常都不能生成公开链接。
- 管理后台增加内容检查记录，让运营人员能看到被拦截项目、风险类型、命中原因和处理状态。
- 当前采用本地规则初筛，重点拦截诈骗、高风险金融引导、博彩、色情低俗、违法交易、恶意下载、敏感信息收集、外部联系方式导流、支付订单风险等内容。
- 预留第三方内容安全服务接入位置，但当前尚未接入阿里云、腾讯云等正式内容安全接口。

v0.1.26 当前目标：

- 内容安全生产化增强：内容检查结果增加明确决策和下一步说明。
- 管理后台人工复核闭环：内容检查记录支持待处理、确认违规、误判、已处理和管理员备注。
- 用户端失败体验优化：内容风险、疑似风险和检查失败要告诉用户为什么不能发布、下一步怎么改。
- 继续保留本地规则初筛，并预留第三方内容安全接口配置。

v0.2.0 已完成：

- AI 工具一键发布正式体验版。
- CLI / MCP / Codex Skill 统一升级到 `0.2.0`。
- CLI 不再内置固定服务器 IP，必须使用当前 DemoGo 平台地址或环境变量。
- 用户端 AI 发布页提供给 Codex、Cursor / Claude Code、其他 AI Agent 的可复制指令。
- AI 发布继续复用 `POST /api/agent/deploy`，不绕过项目检测、额度检查和内容安全检查。
- 管理后台概览增加 AI 发布次数、发布成功数、发布失败数和失败原因归类。
- 本版本不新增后端托管、数据库托管、支付、订单、登录系统托管等长期能力。

v0.2.1 已完成：

- 修复 AI 发布默认使用项目目录名导致项目名过泛的问题，优先使用页面标题、主标题或用户填写名称生成项目名和链接。
- 优化自动表单识别，只对报名、预约、留资、留言类表单自动开启收集，避免价格计算器、费用切换、模型配置控件被误判。
- 后台和项目详情记录发布来源，区分网页上传、DemoGo CLI、DemoGo MCP 和直接 Agent API。
- CLI 增加 `demogo doctor` 与 `demogo config clear`，改善本机配置检查和清理体验。
- MCP/CLI 请求明确带发布来源标识，继续复用 `POST /api/agent/deploy`。

v0.2.2 已完成：

- 强化 CLI 可安装方案，交付包内提供安装说明，当前默认使用已安装的 `demogo` 命令，不把 `npx demogo` 当作已支持的默认方式。
- 统一 Agent API、CLI、MCP 的成功结果结构，稳定返回项目名、链接、发布方式、表单状态、内容检查结果和下一步。
- 建立真实项目测试集，覆盖单 HTML、React/Vite、Vue/Vite、dist/build、报名页、计算器、后端/SSR、不合规内容等样本。
- 收敛用户端和 Codex Skill 文案，明确 CLI 不可用时要说明原因，再用 MCP/API 兜底。

v0.2.3 已完成：

- 合并原 v0.2.3 和 v0.2.4，不再单独开发旧计划中的 v0.2.4。
- 新增异步发布任务接口：创建任务、查询任务、更新项目任务。
- 用户端创建项目和更新项目改为任务式发布，展示生成进度、失败步骤和最终链接。
- 同步发布 API、Agent 发布 API、CLI、MCP 继续兼容，不破坏 AI 工具发布链路。
- 异步任务继续复用原项目检测、内容安全检查、额度检查、表单识别和发布记录，不绕过任何现有规则。

v0.2.4 当前目标：

- 正式域名真实试用与三端体验重构版。
- 首页全面重构：强化需求钩子、试用转化、场景表达、信任信息和支持边界。
- 用户端全面重构：完善发布流程、项目管理、表单记录、AI 发布引导、套餐额度和反馈入口。
- 管理端全面重构：完善运营看板、待处理事项、真实试用指标、失败原因、内容检查和用户反馈处理。
- 保留 v0.2.3 异步发布和 AI 发布链路，不新增后端托管、数据库托管、Docker 隔离等长期能力。

当前明确不支持：

- Node.js/Python 后端长期运行。
- Express、FastAPI、Flask、Django、NestJS 等后端服务托管。
- Next/Nuxt/Remix SSR runtime。
- 自定义 `/api/*` 后端接口自动运行。
- 数据库自动分配。
- 支付、订单、登录系统后端、WebSocket、AI Proxy。
- `.rar` 等非 `.zip/.tar.gz/.tgz` 格式。

v0.1.25 内容安全能力的边界：

- 当前能检查页面源码、文本内容、构建后的实际发布目录，以及部分可疑文件名。
- 当前不能识别图片、视频、音频里的真实内容，只能对图片文件名做有限风险提示。
- 当前不是完整人工审核系统，也不是正式第三方内容安全服务。
- 对合规高风险内容采取默认拦截策略：检查不通过或检查异常时，不生成公开链接。

不要把“不支持”包装成“实验能力”。支持就是支持，不支持就是不支持。

## 产品原则

- 面向非技术用户表达，避免把 React、Vite、SSR、Docker、API 等技术词直接作为核心说明。
- 首页、用户端、管理后台的文案都要让非技术用户理解 DemoGo 能解决什么问题、适合谁、能做什么、暂不能做什么。
- 失败提示要告诉用户“为什么失败、有什么影响、下一步让 AI 怎么改”。
- 不要为了堆信息做横向滚动表格或奇怪的左右拖拽布局。
- 页面风格、UI 设计、配色、字体、按钮、卡片规则要统一，确保这是一个系统。
- 卡片、列表、操作区要对齐。相邻卡片的宽高和布局节奏应尽量一致。
- 不要让按钮被挡住，不要出现单字换行、奇怪换行、文字压缩、颜色对比不足。
- 用户端项目管理应以清晰工作流为主：项目列表、项目详情、发布记录、操作区、表单记录。
- 管理后台应让运营人员快速看用户、项目、失败原因、升级申请、反馈和表单记录。

## 技术架构

当前架构：

- 前端：React + Vite。
- 后端：Node.js + Express。
- 数据库：MySQL，通过 `server/src/db/mysql-store.js` 兼容原 JSON 读写接口。
- 静态托管：Nginx 服务 `/var/www/demogo-preview`。
- 用户 Demo 发布目录：`/var/www/demogo-preview/d`。
- 后端服务：systemd `demogo-server.service`，监听 3001。
- 部署入口：PowerShell 上传脚本 + 服务器 Bash 部署脚本。

重要文件：

- 后端主文件：`server/src/server.js`
- 后端配置：`server/src/config.js`
- 数据库 schema：`server/src/db/schema.sql`
- MySQL 兼容存储：`server/src/db/mysql-store.js`
- 后端烟雾测试：`server/src/tests/smoke-test.js`
- 内容检查服务：`server/src/services/content-review-service.js`
- 首页：`web/src/pages/HomePage.tsx`
- 用户端：`web/src/pages/UserDashboard.tsx`
- 管理后台：`web/src/pages/AdminDashboard.tsx`
- 前端 API：`web/src/api`
- 用户端样式：`web/src/styles/dashboard.css`
- 首页样式：`web/src/styles/home.css`
- 打包脚本：`scripts/build-demogo-packages.ps1`
- 上传脚本：`scripts/upload-demogo-packages.ps1`
- 部署脚本：`scripts/server-deploy-demogo-v0.2.4.sh`
- 验证脚本：`scripts/server-verify-demogo.sh`
- CLI：`cli/bin/demogo.js`
- MCP：`mcp/bin/demogo-mcp.js`
- Codex Skill：`codex-skill/demogo-deploy/SKILL.md`

## 版本节奏

不要随意改变版本号。用户非常重视版本节奏。

已完成：

- v0.1.18：表单托管、非技术化表达、用户端项目管理体验、管理后台体验、全局布局规范。
- v0.1.19：AI 助手发布入口版，包含发布密钥、Agent 发布 API、AI 发布页、源码无 build 命令前置拦截、SPA 路由刷新修复。
- v0.1.20：自动表单托管、用户端项目详情抽屉、管理后台全局详情抽屉、关键体验修正。
- v0.1.21：三端前端重构、非技术化文案体系、取消普通用户发布码、保留 AI 发布口令。
- v0.1.22：DemoGo CLI 最小可用版 + 首页营销化改版。
- v0.1.23：DemoGo MCP Server 初版。
- v0.1.24：Codex Skill 初版和 AI 工具交付包。
- v0.1.25：发布前内容安全检查版，公开链接生成前必须通过内容检查。
- v0.1.26：真实试用可信增强版，内容安全决策、后台复核闭环和失败体验优化。
- v0.2.0：AI 工具一键发布正式体验版，CLI/MCP/Skill 统一到 0.2.0，用户端 AI 发布指令和后台观察指标完善。
- v0.2.1：AI 发布真实试用修正版，优化项目名称、表单误判、发布来源追踪和 CLI 配置体验。
- v0.2.2：AI 发布真实可用性强化版，强化 CLI 可安装、标准化 AI 发布结果、建立真实项目测试集。
- v0.2.3：真实试用与异步发布合并版，新增发布任务接口，用户端创建和更新改为任务进度式体验。
- v0.2.4：正式域名真实试用与三端体验重构版，重构首页、用户端和管理端体验。

建议后续节奏：

- v0.3.0：后端项目和数据库托管能力。

AI 工具发布方向的版本节奏已确认，不要因为中途出现新问题而改动这条主线：

```text
Agent 发布 API
  -> DemoGo CLI
  -> DemoGo MCP Server
  -> Codex 插件 / Skills
  -> AI 工具一键发布正式体验
```

后续任何与 Codex、Cursor、Claude Code、OpenCode、Hammers Agent 等 AI 编程工具集成相关的新需求，都应归并到这条路线里。可以把新需求作为当前阶段的子任务、验收项或后续增强项，但不要擅自改变版本顺序、跳过 CLI/MCP 基础层，或把版本号升级到新的计划外版本。

如需调整版本范围，先给方案，等待用户确认，不要直接开发。

## 开发协作规则

- 任何较大改动前必须先给方案，用户确认后再改。
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

## AI 发布能力说明

v0.1.19 起的 AI 发布能力是底座，不是完整 Codex 插件。

当前链路：

```text
AI 工具
  -> 使用用户生成的 DemoGo AI 发布口令
  -> 调用 /api/agent/deploy
  -> 复用现有发布检测、安全检查、额度检查、部署记录
  -> 执行发布前内容安全检查
  -> 返回可试用链接
```

AI 发布口令规则：

- 用户端生成。
- 完整密钥只显示一次。
- 服务端只保存哈希。
- 用户重置后旧密钥失效。
- 普通查询只返回是否启用、前缀和生成时间。

后续做 CLI、MCP、Codex 插件时，不要重写发布逻辑，应复用 Agent 发布 API 或同一条发布核心链路。

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
- 用户端项目发布。
- 项目更新。
- `.zip`、`.tar.gz`、`.tgz`。
- `dist`、`build`、`out`、`public`。
- 前端源码构建项目。
- 无 build 命令源码项目检测拦截。
- 后端/SSR 项目明确不支持。
- `.env`、密钥、脚本、危险路径拦截。
- 自动表单收集、表单托管补开和公开提交。
- 套餐升级申请和后台处理。
- AI 发布口令生成、重置、隐藏明文。
- Agent 发布 API。
- 发布前内容安全检查：检查通过才能生成公开链接；违规内容应在检测阶段和发布阶段都被拦截。
- 管理后台内容检查记录：被拦截内容应能在后台查询。
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
dist\demogo-server-v0.2.4.zip
dist\demogo-ops-scripts-v0.2.4.zip
dist\demogo-cli-v0.2.4.zip
dist\demogo-mcp-v0.2.4.zip
dist\demogo-codex-skill-v0.2.4.zip
```

上传：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\upload-demogo-packages.ps1
```

服务器部署：

```bash
cd /tmp
unzip -o demogo-ops-scripts-v0.2.4.zip
sed -i 's/\r$//' server-deploy-demogo-v0.2.4.sh server-rollback-demogo-v0.2.4.sh server-verify-demogo.sh server-clean-demogo-data.sh
chmod +x server-deploy-demogo-v0.2.4.sh server-rollback-demogo-v0.2.4.sh server-verify-demogo.sh server-clean-demogo-data.sh
./server-deploy-demogo-v0.2.4.sh 2>&1 | tee /tmp/demogo-v0.2.4-deploy.log
./server-verify-demogo.sh
```

部署成功标准：

- `/api/health` 返回 `0.2.4`。
- Nginx `/api/health` 代理返回 `0.2.4`。
- 首页、登录页、用户端返回 200。
- 管理后台返回 401 是正常的，因为有 Basic Auth。
- `demogo-server.service` 是 `active (running)`。

## 代码风格

- 优先 ASCII，除非文件本身已有中文文案。
- 注释要少，只在复杂逻辑前加简短解释。
- 不要把临时测试脚本当业务代码提交。
- 手工编辑优先使用补丁方式，避免无意义格式化。
- 不要在用户没有确认时引入新依赖。

## 重要提醒

DemoGo 的长期方向是成为 AI 编程产物的试用链接平台，不是马上做完整云应用托管平台。后端托管、数据库、容器隔离、MCP、Codex 插件都重要，但必须按版本节奏推进。

任何时候都要帮助用户区分：

- 当前已经支持什么。
- 当前明确不支持什么。
- 哪些是下一版本计划。
- 哪些是长期架构方向。

不要用模糊说法制造能力错觉。

