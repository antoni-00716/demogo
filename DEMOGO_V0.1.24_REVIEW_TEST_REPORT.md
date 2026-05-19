# DemoGo v0.1.24 三轮代码审查与三轮测试记录

日期：2026-05-17

## 总结论

v0.1.24 已完成 3 轮全面代码审查和 3 轮全面测试。该版本已对齐原计划：Codex 插件 / Skills 初版。后端、前端、CLI、MCP、部署包和 Codex Skill 初版均完成验证。

当前没有发现阻塞部署的问题。可以进入部署准备。

## 第一轮：后端发布、额度、表单和安全链路

审查范围：

- 发布、更新、下线、恢复、删除。
- `.zip`、`.tar.gz`、`.tgz` 检测和解包。
- 源码构建、静态输出目录识别、SPA 回退。
- 自动表单收集、公开提交、表单额度。
- 用户登录、AI 发布口令、Agent 发布 API。
- 管理后台、升级申请、反馈、审计记录。

测试结果：

- `server npm run check` 通过。
- `server npm run test:smoke` 通过。

发现问题：

1. 创建发布时仍会重复分析项目包。
   - 位置：`server/src/server.js`
   - 说明：创建发布会先 `inspectProjectArchive`，后续 `extractStaticDemo` 又分析一次。
   - 影响：大项目发布会慢一些。
   - 是否阻塞部署：否。

2. 下线项目后，表单额度释放规则仍需产品层明确。
   - 说明：这不是 v0.1.24 新增问题，但仍是用户体验风险。
   - 影响：用户可能以为下线项目会同步释放表单能力。
   - 是否阻塞部署：否。

## 第二轮：CLI、MCP、AI 发布和打包链路

审查范围：

- CLI 版本、配置、打包、发布、错误提示。
- CLI 长路径和中文路径 tar.gz 打包。
- MCP 工具列表、配置读取、项目检查、项目发布。
- MCP 包是否能独立分发。
- 用户端 AI 发布指令是否还硬编码 IP。

测试结果：

- CLI/MCP 语法检查通过。
- CLI `--version` 返回 `0.1.24`。
- MCP `initialize`、`tools/list`、`demogo_get_config` 通过。
- CLI 英文长路径打包通过。
- CLI 中文路径打包通过。
- 使用服务端 `tar` 依赖解包验证通过。
- v0.1.24 六个交付包生成成功：
  - `dist/demogo-site-preview.zip`
  - `dist/demogo-server-v0.1.24.zip`
  - `dist/demogo-ops-scripts-v0.1.24.zip`
  - `dist/demogo-cli-v0.1.24.zip`
  - `dist/demogo-mcp-v0.1.24.zip`
  - `dist/demogo-codex-skill-v0.1.24.zip`
- 解压后的 CLI 独立运行通过。
- 解压后的 MCP 独立运行通过。

发现问题：

1. CLI/MCP 默认 API 地址仍是服务器 IP。
   - 位置：`cli/lib/core.js`、`mcp/lib/core.js`
   - 说明：这是默认值，用户端复制的 AI 指令已经改为当前页面地址。
   - 影响：未来切域名或 HTTPS 后，需要同步 CLI/MCP 默认地址，或者要求用户明确配置。
   - 是否阻塞部署：否。

2. MCP 的 `lib/core.js` 是从 CLI 复制而来。
   - 位置：`mcp/lib/core.js`
   - 说明：当前解决了独立分发问题，但后续 CLI 核心逻辑变更时，需要同步 MCP。
   - 影响：长期维护上容易出现两边不一致。
   - 是否阻塞部署：否。

## 第三轮：前端体验、文案、部署脚本和版本一致性

审查范围：

- 首页、用户端、后台入口。
- 用户端 AI 发布页。
- 用户可见文案是否暴露内部版本话术。
- 打包脚本、上传脚本、部署脚本、回滚脚本。
- Codex Skill 初版。

测试结果：

- `web npm run lint` 通过。
- `web npm run build` 通过。
- Codex Skill 包生成通过：`dist/demogo-codex-skill-v0.1.24.zip`。
- Codex Skill 包解压验证通过，包内包含 `demogo-deploy/SKILL.md`。
- Codex Skill 内容审查通过：已明确支持范围、不支持范围、所需发布口令、平台地址、CLI 优先、MCP/API 兜底和失败处理方式。
- 本地入口 HTTP 验收通过：
  - `/` 返回 200。
  - `/login.html` 返回 200。
  - `/app.html` 返回 200。
  - `/admin.html` 返回 200。
- 首页和登录页截图生成成功：
  - `.tmp/v024-visual-shots/home.png`
  - `.tmp/v024-visual-shots/login.png`
- 本地 Vite 测试进程已清理。

发现问题：

1. 构建产物里仍有一个 IP 字符串作为无浏览器环境兜底。
   - 位置：`web/src/pages/UserDashboard.tsx` 的 `getDemoGoApiBase`。
   - 说明：真实浏览器里使用 `window.location.origin`，用户复制指令不会固定成 IP。
   - 影响：极低。若后续追求完全去 IP，可以改成“请填写平台地址”。
   - 是否阻塞部署：否。

2. 用户端/后台带登录态的自动化视觉验收仍未覆盖。
   - 说明：本轮完成了入口级 HTTP 验收和首页/登录页截图；完整工作台和后台业务态仍依赖登录态/Basic Auth。
   - 影响：后续大规模前端改版时，建议补 Playwright 登录态脚本。
   - 是否阻塞部署：否。

## 部署判断

v0.1.24 可以部署。

部署前需要确认：

- 上传包使用 v0.1.24：
  - `demogo-site-preview.zip`
  - `demogo-server-v0.1.24.zip`
  - `demogo-ops-scripts-v0.1.24.zip`
  - `demogo-cli-v0.1.24.zip`
  - `demogo-mcp-v0.1.24.zip`
  - `demogo-codex-skill-v0.1.24.zip`
- 服务器部署后 `/api/health` 必须返回 `0.1.24`。
- 管理后台 `/admin.html` 返回 401 是正常现象，因为有 Basic Auth。

## 建议后续优化

1. 把 CLI/MCP 默认 API 地址改成可配置发布参数，减少切换域名时的维护成本。
2. 把 CLI 核心逻辑抽成共享包，避免 MCP 复制一份 `core.js`。
3. 明确“项目下线/删除”和“表单额度释放”的产品规则。
4. 补充带登录态的用户端和后台视觉自动化测试。
5. 后端发布链路减少重复分析，提高大包发布速度。
