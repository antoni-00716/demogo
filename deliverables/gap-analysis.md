# DemoGo iOS 设计稿 vs React 实现 — 差距分析报告

> **报告日期**: 2026-06-12  
> **作者**: 高见远（架构师）  
> **设计系统版本**: Design Spec v1.0（品牌色 #22C55E 翠绿，iOS 极简风）  

---

## 页面差距总览表

| 页面 | 设计师HTML | React当前状态 | 差距等级 | 需要改动 |
|------|-----------|-------------|---------|---------|
| **HomePage**（首页落地页） | `demogo-landing-ios.html` | `HomePage.tsx` + `home.css` | **中** | 文案/结构对齐、视觉细节调整、缺少 green-glow 效果、按钮尺寸差异 |
| **LoginPage**（登录页） | `demogo-login-ios.html` | `LoginPage.tsx` + `auth.css` | **中** | 缺少登录/注册 tabs 切换、缺少辉光装饰、卡片圆角/间距调整、品牌色对齐 |
| **Dashboard Sidebar** | 共用 `demogo-dashboard-*-ios.html` | `Sidebar.tsx` | **低** | 导航项基本对齐，缺少响应式折叠 |
| **ProjectsView**（我的作品） | `demogo-dashboard-projects-ios.html` | `ProjectsView.tsx` + `DemoList.tsx` | **中** | 卡片样式与设计稿差异较大、缺少搜索框 emoji 图标、按钮样式需对齐 |
| **UploadPanel**（上传发布） | `demogo-dashboard-upload-ios.html` | `UploadPanel.tsx` | **大** | 拖拽区样式不匹配、缺少表单字段（文件类型下拉选择）、按钮 `btn-pill--disabled` 变体缺失 |
| **AgentPublishPanel**（AI发布） | `demogo-dashboard-ai-ios.html` | `AgentPublishPanel.tsx` | **大** | 缺少"最近AI生成作品"列表、textarea 样式不匹配、整体布局结构差异大 |
| **DeployHistory**（发布记录） | `demogo-dashboard-history-ios.html` | `DeployHistory.tsx` | **中** | 表格 CSS 类名与设计稿不对齐（`.status-badge` vs 当前实现）、行 hover 效果缺失 |
| **FeedbackPanel**（反馈收集） | `demogo-dashboard-feedback-ios.html` | `FeedbackPanel.tsx` | **大** | 缺少 `.feedback-filters` 筛选按钮、`feedback-item--unread` 样式缺失、整体卡片结构不同 |
| **PlanRequestsTable**（套餐额度） | `demogo-dashboard-plan-ios.html` | `PlanRequestsTable.tsx` + `UserDashboard.tsx` | **大** | 缺少套餐卡网格 `plan-grid`、缺少用量进度条 `usage-bar`、缺少功能对比表 `comp` |
| **Admin Sidebar** | `demogo-admin-*-ios.html` | `AdminSidebar.tsx` | **低** | 基本对齐，缺少 `.tag` 管理标签 badge |
| **AdminUsers**（用户管理） | `demogo-admin-users-ios.html` | `AdminUsers.tsx` | **中** | 表格列对齐、状态标签 `.status-tag` 类名一致但 `disabled` 变体需添加 |
| **AdminDemos**（Demo管理） | `demogo-admin-demos-ios.html` | `AdminDemosView.tsx` | **中** | 缺少统计卡片网格 `.stats-grid`、筛选下拉框样式需对齐 |
| **AdminReview**（内容审核） | `demogo-admin-review-ios.html` | `AdminContentReviews.tsx` | **大** | 缺少 `.review-card` 带截图占位的审核卡片布局、缺少风险标签、审批按钮样式需对齐 |
| **AdminFeedback**（反馈管理） | `demogo-admin-feedback-ios.html` | `AdminFeedback.tsx` | **中** | 表格结构基本对齐，缺少 `.stat-card` 网格上方的统计行 |
| **AdminForms**（表单管理） | `demogo-admin-forms-ios.html` | `AdminForms.tsx` | **大** | 缺少 `.forms-grid` 卡片网格布局、`form-card` 样式差异大 |
| **AdminAnalytics**（数据分析） | `demogo-admin-analytics-ios.html` | 当前无独立实现（或集成在 `AdminOverviewView`） | **大** | 整个数据分析页面未实现：图表、热门Demo列表、DAU/MAU指标 |
| **AdminSettings**（系统设置） | `demogo-admin-settings-ios.html` | `AdminSettings.tsx` | **中** | 基本对齐 CSS，`.toggle-switch` 组件需确认对齐 |
| **Preview（预览页）** | `demogo-preview-ios.html` | 无对应 React 页面 | **大** | 整个预览/反馈页面未实现 |

---

## 每个页面详细分析

### HomePage（首页落地页）

