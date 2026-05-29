# 技术架构

## 总体结构

```text
web/                 React + Vite 前端
server/              Node.js + Express 后端
cli/                 DemoGo CLI
mcp/                 DemoGo MCP Server
codex-skill/         Codex Skill
codex-plugin/        Codex Plugin
claude-code-plugin/  Claude Code Plugin
scripts/             打包、上传、部署、清理脚本
docs/                当前文档
VERSION              单一版本源
```

## 线上结构

- Nginx 负责 HTTPS、静态站点、`/d/` 和 `/api/` 路由。
- DemoGo Server 由 systemd 管理，监听 `3001`。
- 用户 Demo 发布目录：`/var/www/demogo-preview/d`。
- 数据目录：`/var/lib/demogo/data`。
- 上传临时目录：`/var/lib/demogo/uploads`。
- MySQL 用于平台数据和试用数据库能力。
- Docker 用于 Node.js 单服务试用运行环境。

## 核心后端模块

- `server/src/server.js`: 当前主服务入口，仍包含大量路由和业务编排。
- `server/src/config.js`: 配置和版本读取。
- `server/src/db/mysql-store.js`: MySQL 兼容存储层。
- `server/src/services/project-classifier-service.js`: 项目类型识别。
- `server/src/services/hosting-architecture-service.js`: 托管能力与架构描述。
- `server/src/services/runtime-service.js`: Node.js 运行环境。
- `server/src/services/demo-database-service.js`: 试用数据库。
- `server/src/services/content-review-service.js`: 内容安全检查。
- `server/src/services/failure-diagnosis-service.js`: 失败诊断分类、证据、处理动作和 AI 修复提示。

## 版本源

根目录 `VERSION` 是当前开发版本的单一来源。

仍需同步的地方：

- `server/package.json`
- `cli/package.json`
- `mcp/package.json`

原因是 npm/package-lock 需要明确版本字段，不能完全省略。

## 下一步架构治理

- 逐步拆分 `server.js`，先拆 auth、agent、demos、admin 路由。
- 运行时状态持久化，避免服务重启后丢失实例认知。
- 核心数据进一步稳定落 MySQL。
- 继续增强结构化日志和失败诊断覆盖范围。
