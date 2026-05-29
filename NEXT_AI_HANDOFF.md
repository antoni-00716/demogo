# DemoGo 下一工具交接文档

更新时间：2026-05-28

这份文档用于把 DemoGo 项目交接给另一个 AI 开发工具。接手后先读本文，再读 `AGENTS.md`、`docs/CURRENT_STATUS.md`、`docs/ROADMAP.md`。

## 1. 当前真实状态

- 本地项目目录：`C:\Users\wei.gu\Documents\demogo`
- 本地版本：`0.9.0`，以根目录 `VERSION` 为准。
- 线上版本：`0.9.0`，已通过 `https://demogo.cn/api/health` 验证。
- npm CLI：`@demogo-cn/cli@0.9.0`，已发布并验证。
- npm MCP：`demogo-mcp@0.9.0`，已发布并验证。
- 线上运行器：Docker Node.js 运行器已开启。
- 线上数据库能力：MySQL 试用数据库已开启。
- 注册邮箱验证码：已开启，使用 163 SMTP 授权码，发送验证码已测试通过。

线上能力接口当前返回：

```json
{
  "version": "0.9.0",
  "nodeRuntime": "available",
  "runtimeEnabled": true,
  "mysql": "available"
}
```

已验证命令：

```powershell
& "C:\Program Files\nodejs\npm.cmd" view @demogo-cn/cli version
# 0.9.0

& "C:\Program Files\nodejs\npm.cmd" view demogo-mcp version
# 0.9.0

& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest --version
# 0.9.0

& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
# 平台连接正常：demogo-server 0.9.0
# AI 发布口令：有效
```

## 2. 项目定位

DemoGo 是一个试用链接生成与部署平台，目标是让开发出来的产品尽快被用户打开、试用和反馈。

核心闭环：

```text
项目文件或源码 -> DemoGo 检查 -> 生成试用链接 -> 分享给用户 -> 收集反馈
```

DemoGo 不是电商平台，也不是通用云厂商。用户提到“完整电商平台项目”时，意思是把它作为 DemoGo 部署能力边界的验收样本，不是要 DemoGo 自己做电商业务。

长期能力目标：

```text
静态网页 / 前端项目
  -> Node.js 单服务
  -> MySQL 试用数据库
  -> 环境变量和初始化脚本
  -> 接近完整应用的试用部署
```

## 3. 项目负责人偏好

必须遵守：

- 始终中文交流，表达简洁、直接、实事求是。
- 用户不是技术背景，但产品判断强，解释技术问题时要说明业务含义、技术逻辑、实现方式和关键取舍。
- 大改动前必须先给方案，等用户确认后再开发。
- 用户明确说“继续”“按计划推进”时，可以继续当前已确认范围。
- 不要擅自发布线上或 npm。只有用户明确说“发布 vX.X.X”或“发布这个版本”才发布。
- 不要把不支持包装成实验能力。支持就是支持，不支持就是不支持。
- 后续版本要有质变，不要只做零碎小修。
- 产品原则是“把方便留给用户，把麻烦留给 DemoGo”。
- AI 发布页必须简单，只保留一条通用 AI 发布提示词，不要按 Codex、Claude Code、Cursor 拆成多套提示词。

## 4. 当前已支持能力

发布入口：

- Web 上传发布。
- CLI 发布。
- MCP 发布。
- Codex Skill 发布。
- Codex Plugin 发布。
- Claude Code Plugin 发布。
- Agent API 发布。

项目类型：

- 静态网页、单 HTML、H5、活动页、报名页、作品集。
- `dist`、`build`、`out`、`public` 等前端构建产物。
- 可构建为静态页面的 React、Vue、Vite 等前端源码项目。
- Node.js 单服务试用环境。
- MySQL 空试用数据库。
- 用户自己的 Supabase 外部后端连接、检测和环境变量注入。

产品能力：

- AI/CLI/MCP 更新已有链接，链接保持不变。
- CLI 会在同一项目目录保存 `.demogo/project.json`，再次 `deploy` 默认更新原链接。
- 结构化失败诊断：失败类别、证据、处理动作、复制给 AI 的修复提示。
- 内容安全检查。
- 自动表单收集。
- 套餐额度、升级申请、链接后缀权益和管理后台。
- Free 首次发布随机链接。
- Lite/Pro 可在用户端修改 `/d/...` 链接后缀。
- Pro 可提交 `xxx.demogo.cn` 二级域名申请。