**设计对照分析**：  
设计师 `demogo-landing-ios.html` 采用 5 层结构：Hero → Pain → Sell(x3) → Who+Scene+Table+Metrics → CTA → Footer。  
React `HomePage.tsx` 采用类似结构：Nav → Hero → Pain → Sell(x3) → Who → Scene → CompareTable → Metrics → CTA → Footer。

**已实现项**：
- `nav` 导航栏：logo（◆DemoGo）+ 导航链接 + CTA 按钮 — 基本对齐
- `hero` 区：大标题 + 副标题 + 双 CTA 按钮 — 结构对齐
- `sec-title` / `sec-body` / `sec-body--narrow` 文字样式 — 全局 CSS 变量对齐
- `pain-grid` / `pain-card` 痛点卡片 — 结构对齐
- `sell-inner` 双列卖点区（含 `sell-visual` / `sell-right`） — 结构对齐
- `who-grid` / `who-card` 用户人群 — 结构对齐
- `scene-grid` / `scene-item` 使用场景 — 结构对齐
- `cmp-wrap` / `cmp-table` 对比表格 — 结构对齐
- `metric-row` / `metric` / `metric-num` / `num-accent` — 结构对齐
- `sec-cta` / `footer` / `footer-inner` / `footer-bottom` — 结构对齐

**缺失项**：
1. **Hero 背景辉光**：设计稿有 `radial-gradient` 绿色光晕 `::before` 假元素，React 实现没有此绿色辉光效果（`home.css` 中缺少 `.hero::before`）
2. **导航链接文案**：设计稿链接为 `适合谁 / 为什么选 / 怎么用`，React 实现为 `我能用吗 / 怎么用`（缺少"为什么选"）
3. **CTA 按钮文字**：设计稿主按钮 `免费开始使用`，React 实现 `免费生成我的链接`
4. **Section 间距**: 设计师 `section` padding 使用 `--section-gap: 100px`（含 gap 变量），React 的 `home.css` 需确认 gap 值一致
5. **Metric Row 竖线分隔**: 设计稿 `.metric + .metric::before` 竖线，需确认 React 是否有此中间竖线（当前 `home.css` 可能存在差异）
6. **响应式 900px 断点**: 设计稿有详细 responsive 规则（3列→1列等），需确认 `home.css` 完全对齐
7. **Footer 渐变**: `.footer::before` 绿色渐变，当前首页可能缺少此效果
8. **`sec-label` 区块标签**: 设计稿 Landing 页使用 `sec-label` 标签标注各区块（"核心功能""就三步"等），虽 React 未使用 `.sec-label` 类，但首版本可选择不添加

**实施建议**：
- 在 `home.css` 的 `.hero` 中添加 `::before` radial-gradient 辉光
- 对齐导航链接文案为设计稿版本
- 检查 Section gap 和 metric 竖线分隔响应式行为

---

### LoginPage（登录页）

**设计对照分析**：  
设计师 `demogo-login-ios.html` 采用居中卡片布局：logo → 标题 → 登录/注册tabs → 表单 → 底部链接。  
React `LoginPage.tsx` + `auth.css` 实现类似登录卡片。

**已实现项**：
- 居中卡片布局（`.card` / 最大宽度 400px）
- 品牌 logo（◆DemoGo）
- 邮箱/密码输入框
- 提交按钮
- 页脚版权声明
- CSS 色彩变量对齐

**缺失项**：
1. **登录/注册 Tabs 切换**: 设计稿有 `.tabs` 组件（登录 / 免费注册 两个标签页），React 当前是直接分离的登录/注册页面，而非 tab 切换
2. **按钮内边距**: 设计稿按钮 padding `13px`，需确认当前实现使用 `14px 30px` 还是对齐了 `13px`
3. **字段行（验证码）**: 设计稿注册时可能需要验证码行（`.row .field` + `.btn-sm`），当前登录页无验证码
4. **品牌色卡片阴影**: 设计稿使用 `box-shadow: var(--shadow-md)`，当前可能使用了不同阴影值
5. **卡片内边距**: 设计稿 `48px 36px 40px`，需确认当前 `auth.css` 中卡片 padding 对齐
6. **标题字体大小**: 设计稿 `22px, 700`，需确认 `auth.css` 中 `.auth-title` 或对应样式对齐
7. **移动端响应式**: 设计稿 480px 断点 `padding: 36px 24px 32px`，需 `auth.css` 对齐

**实施建议**：
- 将登录/注册改为 tabs 切换布局
- 对齐卡片 padding、按钮 padding 到设计稿尺寸
- 添加验证码行支持

---

### Dashboard Sidebar

**设计对照分析**：  
设计师共用侧边栏 `sidebar`：logo → 7个导航项 → 用户信息区。  
React `Sidebar.tsx` 实现一致。

