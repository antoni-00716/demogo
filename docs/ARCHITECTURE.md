# 技术架构

## 总体结构

```
web/                 React + Vite 前端
server/              Node.js + Express 后端
cli/                 DemoGo CLI（npm @demogo-cn/cli）
mcp/                 DemoGo MCP Server
codex-skill/         Codex Skill
codex-plugin/        Codex Plugin
claude-code-plugin/  Claude Code Plugin
scripts/             打包、上传、部署、清理脚本
VERSION              单一版本源
```

## 线上结构

- Nginx 负责 HTTPS、静态站点、/d/ 和 /api/ 路由
- DemoGo Server 由 systemd 管理，监听 3001
- 用户 Demo 发布目录：/var/www/demogo-preview/d
- 数据目录：/var/lib/demogo/data
- MySQL 用于平台数据和试用数据库
- Docker 用于 Node.js 试用运行环境

## 后端模块结构

```
server/src/
├── server.js             入口：Express 初始化、中间件注册、路由挂载
├── config.js             配置与环境变量
├── middleware/
│   ├── auth.js           认证
│   ├── security.js       安全头（X-Content-Type-Options 等）
│   ├── rate-limiter.js   API 限流
│   ├── request-id.js     请求 ID 注入
│   └── upload.js         文件上传处理
├── routes/               10 个路由文件（v0.9.6 已接入 7 个）
├── services/             15 个服务文件
├── lib/                  工具函数（密码、会话、限流、日志）
├── db/                   MySQL 存储层
├── email/
│   └── mailer.js         邮件发送
└── tests/                烟雾测试、集成测试、单元测试
```

## 版本源

根目录 VERSION 是单一来源，仍需同步：
- server/package.json
- cli/package.json
- mcp/package.json

## 已知技术债

- CLI (`cli/lib/core.js`) 与 MCP (`mcp/lib/core.js`) 存在 30 个完全相同的函数，需提取为共享模块
- server.js 仍包含大量内联辅助函数（~6600 行），需逐步拆分到对应服务模块
- 前端 UserDashboard (2582行) 和 AdminDashboard (1937行) 组件需拆分