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
- v0.9.5：完善部署闭环 + 表单收集 + 内容安全审查 + 用户反馈系统
- v0.9.6：架构清理 + 路由模块化（接入 7 个路由文件） + 中文编码修复 + 版本统一
- v0.9.7：服务模块提取（21 个 service） + CLI/CLI-MCP 共享代码合并
- v0.9.8：demos/admin 路由重构 + 中间件体系完善
- v0.9.9：部署任务服务 + 项目检查 v3
- v0.9.10：失败诊断增强 + 表单收集系统
- v0.9.11：内容安全审查 + 用户反馈系统
- v0.9.12：Node.js 运行时 + MySQL 试用数据库 + schema.sql 自动部署
- v0.9.13：外部后端连接（Supabase）+ Demo 访问追踪
- v0.9.14：试用分析服务 + Demo 到期管理
- v0.9.15：Agent Token 管理 + API 版本中间件
- v0.9.16：管理后台完善 + 内容审查管理 + 反馈管理
- v0.9.17：build-service 单元测试 + 部署门禁脚本
- v0.9.18：数据库迁移框架 + pre-deploy 门禁
- v0.9.19：前端组件拆分 + TypeScript 类型完善
- v0.9.20：pre-deploy-check 升级为 10 项检查 + 版本同步脚本
- v0.9.21：5 文件中文编码修复 + server.js 死代码清理（255 行） + config 版本号定位修复
- v0.9.22：archive-analyzer.js 正确导入（50 函数）+ server.js -491 行 + build-service 独立导出 + 根目录遗留清理

## 后续方向

- 继续增强 Node + MySQL 主链路
- Redis/MongoDB/PostgreSQL 自动托管
- Python/Go/Java 后端托管
- 多服务编排
- CDN 和大规模性能优化

Node + MySQL 主链路稳定后逐步扩展。