**已实现项**：
- `sidebar-logo`（◆DemoGo）— 对齐
- 7个导航项（总览、我的作品、上传发布、AI发布、发布记录、反馈收集、套餐额度）— 对齐
- `.nav-item` / `.active` 样式 — 对齐
- `.sidebar-user` / `.sidebar-avatar` / `.sidebar-user-name` / `.sidebar-user-role` — 对齐
- CSS 类名与设计稿完全一致

**缺失项**：
1. **响应式隐藏**: 设计稿 900px 断点 `sidebar { display: none }`，当前 `dashboard.css` 中已有此规则
2. **导航项 icon 使用 emoji**: 当前使用 emoji 图标，设计稿使用 aria-hidden emoji，已对齐

**实施建议**：基本无改动，只需确保响应式工作。

---

### Dashboard - ProjectsView（我的作品）

**设计对照分析**：  
设计师 `demogo-dashboard-projects-ios.html`：搜索框 + 项目卡片网格 `project-grid`。  
React `ProjectsView.tsx` + `DemoList.tsx`：列表行布局 `demo-row` 而非卡片网格。

**已实现项**：
- `main-header` 标题和按钮 — 对齐
- 作品列表（名称、状态、浏览量、操作按钮）— 功能对齐
- 搜索框（`.search-box`）— 功能对齐

**缺失项**：
1. **卡片网格布局**: 设计稿使用 `project-grid`（grid auto-fill minmax 280px 卡片），React 使用列表行（`demo-row`），这是视觉布局的根本差异
2. **项目状态绿点**: 设计稿 `.project-dot.online/offline`（8px 圆形），React 使用 `.demo-dot.online/offline` 已有但需确认 CSS 完全对齐
3. **项目卡片悬停效果**: 设计稿 `box-shadow: var(--shadow-green), border-color: var(--accent-border)`，当前 `demo-row` 使用 `--shadow-md`
4. **搜索框样式**: 设计稿搜索框 border-radius `var(--radius-pill)` 且带 `.search-icon` emoji，当前实现搜索框是 inline-flex 且无 icon
5. **"新建作品"按钮**: 设计稿 `.btn-pill` 带 emoji 图标 `+ 新建作品`，当前 `ProjectsView.tsx` 显示 `发布新作品`
6. **项目按钮（复制链接/编辑/删除）**: 设计稿 `.project-btn` 样式（pill border），当前 `demo-btn` 类名一致但需确认样式对齐
7. **卡片内信息显示**: 设计稿显示创建日期、浏览数，React 实现类似但结构不同

**实施建议**：
- **较大改动**：将 `ProjectsView` 的列表布局改为卡片网格 `project-grid`
- 或保持列表布局但将样式对齐为设计稿的卡片样式（border-radius, shadow, border-color 悬停）
- 搜索框改为 pill 样式并添加 search icon

---

### Dashboard - UploadPanel（上传发布）

**设计对照分析**：  
设计师 `demogo-dashboard-upload-ios.html`：拖拽区 `.upload-zone` + 3 个表单字段 + 发布/预览按钮。  
React `UploadPanel.tsx`：2 步发布流程（选文件→发布），功能更复杂（含检查、进度、结果展示）。

**已实现项**：
- 文件拖拽/选择功能
- 项目名称输入框
- 发布按钮
- 发布进度展示
- 检查结果展示

**缺失项**：
1. **拖拽区样式**: 设计稿 `.upload-zone` 使用 `dashed border: 2px dashed var(--border)` + `background: var(--bg-section)` + hover 样式，当前 `up-drop` 类样式不匹配（实线边框、背景颜色不同）
2. **文件类型下拉选择**: 设计稿有 `<select class="form-select">` 可选 HTML/图片/PDF/ZIP，React 实现没有文件类型选择
3. **预览按钮**: 设计稿有 `.btn-pill--disabled` 预览按钮，React 实现没有此按钮
4. **按钮样式**: 设计稿 `.btn-pill` 有 `--disabled` 变体，当前全局 CSS 使用 `:disabled` 伪类
5. **`upload-card` 容器**: 设计稿使用 `.upload-card`（max-width 640px, padding 40px），React 使用 `.workspace-home` 默认宽度
6. **表单标签**: 设计稿使用 `.form-label` 标签（13px, 600），当前 Input 使用 placeholder 无 label

**实施建议**：
- 将 DropZone 样式改为 dashed border + bg-section 背景
- 添加文件类型 select 下拉框
- 添加"预览"按钮（disabled 状态）
- 添加 form-label 标签

---

### Dashboard - AgentPublishPanel（AI 发布）

**设计对照分析**：  
设计师 `demogo-dashboard-ai-ios.html`：AI 描述区 `ai-card` + textarea + 最近 AI 生成作品列表。  
React `AgentPublishPanel.tsx`：仅展示 token 和管理 token，无 AI 生成功能。

**已实现项**：
- AI 发布区域的基本容器

