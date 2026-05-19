# DemoGo v0.2.0 审查与测试报告

日期：2026-05-18

## 版本结论

v0.2.0 当前已完成本地开发、审查、测试和打包，可以进入部署准备阶段。

本版本定位是“AI 工具一键发布正式体验版”：让用户在 Codex、Cursor、Claude Code、Hammers Agent、OpenCode 等 AI 编程工具中，把当前项目发布到 DemoGo 并获得可分享的试用链接。

## 本版完成内容

1. AI 发布链路正式化
   - CLI、MCP、Codex Skill 统一升级到 `0.2.0`。
   - CLI 不再内置固定服务器 IP，必须配置当前 DemoGo 平台地址或使用环境变量。
   - CLI 支持配置、查看配置、打包当前项目、调用 Agent 发布 API。
   - MCP 支持项目检查、生成试用链接、查看配置。
   - Codex Skill 明确当前支持与不支持范围，不使用不存在的 `demogo inspect` 命令。

2. 用户端 AI 发布页优化
   - 用户端提供“让 AI 帮你发布到 DemoGo”的说明。
   - 提供给 Codex、Cursor / Claude Code、其他 AI Agent 的三类可复制指令。
   - 指令中自动使用当前 DemoGo 平台地址，不再固定服务器 IP。
   - 明确当前适合发布和暂不支持的项目类型。

3. 后台试用观察指标
   - 管理后台概览增加 AI 发布次数、发布成功数、发布失败数。
   - 后端增加发布失败原因归类：内容、额度、不支持、构建、其他。
   - 烟雾测试已覆盖 Agent 发布后后台 AI 发布指标更新。

4. 打包与部署链路
   - 服务端版本升级到 `0.2.0`。
   - 新增 `server-deploy-demogo-v0.2.0.sh`。
   - 新增 `server-rollback-demogo-v0.2.0.sh`。
   - 打包、上传脚本已同步 v0.2.0 包名。

## 审查结果

### 第一轮：后端与发布主链路

已检查：
- `/api/agent/deploy` 继续复用现有发布核心链路。
- 内容检查、项目检测、额度检查没有被 CLI/MCP 绕过。
- 后台概览指标读取审计记录和发布事件，不新增复杂数据结构。
- 服务端版本、配置、打包内容均已同步到 `0.2.0`。

结论：通过。

### 第二轮：CLI / MCP / Codex Skill

已检查：
- CLI `--version` 返回 `0.2.0`。
- CLI 未配置平台地址时，会明确提示用户先配置 DemoGo 平台地址。
- CLI 可以使用临时目录完成配置、扫描、打包。
- MCP `initialize` 返回 `0.2.0`。
- MCP `tools/list` 包含检查、发布、配置三个工具。
- MCP `demogo_get_config` 能返回是否配置平台地址和发布口令。
- Codex Skill 明确支持范围、失败处理、内容检查不可绕过。

结论：通过。

### 第三轮：前端与用户体验

已检查：
- 用户端 AI 发布页文案更接近真实使用场景。
- 用户可复制给不同 AI 工具的指令。
- 指令不再使用固定 IP。
- 前端 lint 与生产构建通过。

结论：通过。

### 第四轮：部署包与版本一致性

已检查：
- `demogo-server-v0.2.0.zip` 内 `package.json` 和 `src/config.js` 均为 `0.2.0`。
- `demogo-cli-v0.2.0.zip` 内 CLI 版本为 `0.2.0`。
- `demogo-mcp-v0.2.0.zip` 内 MCP 版本为 `0.2.0`。
- 运维包包含 v0.2.0 部署和回滚脚本。

结论：通过。

### 第五轮：边界与风险

已确认：
- 本版没有新增后端托管、数据库托管、支付、订单、登录系统托管。
- 不支持能力没有被包装成“实验能力”。
- AI 发布仍会被内容安全检查拦截。
- CLI 去掉默认 IP 后，用户必须从工作台复制当前平台地址，这是正确方向。

结论：通过。

## 测试结果

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

结果：通过。

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

结果：通过。

CLI / MCP 检查：

```powershell
node cli/bin/demogo.js --version
node cli/bin/demogo.js config show
node --check cli/bin/demogo.js
node --check cli/lib/core.js
node --check mcp/bin/demogo-mcp.js
node --check mcp/lib/core.js
```

结果：通过。

MCP 协议测试：
- `initialize` 返回 `0.2.0`。
- `tools/list` 返回三个工具。
- `demogo_get_config` 返回配置状态。

结果：通过。

CLI 临时项目打包测试：
- 临时配置 DemoGo 地址和发布口令。
- 临时静态项目可以扫描、打包。
- 使用假地址时连接失败，错误提示清楚。

结果：通过。

## 已生成交付包

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.0.zip
dist\demogo-ops-scripts-v0.2.0.zip
dist\demogo-cli-v0.2.0.zip
dist\demogo-mcp-v0.2.0.zip
dist\demogo-codex-skill-v0.2.0.zip
```

## 发现并已修正的小问题

1. MCP 工具定义里把 `token` 设成必填，但实际也支持环境变量读取。
   - 处理：已改为参数非必填。

2. CLI `config show` 之前只显示本地配置里的 token，不显示环境变量里的 token。
   - 处理：已改为同时识别 `DEMOGO_AGENT_TOKEN`。

## 后续建议

1. 部署 v0.2.0 后，重点用真实 AI 工具做端到端试用。
2. 试用场景至少覆盖 Codex、Cursor、Claude Code 三类工具。
3. 下一版建议重点收集失败原因，优化 AI 工具失败后的自动修复提示。
4. 暂不建议立刻做后端托管，先验证 AI 发布链路是否能带来真实使用。