## 5. 当前明确不支持

不要制造能力错觉。当前不支持：

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

说明：Postgres、Redis、MongoDB 等线索可以识别，但当前不是“自动可运行支持”。Supabase 当前支持“连接用户自己的 Supabase”，不是 DemoGo 自己托管 Supabase。

## 6. v0.8.0 和 v0.9.0 关键成果

v0.8.0 已完成：

- 用户端 AI 发布页合并为一条通用 AI 发布提示词。
- 新增 `codex-plugin/demogo`。
- Codex Plugin 内置 DemoGo Skill，通过 MCP 复用发布、更新和项目检查。
- 打包脚本支持 `demogo-codex-plugin-v<version>.zip`。
- 已发布 `@demogo-cn/cli@0.8.0` 和 `demogo-mcp@0.8.0`，后续已被 v0.9.0 覆盖。

v0.9.0 已完成并发布：

- MCP 新增 `demogo_doctor`。
- 新增 `claude-code-plugin/demogo`。
- 用户端 AI 发布页展示 AI 工具接入状态，但仍只保留一条通用 AI 发布提示词。
- 打包脚本支持 `demogo-claude-code-plugin-v<version>.zip`。
- 已发布并验证：
  - `@demogo-cn/cli@0.9.0`
  - `demogo-mcp@0.9.0`
  - 线上 `demogo-server 0.9.0`

## 7. 重要文件位置

项目规则：

- `AGENTS.md`
- `docs/CURRENT_STATUS.md`
- `docs/ROADMAP.md`

后端：

- `server/src/server.js`
- `server/src/config.js`
- `server/src/db/schema.sql`
- `server/src/db/mysql-store.js`
- `server/src/services/runtime-service.js`
- `server/src/services/demo-database-service.js`
- `server/src/services/project-classifier-service.js`
- `server/src/services/failure-diagnosis-service.js`
- `server/src/services/application-readiness-service.js`
- `server/src/services/external-backend-service.js`
- `server/src/tests/smoke-test.js`

前端：

- `web/src/pages/HomePage.tsx`
- `web/src/pages/LoginPage.tsx`
- `web/src/pages/UserDashboard.tsx`
- `web/src/pages/AdminDashboard.tsx`
- `web/src/api`
- `web/src/styles/home.css`
- `web/src/styles/dashboard.css`
- `web/src/styles/auth.css`

CLI / MCP / AI 工具接入：

- `cli/bin/demogo.js`
- `cli/lib/core.js`
- `cli/package.json`
- `mcp/bin/demogo-mcp.js`
- `mcp/lib/core.js`
- `mcp/package.json`
- `codex-skill/demogo-deploy/SKILL.md`
- `codex-plugin/demogo`
- `claude-code-plugin/demogo`

打包部署：

- `scripts/build-demogo-packages.ps1`
- `scripts/upload-demogo-packages.ps1`
- `scripts/deploy-demogo-release.ps1`
- `scripts/server-deploy-demogo-v0.9.0.sh`
- `scripts/server-rollback-demogo-v0.9.0.sh`
- `scripts/server-verify-demogo.sh`

## 8. 工作树状态提醒

当前工作树很脏，这是历史清理和大版本迭代造成的，不要误判为异常。

注意：

- 很多旧文档、旧脚本、旧页面文件的删除，是用户之前确认过的清理方向。
- 不要使用 `git reset --hard`。
- 不要回退用户已有改动。
- 不要只依赖 `git diff` 判断项目真实状态。
- `AGENTS.md` 是关键规则文件，但当前终端里可能出现编码显示问题；以文件内容和用户对话里的规则为准。
- `dist` 中已有 v0.9.0 发布包。

## 9. 测试要求

大版本开发完成后至少执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
& "C:\Program Files\nodejs\npm.cmd" run check
& "C:\Program Files\nodejs\npm.cmd" run test:smoke
```

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run build
```

如涉及 CLI/MCP：

