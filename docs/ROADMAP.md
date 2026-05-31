# 路线图

## 方向

DemoGo 的目标是具备部署完整应用的能力。如果 DemoGo 能稳定部署包含前端、后端、数据库、管理后台的完整应用，就说明试用部署能力基本成型。

## 能力主线

- 内置试用环境：DemoGo 提供 Node.js 单服务和 MySQL 试用数据库
- 外部后端连接：识别并连接用户自己的 Supabase/Postgres

Supabase 路线原则：先连接用户自己的，不托管、不自动创建。

## 已发布版本摘要

- v0.5.0：项目识别 2.0（框架、数据库、运行配置线索）
- v0.5.1：完整应用运行闭环（Node.js + MySQL + schema.sql）
- v0.5.2：失败诊断 2.0（统一诊断对象，覆盖所有失败场景）
- v0.5.3：Supabase 外部后端连接闭环
- v0.6.0：复杂应用部署验收（applicationReadiness）
- v0.7.0：试用交付报告（技术状态 → 产品交付判断）
- v0.8.0：AI 编程工具插件化集成（Codex Plugin）
- v0.9.0：AI 工具接入闭环（Claude Code Plugin + MCP doctor）
- v0.9.4：技术审计与商业化就绪修复

## 后续方向

- 继续增强 Node + MySQL 主链路
- Redis/MongoDB/PostgreSQL 自动托管
- Python/Go/Java 后端托管
- 多服务编排
- CDN 和大规模性能优化

Node + MySQL 主链路稳定后逐步扩展。
