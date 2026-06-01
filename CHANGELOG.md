
## v0.9.25 (2026-06-01)

### Changed
- **import 语句归位**：将 v0.9.23–v0.9.24 应急添加时散落在代码中部的 2 条 import 移至文件顶部，恢复代码规范

---

## v0.9.24 (2026-06-01)

### Fixed
- **系统性缺失导入修复**：补充 `admin-helpers.js`（`createRuntimeConfigStatus`、`publicRuntimeEnv`、`runtimeEnvForDemo`）、`deploy-helpers.js`（`deploySourceLabel`、`normalizeDeploySource`）、`project-utils.js`（`isGenericProjectName`、`slugify`）的导入
- **集成测试 tar.gz 部署通过**：修复了部署路径上级联缺失导入导致的系列 ReferenceError

### Known Issues
- 集成测试 zip 部署受套餐配额限制（Free 1 个在线项目），属测试环境问题

---

## v0.9.23 (2026-06-01)

### Fixed
- **中间件顺序修复**：`express.json()` / `cookieParser()` / CSRF 等中间件移至路由注册之前，修复 POST 请求 `req.body` 为空导致注册/登录 400 错误
- **ExpiryBadge Lint 修复**：拆分 `ExpiryBadge.tsx`，将 `getDemoExpiryStatus` 和 `ExpiryStatus` 移入独立的 `ExpiryUtils.tsx`
- **缺失导入修复**：补充 `detectDeploySource`、`deploySourceLabel`、`cleanProjectName`、`isGenericProjectName`、`slugify` 等函数的 import

### Known Issues
- 集成测试 tar.gz 部署流程触发级联缺失导入（`createRuntimeConfigStatus` 等），需在 v0.9.24 系统性扫描修复

---
## v0.9.22 (2026-06-01)

### Changed
- **server.js 运行时检测函数迁移**：8 个运行时函数迁移到 `runtime-service.js`，server.js -186 行
- **server.js 归档分析函数迁移**：导入 archive-analyzer.js 的 50 个导出函数，删除 44 个重复内联定义，server.js -443 行
- **build-service.js 独立导出**：提取 `formatBytes` 和 `stripBom` 为模块级导出，修复 `routes/demos.js` 导入失败导致服务器无法启动的问题

### Added
- **project-classifier-service 单元测试**：11 个测试用例

### Removed
- **根目录遗留文件清理**：归档 8 个临时脚本，移除 `.workbuddy/`、`artifacts/`

### Summary
- server.js: 4131 → 3510 行（-621 行，-15%），测试: 120 → 131

---
## v0.9.21 (2026-06-01)

### Fixed
- **中文乱码修复**：修复 5 个文件中因编码问题导致的中文内容丢失
  - `server/src/services/build-service.js`：修复构建错误提示中文
  - `server/src/services/failure-diagnosis-service.js`：修复失败诊断中文提示
  - `server/src/lib/inspection-builder.js`：修复状态标签中文
  - `server/src/server.js`：修复到期提醒日志中文
  - `CHANGELOG.md`：重写全部中文内容
- 确认 58 个文件中文编码正常，前期"系统性乱码"判断为 PowerShell Get-Content 显示问题

---

## v0.9.20 (2026-06-01)

### Changed
- **pre-deploy-check.ps1 从 9 项升级为 10 项检查**
  - 新增 TypeScript 检查：`npx tsc --noEmit`
  - 新增版本号一致性检查：5 个文件（VERSION + server/cli/mcp/web）
  - 提示修复命令：`node scripts/sync-version.js`
- **AGENTS.md 文档更新**
  - 测试数量从 95 更新到 120
  - 服务数量从 15 更新到 21
  - 部署前检查项更新为 10 项
  - 新增架构摘要说明

### Architecture Summary (v0.9.20)
- server.js: 4383 行（-39.2% vs v0.9.7）
- 21 个服务模块 + 10 个路由模块
- 120 个测试全通过，0 失败
- UserDashboard 2302 行 + AdminDashboard 402 行
- 28 个前端组件文件
- P2 商业化功能完备（分析面板 + 到期提醒）

---

## v0.9.19 (2026-06-01)

### Added
- **版本号同步工具** `scripts/sync-version.js`
  - 一键同步 `VERSION` 文件到 server/cli/mcp/web 四个 `package.json`
  - 支持 `node scripts/sync-version.js` 或 `npm run sync-version`（在 server/ 目录下）
  - 写入前自动备份原文件，防止意外覆盖

### Changed
- 确认 `runtimeProcesses` 持久化已在 `runtime-service.js` 中实现
- 服务重启后可恢复运行中的 Demo 实例

### Fixed
- `runtime-service.js` 中文乱码修复（运行器提示信息）
- `build-service.js` 中文乱码修复

---

## v0.9.18 (2026-06-01)

### Changed
- **AdminDashboard.tsx 组件拆分**：将 24 个视图组件从 AdminDashboard.tsx（1714 行）提取到 `AdminPanels.tsx`
  - AdminDashboard.tsx 缩减至 402 行（-79.2%）
  - 包含：AdminSidebar、AdminOverviewView、AdminTrialFunnel、AdminTaskBoard、AdminDemoList、AdminUsers 等

---

## v0.9.17 (2026-06-01)

### Added
- **build-service 单元测试**：8 个测试覆盖 formatBytes、stripBom、explainBuildError、sanitizeBuildEnv、commandAvailable

### Fixed
- 确认 docs/ 目录文件为 UTF-8 编码

---

## v0.9.16 (2026-06-01)

### Added
- **Demo 到期提醒**：`ExpiryBadge.tsx` 前端组件，显示 Demo 到期倒计时
- 复用已有 `demo-expiration-service.js` 后端服务

---

## v0.9.15 (2026-06-01)

### Added
- **Demo 访问分析面板**：`GET /api/demos/:id/analytics` + `AnalyticsPanel.tsx`
  - 展示每个 Demo 的访问量、访问趋势、设备/浏览器分布
  - 面向非技术用户：显示"被看了多少次 / 多少人看过"

### Fixed
- **关键 Bug**：demos 路由缺少 `createDeploymentJob`/`runDeploymentJob`/`publicDeploymentJob` 依赖注入

---

## v0.9.14 (2026-06-01)

### Changed
- **UserDashboard.tsx 组件拆分**：提取 4 个组件
  - `FeedbackPanel.tsx`：用户反馈面板
  - `FailureDiagnosisPanel.tsx`：失败诊断面板
  - `PlanRequestsTable.tsx`：套餐升级请求表
  - `DeployHistory.tsx`：部署历史记录

---

## v0.9.13 (2026-06-01)

### Added
- **部署任务 CRUD 测试**：17 个测试覆盖 deployment-job 全生命周期

---

## v0.9.12 (2026-06-01)

### Changed
- **build-service.js 创建**：从 server.js 提取 build/analytics/tracking 相关函数
  - 迁移函数：buildNodeProject、detectBuildAndNormalizeOutput、findPublishableOutput 等
  - 工具函数：formatBytes、stripBom、explainBuildError、sanitizeBuildEnv、commandAvailable

---

## v0.9.11 (2026-06-01)

### Changed
- **deployment-job-service.js 创建**：从 server.js 提取部署任务 CRUD 和执行逻辑

---

## v0.9.10 (2026-06-01)

### Fixed
- 路由注册 bug 修复
- 多个集成测试问题修复

---

## v0.9.7 (2026-05-31)

### Changed
- 路由架构清理：所有路由迁移到 `routes/` 目录，统一使用 `registerXxxRoutes(app, deps)` 模式