**缺失项**：
1. **AI 提示词 textarea**: 设计稿 `.ai-textarea`（min-height 140px, bg-section 背景, placeholder 提示），当前 AgentPublishPanel 完全无此 textarea
2. **"生成并发布"按钮**: 设计稿带 emoji 的 `btn-pill` 按钮（✨ 生成并发布）
3. **最近 AI 生成作品列表**: 设计稿 `ai-list` → `ai-row`（绿点状态 + AI名称 + 时间 + 浏览量 + 查看/重新生成按钮）
4. **hint 文字**: 设计稿 `.ai-hint` 提示"AI 将根据你的描述生成 HTML 页面..."
5. **section-hdr**: 设计稿 `section-hdr` 带 "最近 AI 生成作品" 标题

**实施建议**：
- **较大改动**：添加 AI 提示词 textarea、生成按钮、最近生成作品列表
- 为每个列表项添加查看/重新生成按钮

---

### Dashboard - DeployHistory（发布记录）

**设计对照分析**：  
设计师 `demogo-dashboard-history-ios.html`：表格 `.table-wrap` + `th/td` 列：作品名称→发布日期→状态→浏览量→反馈数→操作。  
React `DeployHistory.tsx`：当前实现部署历史表格。

**已实现项**：
- 表格结构（`table-wrap` 容器）
- 列标题：作品名称、日期、状态、浏览量、操作
- `.status-badge--online` / `--expired` 状态标签

**缺失项**：
1. **状态标签样式**: 设计稿 `status-badge--online`（`background: var(--accent-subtle), color: var(--accent)`），当前实现使用 `.badge-brand`
2. **反馈数列**: 设计稿有"反馈数"列，当前可能没有
3. **行 hover 效果**: 设计稿 `tr:hover td { background: var(--bg-section) }`，当前 `dashboard.css` 使用 `rgba(0,0,0,.01)`
4. **表格按钮**: 设计稿 `.table-btn` 样式，当前使用 `.action-btn`
5. **操作按钮** 设计稿"详情"+"下线"行内显示，当前实现可能类似

**实施建议**：
- 统一状态标签类名为 `status-badge` 体系
- 添加"反馈数"列对齐设计稿
- 对齐行 hover 效果

---

### Dashboard - FeedbackPanel（反馈收集）

**设计对照分析**：  
设计师 `demogo-dashboard-feedback-ios.html`：筛选按钮行 `feedback-filters` + 反馈卡片列表 `feedback-list`。  
React `FeedbackPanel.tsx`：当前实现反馈列表。

**已实现项**：
- 反馈列表展示（项目名称、反馈内容、时间）

**缺失项**：
1. **筛选按钮**: 设计稿 `.feedback-filters` 多选 pill 按钮（全部/未读/建议/问题/赞赏），React 实现无此筛选
2. **反馈卡片左侧边框**: 设计稿 `.feedback-item--unread` 使用 `border-left: 3px solid var(--accent)` 标记未读
3. **反馈 badge 标签**: 设计稿 `feedback-badge--suggestion/bug/praise` 带颜色标签（蓝/红/绿），当前可能未实现
4. **未读红点**: 设计稿 `.unread-dot`（6px 绿色圆点）标记未读，当前实现需确认
5. **反馈卡片悬停效果**: 设计稿 `.feedback-item:hover` 加绿边和绿阴影
6. **反馈排序**: 未读反馈置前

**实施建议**：
- 添加筛选按钮行（`.feedback-filters`）
- 添加 `feedback-item--unread` 未读样式
- 添加反馈类型 badge 颜色标签
- 添加未读红点

---

### Dashboard - PlanRequestsTable（套餐额度）

**设计对照分析**：  
设计师 `demogo-dashboard-plan-ios.html`：套餐卡网格 `plan-grid` → 用量进度条 `usage-section` → 功能对比表 `compare-table-wrap`。  
React `PlanView`（嵌入 `UserDashboard.tsx`）：套餐面板 `PlanPanel` + 申请表格，无设计稿的视觉布局。

**已实现项**：
- 当前套餐信息展示
- 套餐升级申请表单
- 功能对比（部分实现）

**缺失项**：
1. **套餐卡网格**: 设计稿 `.plan-grid` 双列卡片（免费版 + 专业版），React 当前使用按钮列表
2. **套餐卡样式**: 设计稿 `.plan-card--current`（绿色边框 + 绿阴影），React 当前使用 `plan-option` 按钮
3. **用量进度条**: 设计稿 `usage-bar` 带填充条 `usage-bar-fill`（warn/full 变体），React 当前无此视觉显示
4. **功能对比表**: 设计稿 `table.comp` 对比免费版/专业版功能，React 当前已部分实现但样式需对齐
5. **`btn-pill--outline` 变体**: 设计稿专业版升级按钮使用 outline 样式
6. **价格显示**: 设计稿 ¥0/¥49 大字体价格展示，当前无此设计

