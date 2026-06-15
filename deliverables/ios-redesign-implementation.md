# iOS 设计改版实施总结

## 改动范围
除首页外，所有 Dashboard/Admin 内部页面按 iOS 设计方案改版。

## 实施情况

### Dashboard 侧
| 页面 | 改动内容 | 状态 |
|------|---------|------|
| 总览 | 保持不动 | ✅ |
| **我的作品 (ProjectsView)** | DemoList 从行布局改为 `.project-grid` 卡片网格，使用 `.project-card` 卡片样式 | ✅ |
| **上传发布 (UploadPanel)** | DropZone 改为 dashed border iOS 样式，添加 `upload-zone` 类名，添加 `form-label` 标签 + `form-input` + `form-select` 下拉框，添加预览按钮（disabled） | ✅ |
| **AI 发布 (AgentPublishPanel)** | 添加 iOS 风格的 AI 提示词卡片、`ai-textarea` 输入框、"生成并发布"按钮、"最近 AI 生成作品"列表 | ✅ |
| **发布记录 (DeployHistory)** | 添加 `status-badge` 状态标签、调整列顺序 | ✅ |
| **反馈收集 (FeedbackCollection)** | 新建组件，实现筛选按钮行 `feedback-filters`、`feedback-item` 卡片（含 unread 绿边框、badge 类型标签、未读红点） | ✅ |
| **套餐额度 (PlanView)** | 重构为 `plan-grid` 双列套餐卡（免费版+专业版），添加 `usage-bar` 用量进度条（warn/full 变体），保持升级表单功能 | ✅ |

### Admin 侧
| 页面 | 改动内容 | 状态 |
|------|---------|------|
| 侧边栏 | 保持不动（已对齐） | ✅ |
| **用户管理 (AdminUsers)** | 添加 stats-grid 统计行（总用户/专业版/入门版/已禁用）、搜索框 | ✅ |
| **Demo 管理 (AdminDemosView)** | 添加 stats-grid 统计行（全部/在线/审核中/已过期）、筛选按钮 | ✅ |
| **内容审核 (AdminContentReviews)** | 添加筛选按钮、risk-tag 风险标签 | ✅ |
| **反馈管理 (AdminFeedback)** | 添加 stats-grid 统计行、筛选按钮 | ✅ |
| **表单管理 (AdminForms)** | 改为 iOS `forms-grid` 卡片网格布局、添加搜索框 | ✅ |
| **系统设置** | 保持不动（已对齐） | ✅ |

### CSS 层
- `dashboard.css` — 新增所有 iOS 子页面样式（project-grid, upload-zone, ai-card, ai-textarea, ai-list, feedback-filters, feedback-badge, plan-grid, plan-card, usage-bar, form-input, form-select, status-badge, table-btn, risk-tag, forms-grid, form-card, btn-pill 变体等）
- `design-tokens.css` — 保持不动（已完全对齐）

## 验证
- ✅ `tsc --noEmit` — 0 类型错误
- ✅ `vite build` — 346ms 构建成功
- ✅ CSS 文件名确认

## 未实施（低优先级）
1. **AdminAnalytics**（数据分析页）— 需要新建完整页面，含 CSS 柱状图
2. **PreviewPage**（预览/反馈页）— 需要新建完整页面
3. **LoginPage** Tab 切换 — 需要重构登录/注册 UI
4. **首页辉光效果** — 用户明确说不改首页

## 部署
- 打包文件: `web/dist/demogo-site-preview.zip`
