# DemoGo v0.2.6 计划：npm CLI 正式接入版

## 版本目标

v0.2.6 的目标是把已经发布到 npm 的 DemoGo CLI 正式接入平台说明、用户端 AI 指令和 Codex Skill，让 AI 工具优先通过 CLI 生成试用链接。

## 本版范围

1. npm CLI 优先
   - `@demogo-cn/cli@0.2.5` 已发布到 npm。
   - 用户端和 Codex Skill 优先使用 `npx --yes @demogo-cn/cli`。
   - 本地已经安装 CLI 时仍可使用 `demogo deploy`。

2. 兜底边界
   - CLI 不可用时，AI 工具必须说明原因。
   - MCP 或 Agent API 只作为兜底。
   - API 兜底成功时，不能说成 CLI 发布成功。

3. 版本和交付
   - 后端、CLI、MCP 版本升级到 `0.2.6`。
   - 生成 v0.2.6 服务端、运维脚本、CLI、MCP、Codex Skill 包。

## 验收标准

- `/api/health` 返回 `0.2.6`。
- `npx --yes @demogo-cn/cli --version` 可用。
- `npx --yes @demogo-cn/cli doctor --api https://demogo.cn` 可连通平台。
- 用户端 AI 发布页显示 npx 优先指令。
- Codex Skill 使用 `npx --yes @demogo-cn/cli`。
- 后端检查、烟雾测试、前端 lint、前端生产构建通过。