**实施建议**：
- **较大改动**：重新实现 `PlanView` 对齐设计稿的卡片网格 + 用量条 + 对比表布局
- 套餐卡支持 `--current` 绿色边框样式
- 用量条支持 warn/full 变体

---

### AdminSidebar

**设计对照分析**：  
设计师共用 `demogo-admin-*-ios.html` 侧边栏：logo + 管理标签 + 8 个导航项 + 用户信息。  
React `AdminSidebar.tsx`：与设计稿一致。

**已实现项**：
- `sidebar-logo + .tag`（管理） — 对齐
- 8 个导航项（总览/用户管理/Demo管理/内容审核/反馈管理/表单管理/数据分析/系统设置）— 对齐
- `.nav-item` + `.badge`（红色数字badge）— 对齐
- 用户信息区域 — 对齐

**缺失项**：基本无缺失。

---

### AdminUsers（用户管理）

**设计对照分析**：  
设计师 `demogo-admin-users-ios.html`：统计卡网格 `stats-grid` → 用户表格 `table-wrap`。  
React `AdminUsers.tsx`：表格实现。

**已实现项**：
- 用户表格（姓名、邮箱、套餐、状态、注册时间、发布数、操作）
- `.status-tag.online/disabled` 状态标签
- `.action-btn` 操作按钮
- `.td-name` / `.td-email` / `.td-plan` CSS 类名

**缺失项**：
1. **统计卡网格**: 设计稿 4 列 `.stats-grid`（总用户数/专业版/企业版/已禁用），React 当前可能未在 AdminUsers 中显示统计行
2. **搜索框**: 设计稿 `.search-box` 在 AdminDashboard 主 header，React 已全局实现
3. **"添加用户"按钮**: 设计稿 `btn-primary` 带 `＋` 图标
4. **表格 hover**: 设计稿 `rgba(0,0,0,.01)`，React 已有类似
5. **状态标签 disabled 变体**: 设计稿 `status-tag.disabled` 样式（灰色），需确认已实现
6. **操作按钮 danger 变体**: `.action-btn.danger` 红色 hover，当前已全局支持

**实施建议**：
- 在 AdminUsers 页面上方添加 stats-grid 统计行
- 对齐搜索框为独立组件

---

### AdminDemos（Demo 管理）

**设计对照分析**：  
设计师 `demogo-admin-demos-ios.html`：统计卡网格 + 筛选下拉 + 表格。  
React `AdminDemosView.tsx`：表格实现。

**已实现项**：
- Demo 表格（项目名称、所有者、创建/过期时间、状态、浏览量、反馈数、操作）
- `.status-tag.online/expired/review` 状态标签
- `.action-btn` 操作按钮

**缺失项**：
1. **统计卡网格**: 设计稿 4 列 `stats-grid`（全部 Demo/在线中/审核中/已过期），React 当前无 demos 页面统计行
2. **筛选下拉框**: 设计稿 `.filter-select`（全部状态/在线/已过期/审核中），React 当前可能无筛选

**实施建议**：
- 添加 stats-grid 统计行
- 添加 filter-select 状态筛选下拉

---

### AdminReview（内容审核）

**设计对照分析**：  
设计师 `demogo-admin-review-ios.html`：筛选下拉 + 审核卡片列表 `review-list`。  
React `AdminContentReviews.tsx`：审核列表。

**已实现项**：
- 审核项目列表
- 通过/拒绝按钮
- 审核备注输入框

**缺失项**：
1. **审核卡片布局**: 设计稿 `.review-card` 带截图占位 `.review-screenshot`（180x120），React 当前无截图占位
2. **风险标签**: 设计稿 `.risk-tag.low/medium/high`（绿/黄/红），React 当前无风险等级显示
3. **审核状态 badge**: 设计稿 `review-status-badge.pending/approved/rejected`，React 当前可能已有类似
4. **`btn-approve/reject` 样式**: 设计稿为绿色/红色实心按钮，React 当前使用 `action-btn` 边框样式
5. **卡片悬停效果**: 设计稿绿边 + 绿阴影
6. **筛选下拉**: 全部状态/待审核/已通过/已拒绝

**实施建议**：
- **较大改动**：改为卡片式布局 `review-card` 带截图占位
- 添加风险标签
- 审批按钮改为实心绿色/红色
- 添加筛选下拉

---

### AdminFeedback（反馈管理）

**设计对照分析**：  
设计师 `demogo-admin-feedback-ios.html`：统计卡网格 + 筛选下拉 + 表格。  
React `AdminFeedback.tsx`：反馈表格。

**已实现项**：
- 反馈表格（项目、用户、类型、内容预览、日期、状态、操作）
- `.type-tag.bug/feature/suggestion/other` 类型标签
- `.status-tag.unread/read` 状态标签

**缺失项**：
1. **统计卡网格**: 设计稿 4 列 `stats-grid`（总反馈/未读/Bug反馈/功能建议），React 当前无统计行
2. **筛选下拉**: 全部类型/Bug/功能建议/优化建议/其他

