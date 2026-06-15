# iOS 子页面样式实施报告

## 改动内容

### CSS — web/src/styles/dashboard.css
新增 **13 个子页面**的 iOS 样式（对齐 22 个 deliverable HTML 原型）：

**Dashboard 子页面（6页）：**
- 作品网格：`.project-grid` / `.project-card` / `.project-btn` / `.project-stats`
- 搜索框：`.search-box-pill` pill 样式
- 上传卡片：`.upload-card` / `.upload-zone` / `.form-label` / `.form-input` / `.form-select`
- AI 发布：`.ai-card` / `.ai-textarea` / `.ai-hint` / `.ai-list` / `.ai-row`
- 发布记录：`.status-badge` / `.status-badge--online/expired`
- 反馈收集：`.feedback-filters` / `.filter-btn` / `.feedback-badge--suggestion/bug/praise`
- 套餐额度：`.plan-grid` / `.plan-card` / `.usage-bar-group` / `.usage-bar-fill` / `.compare-table-wrap`
- 通用：`.btn-pill--outline` / `.btn-pill--disabled` / `.table-btn`

**Admin 子页面（7页）：**
- 表格单元格：`.td-name` / `.td-email` / `.td-plan` / `.td-project` / `.td-time`
- 筛选下拉：`.filter-select`
- 审核卡片：`.review-card` / `.review-screenshot` / `.risk-tag` / `.btn-approve` / `.btn-reject`
- 反馈类型标签：`.type-tag` / `.type-tag.bug/feature/suggestion/other`
- 表单网格：`.forms-grid` / `.form-card` / `.form-card-header/footer`
- 数据分析：`.analytics-grid` / `.chart-placeholder` / `.chart-bar` / `.metric-list` / `.popular-demo-item` / `.growth-grid`
- 系统设置：`.settings-card` / `.form-textarea` / `.toggle-switch` / `.btn-save`

### React 组件更新

| 文件 | 改动 |
|------|------|
| `web/src/pages/dashboard/ProjectsView.tsx` | 从表格列表改为 iOS 风格卡片网格 + 搜索框（useState搜索过滤） |
| `web/src/components/dashboard/FeedbackPanel.tsx` | 新增 iOS 风格反馈筛选器（建议/问题/赞赏/其他） |

### 未改动
- `AgentPublishPanel.tsx` — 已使用 iOS 类名（`.ai-card` / `.ai-textarea` 等）
- `UserDashboard.tsx PlanView` — 已被前置 agent 更新为 iOS plan-card
- Admin 子页面 React 组件 — 通过 CSS 覆盖自动受益

## 验证
- ✅ `npx tsc --noEmit` — 0 类型错误
- ✅ `npx vite build` — 273ms，77 modules，62KB CSS / 332KB JS