```powershell
cd C:\Users\wei.gu\Documents\demogo\cli
& "C:\Program Files\nodejs\npm.cmd" pkg get version

cd C:\Users\wei.gu\Documents\demogo\mcp
& "C:\Program Files\nodejs\npm.cmd" pkg get version
```

如涉及前端体验大改，还要本地打开检查：

- 首页 `/`
- 登录页 `/login.html`
- 用户端 `/app.html`
- 管理后台 `/admin.html`
- 用户端 AI 发布页

## 10. 打包和发布规则

开发完成不等于发布。只有用户明确要求发布时才执行。

本地打包：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
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

发布成功标准：

- `https://demogo.cn/api/health` 返回目标版本。
- `https://demogo.cn/api/hosting/capabilities` 返回目标版本。
- 首页、登录页、用户端返回 200。
- 管理后台返回 401 是正常的，因为有 Basic Auth。
- `demogo-server.service` 是 `active (running)`。
- 如果涉及 CLI/MCP，npm 和 npx 必须同步验证。

PowerShell 如果遇到 `npm.ps1` 执行策略限制，使用：

```powershell
& "C:\Program Files\nodejs\npm.cmd"
& "C:\Program Files\nodejs\npx.cmd"
```

## 11. 当前内容安全边界

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

当前不能识别图片、视频、音频里的真实内容，只能对文件名做有限风险提示。

## 12. 注册和邮件验证码

注册邮箱验证码已上线并测试可发送。

服务器配置位置：

```text
/etc/systemd/system/demogo-server.service.d/email.conf
```

关键点：

- `SMTP_PASS` 是 163 SMTP 授权码，不是邮箱登录密码。
- 用户最近只修改了邮箱登录密码，没有改 SMTP 授权码，因此通常不需要更新服务器配置。
- 如果后续验证码发送失败，再检查 `SMTP_PASS` 并重启服务。

验证：

```bash
curl https://demogo.cn/api/auth/register-options
```

期望：

```json
{"emailVerificationEnabled":true,"emailConfigured":true,"emailRequired":true,"canRegister":true}
```

## 13. 下一步建议

建议进入 `v1.0.0`，定位为“完整应用试用部署闭环”。

原因：用户已经明确不满意每个版本只做小点，后续版本需要有质变。v0.8.0 和 v0.9.0 已完成 AI 工具接入闭环，下一步应回到 DemoGo 的核心部署能力，把“能不能支撑接近完整应用试用”打透。

建议 v1.0.0 范围：

1. 真实完整应用样本验收
   - 前端页面。
   - Node.js 后端 API。
   - MySQL 试用数据库。
   - `schema.sql` 初始化。
   - 环境变量。
   - 简单管理后台页面。
   - 发布后可访问、可提交、可查询。

2. 运行状态可视化增强
   - 页面是否正常。
   - 接口是否正常。
   - 数据库是否初始化成功。
   - 环境变量是否齐全。
   - 最近运行日志是否有错误。

3. 数据库能力补强
   - 展示初始化结果。
   - 展示最近初始化错误。
   - 支持重置试用数据库。
   - `schema.sql` 错误诊断更清楚。

4. AI 修复闭环增强
   - 端口错误。
   - 缺 `start` 命令。
   - 缺环境变量。
   - 数据库连接错误。
   - 依赖安装失败。
   - 输出可复制给 AI 的修复提示。

5. 发布体验验收
   - CLI 发布完整应用。
   - MCP 发布完整应用。
   - 更新版本，原链接保持不变。
   - 用户端展示是否足够清楚。

在动手前先向用户确认 v1.0.0 范围。不要直接开发。

## 14. 接手后的第一步

建议另一个 AI 接手后按这个顺序做：

1. 读取 `AGENTS.md`、本文、`docs/CURRENT_STATUS.md`、`docs/ROADMAP.md`。
2. 核对 `VERSION`、`server/package.json`、`cli/package.json`、`mcp/package.json` 是否一致。
3. 运行基础测试确认本地状态。
4. 向用户确认 v1.0.0 方案范围。
5. 用户确认后再开发。

不要一接手就发布，不要一接手就重构，不要一接手就删除文件。
