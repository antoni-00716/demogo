# DemoGo iOS 设计系统完整页面集

## 概述
已完成 DemoGo 后台管理系统的全部 13 个 iOS 极简风格 HTML 页面。所有页面共享统一的 CSS 变量系统、设计 tokens、侧边栏结构和响应式断点。

## 文件清单

### Dashboard 侧（6 页）
| 文件 | 大小 | 功能 |
|------|------|------|
| demogo-dashboard-projects-ios.html | 12KB | 我的作品 — 卡片网格+搜索 |
| demogo-dashboard-upload-ios.html | 9KB | 上传发布 — 拖拽区+表单 |
| demogo-dashboard-ai-ios.html | 10KB | AI 发布 — 提示词输入+生成 |
| demogo-dashboard-history-ios.html | 10KB | 发布记录 — 表格+状态徽标 |
| demogo-dashboard-feedback-ios.html | 11KB | 反馈收集 — 筛选+反馈卡片 |
| demogo-dashboard-plan-ios.html | 12KB | 套餐额度 — 套餐卡+用量条 |

### Admin 侧（7 页）
| 文件 | 大小 | 功能 |
|------|------|------|
| demogo-admin-users-ios.html | 14KB | 用户管理 — 高级表格+搜索 |
| demogo-admin-demos-ios.html | 14KB | Demo 管理 — 表格+状态筛选 |
| demogo-admin-review-ios.html | 15KB | 内容审核 — 审核队列卡片 |
| demogo-admin-feedback-ios.html | 14KB | 反馈管理 — 表格+类型筛选 |
| demogo-admin-forms-ios.html | 14KB | 表单管理 — 卡片网格布局 |
| demogo-admin-analytics-ios.html | 16KB | 数据分析 — 图表+指标卡片 |
| demogo-admin-settings-ios.html | 13KB | 系统设置 — 三段设置表单 |

### 基础模版（3 页）
| 文件 | 功能 |
|------|------|
| demogo-landing-ios.html | 落地页 |
| demogo-login-ios.html | 登录页 |
| demogo-preview-ios.html | 预览/反馈页 |
| demogo-admin-ios.html | Admin 基础框架 |
| demogo-dashboard-ios.html | Dashboard 基础框架 |

## 设计规范
- **品牌色**: #06B6D4 (cyan)
- **风格**: Apple iOS 极简 — 纯色、药丸按钮、毛玻璃导航
- **动画曲线**: cubic-bezier(.25,0,.15,1)
- **侧边栏**: 响应式 240px → 全宽