**实施建议**：
- 添加 stats-grid 统计行
- 添加筛选下拉

---

### AdminForms（表单管理）

**设计对照分析**：  
设计师 `demogo-admin-forms-ios.html`：搜索框 + 新建按钮 → 表单卡片网格 `forms-grid`。  
React `AdminForms.tsx`：表单列表/表格。

**已实现项**：
- 表单列表展示

**缺失项**：
1. **卡片网格布局**: 设计稿 `forms-grid`（grid auto-fill minmax 300px），React 当前可能使用列表/表格
2. **表单卡片**: 设计稿 `.form-card` 结构：header（名称+项目+状态）→ meta（创建者/提交数/时间）→ footer（查看/编辑/删除按钮）
3. **`.status-tag.active/closed/draft`** 三种状态标签
4. **搜索框 + 新建按钮**: 设计稿在 admin-header-actions 区域
5. **卡片悬停效果**: 绿边+绿阴影

**实施建议**：
- **较大改动**：改为表单卡片网格布局
- 每个卡片包含 header/meta/footer 三段式结构

---

### AdminAnalytics（数据分析）

**设计对照分析**：  
设计师 `demogo-admin-analytics-ios.html`：时间筛选 + 图表网格（总览趋势/用户增长/热门Demo/DAU）。  
React：当前无独立数据分析页面。

**已实现项**：
- 无独立实现

**缺失项**：
1. **浏览趋势柱状图**: 设计稿 `.chart-placeholder` + `.chart-bars` + `.chart-bar`，14 根渐变柱
2. **用户增长卡片**: 3 列 `growth-grid`（总用户/本周新增/增长率）+ 小柱状图
3. **热门Demo Top5**: 设计稿 `.popular-demo-item` 带排名方块、名称、浏览数
4. **DAU 指标**: 今日/昨日/本周日均 DAU、MAU、用户留存率
5. **时间筛选下拉**: 最近7天/30天/90天
6. **卡片 full-width 布局**: 总览趋势图跨双列

**实施建议**：
- **较大改动**：创建独立的 `AdminAnalytics` 页面
- 实现柱状图占位 CSS（纯 CSS 柱状图）
- 实现热门 Demo 列表
- 实现 DAU/MAU 指标卡片

---

### AdminSettings（系统设置）

**设计对照分析**：  
设计师 `demogo-admin-settings-ios.html`：三段设置卡片（基本设置/运行配置/通知设置）+ 保存按钮。  
React `AdminSettings.tsx`：设置表单。

**已实现项**：
- 三段设置区域
- 表单输入字段（站点名称、描述、URL）
- 运行配置（实例数、内存限制等）
- 通知开关（`.toggle-switch`）
- 保存按钮

**缺失项**：
1. **表单标签 + 描述**: 设计稿 `.form-label` + `.form-desc` 搭配，React 实现类似
2. **Toggle 开关**: 设计稿使用纯 CSS toggle（input + .toggle-slider），React 实现需确认是否使用相同结构

**实施建议**：基本对齐，只需微调 CSS 细节。

---

### Preview（预览/反馈页）

**设计对照分析**：  
设计师 `demogo-preview-ios.html`：工具栏 `bar` + 预览区 `preview` + 反馈表单 `feedback`。  
React：无对应页面。

**已实现项**：
- 无

**缺失项**：
1. **整个页面未实现**
2. 工具栏（logo + 试用演示badge + 项目名 + 剩余时间 + 复制链接 + 提供反馈）
3. 预览区（16:10 宽高比的模拟预览容器 + 占位图标）
4. 反馈表单（类型选择 radio + textarea + 提交按钮 + 反馈计数）

**实施建议**：
- **较大改动**：创建全新 Preview 页面
- 实现工具栏、预览占位区、反馈表单三块结构

---

## 设计系统差距

### CSS 变量对齐情况

