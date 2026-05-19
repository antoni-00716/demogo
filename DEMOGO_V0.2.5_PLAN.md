# DemoGo v0.2.5 计划：AI 发布链路真实可用版

## 版本目标

v0.2.5 解决真实 AI 工具发布过程中暴露的问题，让 Codex、Cursor、Claude Code 等工具能更顺滑地把项目发布到 DemoGo。

本版本不扩展为后端托管平台，不新增数据库托管、支付、登录系统托管、WebSocket 或 SSR 运行能力。

## 本版范围

1. Agent API 字段兼容
   - `/api/agent/deploy`、网页上传、检测、更新和异步任务统一兼容 `project`、`file`、`package` 三种上传字段。
   - 推荐字段仍是 `project`。
   - 错误字段返回可理解的 400 提示，不再让 AI 工具看到 `Unexpected field` 这类无意义错误。

2. CLI 真实可用性说明
   - CLI 版本升级到 `0.2.5`。
   - 交付包继续支持本地安装后的 `demogo deploy`。
   - npm 发布包名使用 `@demogo-cn/cli`，支持 `npx @demogo-cn/cli deploy`。
   - CLI 不可用时，AI 工具应说明原因，再使用 MCP 或 Agent API 兜底。

3. MCP / Codex Skill 同步
   - MCP 版本升级到 `0.2.5`。
   - Codex Skill 文案明确 API fallback 的边界。
   - API 兜底成功时，要说明这是 API 兜底，不说成 CLI 发布成功。

4. 用户端 AI 发布说明优化
   - 工作台明确说明发布口令可长期复用。
   - 只有口令泄露、失效或主动更换时才需要重置。
   - 用户复制给 AI 的指令补充 Agent API multipart 字段要求。

5. 交付脚本更新
   - 生成 `v0.2.5` 服务端、运维脚本、CLI、MCP、Codex Skill 包。
   - 部署脚本、回滚脚本、上传脚本和清理脚本同步到 `v0.2.5`。

## 验收标准

- `/api/health` 返回 `0.2.5`。
- 后端检查和烟雾测试通过。
- 前端 lint 和生产构建通过。
- Agent API 使用 `project`、`file`、`package` 字段都能发布成功。
- 错误上传字段返回 400 和可理解提示。
- 用户端 AI 发布说明使用 `npx @demogo-cn/cli`，不再暗示被占用的 `npx demogo` 当前可用。
- 打包后存在：
  - `dist/demogo-site-preview.zip`
  - `dist/demogo-server-v0.2.5.zip`
  - `dist/demogo-ops-scripts-v0.2.5.zip`
  - `dist/demogo-cli-v0.2.5.zip`
  - `dist/demogo-mcp-v0.2.5.zip`
  - `dist/demogo-codex-skill-v0.2.5.zip`

## 部署前提醒

如果 AI 发布口令曾经出现在聊天记录、日志、截图或公开仓库中，应立即在 DemoGo 用户端重置。重置后旧口令失效，新的口令只展示一次。
