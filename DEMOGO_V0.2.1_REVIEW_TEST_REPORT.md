# DemoGo v0.2.1 审查与测试报告

## 结论

v0.2.1 已完成开发、审查、测试和打包，可以进入部署准备。

本版定位是 v0.2.0 真实 AI 发布试用后的修正版，重点解决：

- AI 发布项目名称过泛。
- 自动表单识别误判。
- 发布来源不可追踪。
- CLI 本机配置体验不足。

## 已完成改动

- 项目名称生成优化：优先使用非泛化用户命名、页面标题、页面主标题，避免默认生成 `demogo`、`demo`、`project` 这类项目名。
- AI 发布来源记录：支持区分网页上传、DemoGo CLI、DemoGo MCP、直接 Agent API。
- 用户端和管理后台项目详情展示“发布方式”。
- 自动表单识别收窄：价格计算器、模型价格、费用开关等控件不会自动开启表单收集。
- 报名、预约、留资、留言类表单仍会自动开启 DemoGo 表单收集。
- CLI 升级到 `0.2.1`，新增 `demogo doctor` 和 `demogo config clear`。
- MCP 升级到 `0.2.1`，调用发布接口时标识来源为 `mcp`。
- 登录失败增加内存级限速，降低暴力尝试风险。
- 版本、部署脚本、上传脚本、打包脚本、Codex Skill 文档已同步到 `0.2.1`。
- AI 发布页已改为“口令长期复用”逻辑，复制发布指令不再要求每次重置 Token。
- 支持单个 HTML 文件直接发布，例如 `landing-page.html`、`home.html`，不要求用户手动改成 `index.html`。
- CLI/MCP 打包单个 HTML 文件时会自动作为首页发布。
- AI 指令已明确：优先 CLI；CLI 不可用时说明原因，再使用 MCP 或 Agent API 兜底。

## 审查结果

### 第一轮：后端发布链路

已检查：

- `/api/deploy`
- `/api/agent/deploy`
- 项目检测
- 内容安全检查
- 额度检查
- 自动表单托管
- 发布事件
- 审计日志
- 项目下线、恢复、删除、更新

结果：

- 通过。
- 新增项目名逻辑不会绕过检测、额度和内容安全。
- Agent 发布仍复用原发布主链路。
- 内容安全仍是发布前强制检查。

### 第二轮：AI 工具链路

已检查：

- CLI 打包与发布请求。
- MCP 发布请求。
- Codex Skill 说明。
- Agent API 来源识别。

结果：

- 通过。
- CLI 标识来源为 `cli`。
- MCP 标识来源为 `mcp`。
- 直接 API 默认为 `agent_api`。

### 第三轮：表单识别

已检查：

- 报名/留言表单。
- 价格计算器。
- 费用开关。
- 模型价格字段。
- 本地 API 调用提示。
- 单个 HTML 页面直接发布。

结果：

- 通过。
- 报名/留言仍自动开启表单收集。
- 计算器类控件只作为“填写控件”提示，不自动托管。
- `landing-page.html` 这类单 HTML 页面可作为首页生成链接。

## 测试结果

### 自动化检查

通过：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

通过：

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

### CLI / MCP 测试

通过：

```powershell
node --check cli/bin/demogo.js
node --check cli/lib/core.js
node cli/bin/demogo.js --version
node cli/bin/demogo.js config show
node cli/bin/demogo.js config clear
```

通过：

```powershell
node --check mcp/bin/demogo-mcp.js
node --check mcp/lib/core.js
```

MCP 初始化返回 `0.2.1`，工具列表正常。

### 烟雾测试覆盖

已覆盖：

- 注册登录。
- 登录失败限速。
- 普通网页发布。
- 项目更新。
- SPA 深层路由刷新。
- `.zip`、`.tar.gz`、`.tgz`。
- `dist`、`build`、`out`。
- 源码项目自动构建。
- 无 build 命令源码项目拦截。
- 后端/SSR 项目明确不支持。
- 敏感文件拦截。
- 内容安全拦截。
- 自动表单托管。
- 价格计算器不自动托管。
- 单 HTML 文件直接发布，且泛化项目名会被页面标题替代。
- Agent 发布 API。
- CLI 来源识别。
- 后台概览、升级申请、反馈、内容检查记录。

## 打包结果

已生成：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.1.zip
dist\demogo-ops-scripts-v0.2.1.zip
dist\demogo-cli-v0.2.1.zip
dist\demogo-mcp-v0.2.1.zip
dist\demogo-codex-skill-v0.2.1.zip
```

已检查：

- server 包包含 `package.json`、`src/server.js`、`src/config.js`、`src/services/form-service.js`。
- ops 包包含 `server-deploy-demogo-v0.2.1.sh`、`server-rollback-demogo-v0.2.1.sh`、`server-verify-demogo.sh`、`server-clean-demogo-data.sh`、`upload-demogo-packages.ps1`。

## 剩余风险

- `npx demogo` 要真正可用，还需要后续把 CLI 正式发布到 npm 或提供稳定安装方式。本版本只保证交付包里的 CLI 能工作。
- 源码项目构建后的页面标题如果和源码标题不同，本版项目名可能仍来自构建前标题。当前已解决 `demogo/demo/project` 这类泛化名称问题。
- 登录失败限速是内存级，服务重启后计数会清空。MVP 阶段可接受，后续可改为数据库或 Redis。

## 是否阻塞部署

不阻塞部署。