| 设计稿 CSS 变量 | React `design-tokens.css` | 状态 |
|-----------------|--------------------------|------|
| `--bg` | `--bg` | ✅ 对齐 |
| `--bg-section` | `--bg-section` | ✅ 对齐 |
| `--accent` | `--accent` | ✅ 对齐 |
| `--accent-hover` | `--accent-hover` | ✅ 对齐 |
| `--accent-subtle` | `--accent-subtle` | ✅ 对齐 |
| `--accent-border` | `--accent-border` | ✅ 对齐 |
| `--text-primary` | `--text-primary` | ✅ 对齐 |
| `--text-secondary` | `--text-secondary` | ✅ 对齐 |
| `--text-tertiary` | `--text-tertiary` | ✅ 对齐 |
| `--text-quaternary` | `--text-quaternary` | ✅ 对齐 |
| `--border` | `--border` | ✅ 对齐 |
| `--border-light` | `--border-light` | ✅ 对齐 |
| `--shadow-sm` | `--shadow-sm` | ✅ 对齐 |
| `--shadow-md` | `--shadow-md` | ✅ 对齐 |
| `--shadow-lg` | `--shadow-lg` | ✅ 对齐 |
| `--shadow-green` | `--shadow-green` | ✅ 对齐 |
| `--radius-md` | `--radius-md` | ✅ 对齐 |
| `--radius-pill` | `--radius-pill` | ✅ 对齐 |
| `--max-w` | `--max-w` | ✅ 对齐 |
| `--section-gap` | `--section-gap` | ✅ 对齐（但设计稿 landing 页为 100px，token 中为 120px，需确认） |
| `--font-sans` | `--font-sans` | ✅ 对齐 |
| `--green` | 无此变量 | ⚠️ 设计稿多处使用 `--green: #22C55E`，React 直接用 `--accent` |
| `--red` | 无此变量 | ⚠️ 设计稿 admin 使用 `--red: #EF4444` |
| `--amber` | 无此变量 | ⚠️ 设计稿 admin 使用 `--amber: #F59E0B` |

### 缺失的设计系统组件/样式

1. **`.sec-label` 区块标签**: 设计规范定义了 `sec-label` 组件（12px, 600, 绿色 + 装饰线），首页和其他页面可使用
2. **`.feat-card` 功能卡片**: 设计规范 3.4 节定义了完整功能卡片组件（40px 28px padding, 44px 图标容器）
3. **`.step-num` 步骤数字**: 设计规范 3.5 节定义了圆形步骤数字组件
4. **`.num-accent` 高亮数字**: 首页 metric 行使用 `.num-accent` 绿色高亮
5. **`.btn-pill--disabled` 按钮变体**: 上传页预览按钮使用 disabled 变体
6. **`.btn-pill--outline` 按钮变体**: 套餐卡升级按钮使用 outline 变体
7. **`.upload-zone` 拖拽区样式**: 完整 dashed 边框 + hover 效果
8. **`.form-select` 下拉框**: 带自定义 arrow icon 的下拉框
9. **`.toggle-switch` 开关**: 通知设置中的 CSS toggle
10. **`.chart-bar` 柱状图**: 数据分析页使用纯 CSS 柱状图
11. **`.usage-bar` 用量进度条**: 套餐页使用带变体的进度条
12. **`.risk-tag` 风险标签**: admin review 页使用低/中/高风险标签
13. **`.review-status-badge` 审核状态**: admin review 页使用

---

## 实施任务列表

### 优先级 P0（高影响、高可见性、核心页面）

#### T1: 首页 Hero 辉光效果 + 导航文案对齐
- **涉及文件**: `web/src/styles/home.css`
- **实施要点**: 在 `.hero` 添加 `::before` radial-gradient 辉光；导航链接文案改为 `适合谁 / 为什么选 / 怎么用`
- **依赖关系**: 无
- **预估工作量**: 小

#### T2: 登录页 Tabs 切换布局
- **涉及文件**: `web/src/pages/LoginPage.tsx`, `web/src/styles/auth.css`
- **实施要点**: 将登录/注册改为 tab 切换布局（`.tabs` 组件），对齐卡片 padding 和按钮尺寸
- **依赖关系**: 无
- **预估工作量**: 中

#### T3: 上传发布页拖拽区样式对齐 + 表单字段补充
- **涉及文件**: `web/src/pages/dashboard/UploadPanel.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: DropZone 改为 dashed border + bg-section 背景；添加文件类型 select 下拉框；添加"预览"按钮（disabled 状态）；添加 form-label 标签
- **依赖关系**: 无
- **预估工作量**: 中

#### T4: AI 发布页对齐设计稿（提示词+生成列表）
- **涉及文件**: `web/src/pages/dashboard/AgentPublishPanel.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 添加 AI 提示词 textarea（`.ai-textarea`）；添加"生成并发布"按钮；添加"最近 AI 生成作品"列表（`.ai-list` → `.ai-row`）；添加 section header
- **依赖关系**: 无
- **预估工作量**: 中

#### T5: 套餐额度页视觉重做
- **涉及文件**: `web/src/pages/UserDashboard.tsx`（PlanView）, `web/src/styles/dashboard.css`
- **实施要点**: 添加 `.plan-grid` 双列套餐卡（免费版+专业版）；添加 `.usage-bar` 用量进度条（含 warn/full 变体）；对齐功能对比表样式
- **依赖关系**: 无
- **预估工作量**: 大

#### T6: 数据分析页新建
- **涉及文件**: `web/src/pages/admin/AdminAnalytics.tsx`（新建）, `web/src/styles/dashboard.css`
- **实施要点**: 创建完整数据分析页面；实现柱状图（`.chart-bar` CSS 占位）；实现热门 Demo Top5 列表；实现 DAU/MAU 指标卡片；添加全宽布局
- **依赖关系**: 无
- **预估工作量**: 大

