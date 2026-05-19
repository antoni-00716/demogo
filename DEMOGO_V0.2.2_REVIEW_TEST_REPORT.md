# DemoGo v0.2.2 审查与测试报告

## 结论

v0.2.2 已完成开发、审查、测试和打包，可以进入部署准备。

本版定位是 **AI 发布真实可用性强化版**，不扩大托管边界，重点把 CLI、MCP、Agent API 和真实项目验证链路做扎实。

## 已完成改动

- 服务端版本升级到 `0.2.2`。
- CLI / MCP / Codex Skill 版本升级到 `0.2.2`。
- 新增 v0.2.2 部署脚本和回滚脚本。
- CLI 包新增 `README.md`，说明本地安装方式：解压后执行 `npm install -g .`。
- 用户端和 Skill 文案明确：当前默认使用已安装的 `demogo` 命令；`npx demogo` 只有 npm 正式发布后才作为默认方式。
- Agent API 成功响应增加标准字段：
  - `projectName`
  - `deploySource`
  - `deploySourceLabel`
  - `autoFormEnabled`
  - `contentReviewStatus`
  - `limits`
- CLI 成功输出增加项目名、发布方式、页面类型、内容检查和表单状态。
- MCP 成功响应同步返回项目名、发布方式、页面类型、表单状态和内容检查状态。
- 新增真实项目测试集脚本：`scripts/run-real-project-fixtures.mjs`。
- 真实项目样本覆盖 13 类情况：单 HTML、React/Vite、Vue/Vite、dist/build、报名页、计算器、后端、SSR、敏感文件、风险内容等。

## 审查结果

### 第一轮：版本与部署包

结果：通过。

- `server/src/config.js` 返回 `0.2.2`。
- `server/package.json`、`cli/package.json`、`mcp/package.json` 均为 `0.2.2`。
- 打包脚本输出 v0.2.2 包。
- ops 包包含 `server-deploy-demogo-v0.2.2.sh` 和 `server-rollback-demogo-v0.2.2.sh`。

### 第二轮：AI 发布结果结构

结果：通过。

- Agent API 保持兼容，同时补充标准字段。
- CLI 输出更适合 AI 工具直接复述给用户。
- MCP 返回 JSON 结构更完整。
- 发布来源仍可区分 `web`、`cli`、`mcp`、`agent_api`。

### 第三轮：CLI 可安装性

结果：通过。

- CLI 包包含 `package.json`、`README.md`、`bin/demogo.js`、`lib/core.js`。
- `node cli/bin/demogo.js --version` 返回 `0.2.2`。
- `node cli/bin/demogo.js help` 包含本地安装说明。

### 第四轮：真实项目测试集

结果：通过。

脚本已生成以下样本包：

- `static-index`
- `single-landing-html`
- `dist-output`
- `build-output`
- `signup-form`
- `price-calculator`
- `react-vite-source`
- `vue-vite-source`
- `source-no-build`
- `backend-node`
- `ssr-next`
- `blocked-env`
- `risky-content`

输出位置：

```text
.tmp\real-project-fixtures
```

## 测试结果

已通过：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

已通过：

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

已通过：

```powershell
node --check cli/bin/demogo.js
node --check cli/lib/core.js
node cli/bin/demogo.js --version
node cli/bin/demogo.js help
```

已通过：

```powershell
node --check mcp/bin/demogo-mcp.js
node --check mcp/lib/core.js
```

已通过：

```powershell
node scripts/run-real-project-fixtures.mjs
```

## 打包结果

已生成并检查：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.2.zip
dist\demogo-ops-scripts-v0.2.2.zip
dist\demogo-cli-v0.2.2.zip
dist\demogo-mcp-v0.2.2.zip
dist\demogo-codex-skill-v0.2.2.zip
```

## 剩余风险

- `npx demogo` 仍不是当前默认能力，必须等 CLI 正式发布到 npm 后才能作为稳定入口。
- 真实项目测试集当前是样本生成与基础验证，后续可以扩展成自动调用本地测试服务逐个发布。
- CLI 本地安装需要用户或 AI 工具执行一次 `npm install -g .`，这一步仍有使用门槛。

## 是否阻塞部署

不阻塞部署。
