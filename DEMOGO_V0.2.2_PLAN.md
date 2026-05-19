# DemoGo v0.2.2 开发方案：AI 发布真实可用性强化版

## 版本目标

v0.2.2 不扩大托管边界，不做后端/数据库托管。核心目标是把“AI 工具帮用户发布 DemoGo 链接”这条链路做得更真实、更稳定、更容易验证。

当前 v0.2.1 已解决：

- Token 长期复用。
- 单 HTML 页面直接发布。
- 项目名不再轻易生成 `project/demo/demogo`。
- CLI/MCP/API 来源可追踪。
- 表单误判收窄。

v0.2.2 要解决：

- `npx demogo` 当前不可用，AI 工具经常只能 API 兜底。
- CLI/MCP/API 返回结果虽然可用，但不够统一，不利于 AI 稳定汇报。
- 缺少一组真实 AI 项目测试集，导致每次只能零散测试。
- 用户端和 Skill 文档需要把“当前真实可用命令”和“未来 npm 发布命令”区分清楚。

## 本版任务

### 1. CLI 可安装方案

短期目标不是立即发布 npm，而是让本地交付包能被真实安装和调用。

实现内容：

- 生成可安装 CLI 包。
- 增加本地安装说明：
  - 从 `dist\demogo-cli-v0.2.2.zip` 解压。
  - 在 CLI 目录执行 `npm link` 或 `npm install -g .`。
  - 验证 `demogo --version`。
- 用户端 AI 发布说明中区分：
  - 已安装 CLI：使用 `demogo deploy`。
  - 未安装 CLI：不要假装 CLI 成功，可以用 MCP/API 兜底。
  - `npx demogo` 仅作为后续 npm 发布后的方式，不作为当前默认。

验收：

- CLI 包版本为 `0.2.2`。
- 解压后的 CLI 可通过 `node bin/demogo.js --version` 运行。
- 文档不再把 `npx demogo` 作为当前默认命令。

### 2. AI 发布结果标准化

统一 Agent API、CLI、MCP 输出结构，便于 AI 工具稳定向用户汇报。

标准字段：

- `ok`
- `message`
- `projectName`
- `publicUrl`
- `deploySource`
- `deploySourceLabel`
- `detectedType`
- `autoFormEnabled`
- `contentReviewStatus`
- `nextStep`
- `limits`

失败时要求：

- 返回用户能理解的失败原因。
- 返回给 AI 的修复建议。
- 明确是“项目问题、额度问题、内容问题、CLI/网络问题”。

验收：

- Agent API 成功响应包含标准字段。
- CLI 成功输出包含项目名、链接、发布方式、表单状态。
- MCP 成功响应包含同样关键信息。
- 失败响应仍保持兼容，不破坏现有前端。

### 3. 真实项目测试集

建立一组可重复使用的测试项目，不再只靠临时手工测试。

测试样本：

- 纯 `index.html`。
- 单个 `landing-page.html`。
- React/Vite 源码项目。
- Vue/Vite 源码项目。
- 已生成 `dist/index.html`。
- 已生成 `build/index.html`。
- 报名页，带姓名/手机号/留言。
- 价格计算器，带价格输入和开关。
- 缺少 build 命令的源码项目。
- 后端项目。
- SSR 项目。
- 包含 `.env` 的项目。
- 内容风险项目。

实现内容：

- 新增测试样本生成脚本或测试目录。
- 新增验证脚本，至少覆盖 inspect + deploy 的关键路径。
- 输出测试报告摘要。

验收：

- 可以一键生成测试样本。
- 可以一键执行核心样本验证。
- 通过样本验证能看到支持/不支持边界。

### 4. 用户端和 Skill 文案收敛

继续面向非技术用户表达。

重点修正：

- 不再暗示用户每次都要生成/重置 Token。
- 不再把 `npx demogo` 写成当前默认能力。
- 明确“CLI 未安装时，AI 可以走 MCP/API 兜底”。
- 单 HTML 文件可直接发布。
- 支持和不支持继续说清楚。

验收：

- 用户端 AI 发布页文案一致。
- Codex Skill 文档一致。
- CLI help 文案一致。

## 不做内容

- 不做后端服务托管。
- 不做数据库自动分配。
- 不做 npm registry 发布账号和正式发布流程，除非用户单独确认。
- 不做三端视觉大改版。
- 不做支付、订单、登录系统托管。

## 测试要求

至少执行：

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

CLI/MCP：

```powershell
node --check cli/bin/demogo.js
node --check cli/lib/core.js
node cli/bin/demogo.js --version
node cli/bin/demogo.js help
node --check mcp/bin/demogo-mcp.js
node --check mcp/lib/core.js
```

真实项目测试集：

```powershell
node scripts/run-real-project-fixtures.mjs
```

## 部署包

目标生成：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.2.zip
dist\demogo-ops-scripts-v0.2.2.zip
dist\demogo-cli-v0.2.2.zip
dist\demogo-mcp-v0.2.2.zip
dist\demogo-codex-skill-v0.2.2.zip
```
