# iOS T5/T6 CSS+JSX 重构 — 完成报告

## 提交信息
- **Commit**: `244e28c`
- **Branch**: `main`
- **文件**: 25 files changed, +725/-281 lines
- **删除**: `web/src/pages/dashboard/WorkspaceHero.tsx`

## 做了什么

### 1. CSS 补充（dashboard.css +598 行）
新增了所有缺失的 iOS 极简风格类：
- `section-mini-head` — 分节标题
- `hosting-architecture` / `.compact` — 托管架构面板
- `runtime-help-box` / `runtime-log-panel` / `runtime-env-grid` — 运行时组件
- `risk-panel` / `publish-success` — 风险/发布面板
- `deploy-step-dot` — 部署进度步骤点
- `project-profile-panel` / `project-assessment-panel` — 项目详情面板
- `subdomain-request-card` / `subdomain-request-status` — 子域名请求
- `upgrade-banner` / `settings-list` / `review-resolution-panel` — 管理后台组件

### 2. WorkspaceHero → OverviewView 合并
- 把 WorkspaceHero 的 welcome greeting（头像+问候+配额信息）嵌入 OverviewView 的 `ws-welcome`
- onboarding banner（新用户引导）放在 `ws-stats` 之前
- 删除 WorkspaceHero.tsx，所有引用已清理

### 3. 组件重构
- **DemoList.tsx**: `project-item-*` → `demo-*` 系列（demo-list, demo-row, demo-status, demo-dot 等）
- **ProjectsView.tsx**: `projects-split` → `view-stack`
- **Admin 文件**: 所有 `request-main` → `panel`

## 验证结果
- ✅ tsc --noEmit: 0 errors
- ✅ vite build: 236ms
- ✅ WorkspaceHero 无残留引用