### 优先级 P1（重要但不阻塞体验）

#### T7: 项目作品页面卡改为卡片网格布局
- **涉及文件**: `web/src/pages/dashboard/ProjectsView.tsx`, `web/src/components/dashboard/DemoList.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 从列表行改为卡片网格 `project-grid`；每个卡片包含名称、状态绿点、日期、浏览数、操作按钮
- **依赖关系**: 无
- **预估工作量**: 中

#### T8: 反馈收集页面添加筛选 + 未读样式
- **涉及文件**: `web/src/components/dashboard/FeedbackPanel.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 添加 `.feedback-filters` 筛选按钮行；添加 `.feedback-item--unread` 左侧绿边框；添加反馈类型 badge；添加未读红点
- **依赖关系**: 无
- **预估工作量**: 中

#### T9: 内容审核页面改为卡片布局
- **涉及文件**: `web/src/pages/admin/AdminContentReviews.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 改为 `.review-card` 卡片布局；添加 `.review-screenshot` 截图占位；添加 `.risk-tag` 风险标签；审批按钮改为实心色块；添加筛选下拉
- **依赖关系**: 无
- **预估工作量**: 中

#### T10: 表单管理页面改为卡片网格布局
- **涉及文件**: `web/src/pages/admin/AdminForms.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 改为 `.forms-grid` 卡片网格；每个卡片三段式结构（header/meta/footer）；对齐三种状态标签
- **依赖关系**: 无
- **预估工作量**: 中

### 优先级 P2（低影响、细节微调）

#### T11: Admin 用户管理 + Demo管理 + 反馈管理添加统计行
- **涉及文件**: `web/src/pages/admin/AdminUsers.tsx`, `web/src/pages/admin/AdminDemosView.tsx`, `web/src/pages/admin/AdminFeedback.tsx`
- **实施要点**: 在表格上方添加 4 列统计卡 `.stats-grid`；每个页面的统计项不同
- **依赖关系**: 无
- **预估工作量**: 中

#### T12: 发布记录表格细节对齐
- **涉及文件**: `web/src/components/dashboard/DeployHistory.tsx`, `web/src/styles/dashboard.css`
- **实施要点**: 统一状态标签为 `.status-badge` 体系；添加反馈数列；对齐行 hover 效果
- **依赖关系**: 无
- **预估工作量**: 小

#### T13: 设计系统缺失组件补充
- **涉及文件**: `web/src/styles/global.css`, `web/src/styles/design-tokens.css`
- **实施要点**: 添加 `--green` / `--red` / `--amber` CSS 变量；添加 `.sec-label` 组件样式；添加 `.btn-pill--disabled` / `.btn-pill--outline` 按钮变体；添加 `.form-select` 样式
- **依赖关系**: 无
- **预估工作量**: 小

#### T14: 预览/反馈页面新建
- **涉及文件**: `web/src/pages/PreviewPage.tsx`（新建）, `web/src/styles/preview.css`（新建）
- **实施要点**: 工具栏（logo + badge + 项目信息 + 操作按钮）；预览占位区（16:10）；反馈表单（类型选择 + textarea + 提交）
- **依赖关系**: 无
- **预估工作量**: 大

### 任务依赖关系图

```
T1 (首页辉光)           ── 独立
T2 (登录tabs)           ── 独立
T3 (上传发布)            ── 独立
T4 (AI发布)             ── 独立
T5 (套餐额度)            ── 独立
T6 (数据分析-新建)       ── 独立
T7 (作品卡片网格)        ── 独立
T8 (反馈筛选)           ── 独立
T9 (内容审核卡片)        ── 独立
T10 (表单卡片网格)       ── 独立
T11 (Admin统计行)       ── 依赖 T13 (CSS变量)
T12 (发布记录)          ── 依赖 T13 (CSS变量)
T13 (CSS缺失组件)       ── 独立
T14 (预览页-新建)       ── 独立
```

> **说明**：所有任务相对独立，可并行实施。T11 和 T12 对 T13 有弱依赖（CSS 变量扩展），T13 完成后可快速对齐。

---

## 总结

**总体差距等级**：中高（约 40% 页面视觉匹配度）

**已对齐部分**：
- CSS 变量体系几乎完全对齐（90%+）
- 全局组件样式（按钮、卡片、表格、badge）基本对齐
- Dashboard/Admin 侧边栏完全对齐
- 首页主体结构对齐

**主要差距集中在**：
1. **Dashboard 内部视图**：Upload/AI/Feedback/Plan 四个视图与设计稿差异较大
2. **Admin 管理页**：Review/Forms/Analytics 三个页面与设计稿差异大
3. **缺失页面**：Analytics（无独立实现）、Preview（无实现）

**建议实施策略**：
1. 先实施 P0 任务（T1-T6）确保核心功能视觉对齐
2. 再实施 P1 任务（T7-T10）
3. 最后微调 P2 任务（T11-T14）
