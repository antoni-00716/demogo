# DemoGo v0.2.3 审查与测试报告

日期：2026-05-19

## 结论

v0.2.3 合并版已完成本地审查、自动化测试、真实项目样本验证和打包前检查。

当前结论：可以进入部署前上传与服务器验证流程。

## 本版完成内容

- 后端版本升级到 `0.2.3`。
- CLI、MCP、Codex Skill 版本升级到 `0.2.3`。
- 新增发布任务接口：
  - `POST /api/deployment-jobs`
  - `GET /api/deployment-jobs/:id`
  - `POST /api/demos/:id/deployment-jobs`
- 用户端创建项目和更新项目改为任务式发布，页面可持续展示处理进度。
- 原同步接口继续保留：
  - `POST /api/deploy`
  - `POST /api/agent/deploy`
  - `POST /api/demos/:id/update`
- 异步任务复用原发布核心链路，没有绕过内容安全、额度、表单识别和发布记录。
- MySQL 兼容层补充 `deployment-jobs.json` 的读写支持。
- v0.2.3 部署、回滚、上传、打包脚本已更新。

## 审查结果

### 第一轮：后端发布链路

检查范围：

- 项目检测。
- 内容安全检查。
- 套餐额度。
- 创建发布。
- 更新发布。
- 表单自动识别。
- 发布事件记录。
- 异步任务保存和查询。

结果：

- 异步发布没有重写一套发布逻辑，而是复用 `performCreateDeployment` 和 `performUpdateDeployment`。
- 同步接口继续兼容，AI 发布链路不会被本版破坏。
- 发现烟雾测试中异步任务测试放在免费套餐阶段，会被额度限制误伤，已调整到 Pro 套餐升级后执行。

### 第二轮：前端用户体验

检查范围：

- 用户端上传发布。
- 用户端更新项目。
- 发布步骤展示。
- 成功链接展示。
- 失败提示展示。

结果：

- 上传后会创建任务并轮询任务状态。
- 任务成功后会刷新项目列表并展示最新链接。
- 任务失败后会展示检查报告、步骤状态和错误信息。
- 保留超时提示，避免用户一直等待无反馈。

### 第三轮：CLI/MCP/Skill 兼容性

检查范围：

- CLI 版本。
- CLI help。
- MCP 语法。
- Codex Skill 文案版本。

结果：

- `demogo --version` 返回 `0.2.3`。
- CLI help 已显示 v0.2.3。
- MCP 基础语法检查通过。
- Skill 文档版本已更新。

### 第四轮：部署包风险

检查范围：

- 打包脚本。
- 上传脚本。
- 服务器部署脚本。
- 服务器回滚脚本。
- 版本号一致性。

结果：

- v0.2.3 脚本路径和包名已更新。
- 历史 v0.2.2 脚本仍保留，这是正常历史文件，不应删除。

### 第五轮：数据存储风险

检查范围：

- JSON 存储。
- MySQL 兼容层。
- 审计日志。
- 发布任务记录。

结果：

- JSON 环境使用 `deployment-jobs.json`。
- MySQL 线上兼容层短期复用 `audit_logs` 表保存任务记录。
- 已避免普通审计日志写入时误删任务记录。

风险提示：

- 复用 `audit_logs` 表是 MVP 阶段的短期方案。后续任务量变大，应独立建 `deployment_jobs` 表。
- 当前任务执行仍在 API 进程内完成，不是独立 Worker。当前够用，但不是长期架构。

## 测试结果

### 自动化检查

已通过：

```text
server npm run check
server npm run test:smoke
web npm run lint
web npm run build
```

### CLI/MCP 检查

已通过：

```text
node --check cli/bin/demogo.js
node --check cli/lib/core.js
node cli/bin/demogo.js --version
node cli/bin/demogo.js help
node --check mcp/bin/demogo-mcp.js
node --check mcp/lib/core.js
```

### 真实项目样本

已生成并验证样本清单：

- 纯 `index.html`。
- 单个 `landing-page.html`。
- `dist/index.html`。
- `build/index.html`。
- 报名页表单。
- 价格计算器。
- React/Vite 源码。
- Vue/Vite 源码。
- 缺少 build 命令源码。
- Node 后端项目。
- Next SSR 项目。
- 包含 `.env` 的项目。
- 内容风险项目。

样本生成命令已通过：

```text
node scripts/run-real-project-fixtures.mjs
```

## 当前不阻塞部署的问题

1. 异步任务不是独立 Worker。
   - 影响：复杂构建或并发较高时，API 进程压力会增加。
   - 建议：后续 v0.3.0 引入独立任务表和 Worker。
   - 是否阻塞：不阻塞当前 MVP。

2. MySQL 任务记录复用审计日志表。
   - 影响：短期可用，长期查询和运维不够清晰。
   - 建议：后续新增 `deployment_jobs` 表。
   - 是否阻塞：不阻塞当前部署。

3. AI 发布接口仍是同步接口。
   - 影响：AI 发布大项目时仍可能等待较久。
   - 建议：下一阶段扩展 Agent 任务接口，但不要破坏现有 API。
   - 是否阻塞：不阻塞，因为当前 CLI/MCP 依赖同步接口保持兼容。

## 部署前标准

部署前应确认生成以下文件：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.3.zip
dist\demogo-ops-scripts-v0.2.3.zip
dist\demogo-cli-v0.2.3.zip
dist\demogo-mcp-v0.2.3.zip
dist\demogo-codex-skill-v0.2.3.zip
```

服务器部署后必须验证：

- `/api/health` 返回 `0.2.3`。
- Nginx `/api/health` 返回 `0.2.3`。
- 首页、登录页、用户端返回 200。
- 管理后台返回 401 属于正常情况。
- `demogo-server.service` 为 `active (running)`。

