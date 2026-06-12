# DemoGo 前端设计规格文档

> **版本**: v1.0  
> **品牌色**: `#22C55E` 翠绿  
> **设计风格**: iOS 极简风（Marvis / Apple.com 类）  
> **设计日期**: 2025-06-11  
> **页面清单**:
> - `demogo-landing-ios.html` — 首页落地页
> - `demogo-login-ios.html` — 登录/注册页
> - `demogo-dashboard-ios.html` — 用户工作台
> - `demogo-admin-ios.html` — 管理后台
> - `demogo-preview-ios.html` — Demo 预览页

---

## 一、设计总览

### 1.1 品牌定位

DemoGo 是一个面向 AI 创作者（Cursor/Windsurf 用户）的试用链接生成与部署平台。核心价值：**做完作品，直接扔个链接出去**。

设计语言强调：
- **速度感**：干净利落的布局，大留白，强对比
- **AI 时代的年轻感**：亮绿色 #22C55E 代替传统 SaaS 蓝
- **信任感**：iOS 极简风 + Apple 式细节打磨

### 1.2 目标受众

- 非技术背景的产品经理、设计师、运营人员
- AI 编程工具（Cursor, Windsurf, Claude Code, Replit）用户
- 追求"快"的分享体验，对部署零容忍

---

## 二、设计系统

### 2.1 色彩系统

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#FFFFFF` | 页面主背景 |
| `--bg-section` | `#F5F5F7` | 交替区块背景 |
| `--accent` | `#22C55E` | 品牌主色，CTA 按钮，高亮文本 |
| `--accent-hover` | `#16A34A` | 按钮悬浮态 |
| `--accent-subtle` | `rgba(34,197,94,.08)` | 图标底衬，标签背景 |
| `--accent-border` | `rgba(34,197,94,.2)` | 绿色边框 |
| `--text-primary` | `#1D1D1F` | 主标题，正文 |
| `--text-secondary` | `#6E6E73` | 副文本，描述 |
| `--text-tertiary` | `#86868B` | 辅助信息 |
| `--text-quaternary` | `#A1A1A6` | 最次要文字 |
| `--border` | `#D2D2D7` | 默认边框 |
| `--border-light` | `#E8E8ED` | 轻量边框，卡片分隔 |

### 2.2 字体系统

| 属性 | 值 |
|------|-----|
| 字体栈 | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Inter', sans-serif` |
| 正文行高 | `1.47059`（Apple 标准值） |
| 字重 | 400（常规）、500（中）、600（半粗）、700（粗） |
| 抗锯齿 | `-webkit-font-smoothing: antialiased` |

### 2.3 字号层级

| 层级 | 桌面端 | 移动端 | 字重 | 使用场景 |
|------|--------|--------|------|---------|
| Hero 标题 | `clamp(34px, 5vw, 56px)` | 自动 | 700 | 首页大标题 |
| 章节标题 | `clamp(28px, 4vw, 44px)` | 自动 | 700 | 功能/数据/CTA 标题 |
| 正文大 | `20px` | `17px` | 400 | 描述段落 |
| 卡片标题 | `18px` | `18px` | 600 | 功能/步骤标题 |
| 主按钮 | `15px` | `15px` | 600 | 按钮文字 |
| 导航/标签 | `12px` | `12px` | 400/600 | 导航链接，区块标签 |
| 页脚 | `11-12px` | `11-12px` | 400 | 页脚链接 |

### 2.4 间距系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--section-gap` | `120px`（桌面）/ `80px`（移动） | 区块间间距 |
| 区块内边距 | `0 24px` | 左右留白 |
| 卡片内边距 | `40px 28px` | 功能卡片 |
| CTA 按钮内边距 | `14px 30px` | 主/次按钮 |
| 网格间距 | `20px` | 卡片网格间距 |

### 2.5 阴影系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.04)` | 卡片默认 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.06)` | 卡片悬浮 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,.08)` | Mockup 大图 |
| `--shadow-green` | `0 4px 20px rgba(34,197,94,.1)` | 绿色卡片悬浮 |

### 2.6 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-md` | `18px` | 卡片容器 |
| `--radius-pill` | `100px` | 按钮，标签 |
| 小圆角 | `12px` | 图标容器 |
| Mockup 圆角 | `20px` | 产品截图 |

---

## 三、组件规范

### 3.1 导航栏 (`.nav`)

```
高度:       48px
背景:       rgba(255,255,255,.88) + backdrop-filter blur(20px)
定位:       sticky top:0
底部分隔:   1px solid rgba(0,0,0,.06)
布局:       flex, space-between, align-items: center
左右内边距: 0 40px

Logo:
  - 字体: SF Pro Display, 16px, 700
  - 图标: ◆, 颜色 var(--accent)

导航链接:
  - 字体: 12px, 400, color var(--text-secondary)
  - 间距: 32px
  - hover: color var(--text-primary)

导航 CTA 按钮:
  - 类型: outline pill 按钮
  - padding: 7px 16px
  - border: 1px solid var(--accent-border)
  - hover: 填充绿色背景, 白色文字
  - transition: cubic-bezier(.25,0,.15,1) 0.3s
```

### 3.2 按钮 (`.btn-pill`)

```
通用:
  - display: inline-flex
  - padding: 14px 30px
  - border-radius: 100px
  - font-size: 15px, 600
  - transition: cubic-bezier(.25,0,.15,1) 0.35s
  - cursor: pointer

主要按钮 (.primary):
  - background: var(--accent)
  - color: #fff
  - hover: background var(--accent-hover), scale(1.02)
  - active: scale(.97)

次要按钮 (.secondary):
  - border: 1px solid var(--border)
  - background: transparent
  - color: var(--text-primary)
  - hover: border-color var(--text-secondary)

CTA 区大按钮:
  - padding: 16px 44px
  - font-size: 17px
```

### 3.3 区块标签 (`.sec-label`)

```
布局:       inline-flex, gap 8px
字体:       12px, 600, color var(--accent)
间距:       letter-spacing .04em, margin-bottom 14px
装饰线:     ::after 伪元素, 24px 宽, 2px 高, currentColor
变体:       .sec-label--text-only 隐藏装饰线
```

### 3.4 功能卡片 (`.feat-card`)

```
布局:       flex column
背景:       #FFFFFF
内边距:     40px 28px
边框:       1px solid var(--border-light)
圆角:       var(--radius-md)
过渡:       all .4s cubic-bezier(.25,0,.15,1)

悬浮态:
  - border-color: var(--accent-border)
  - box-shadow: var(--shadow-green)
  - transform: translateY(-3px)

图标容器:
  - width/height: 44px
  - border-radius: 12px
  - background: var(--accent-subtle)
  - font-size: 22px
  - margin-bottom: 20px
  - aria-hidden="true"

标题:  18px, 600, margin-bottom 10px
描述:  14px, color var(--text-secondary), line-height 1.7
```

### 3.5 步骤数字 (`.step-num`)

```
width/height: 56px
background:   var(--accent)
color:        #fff
border-radius: 50° (圆形)
font-size:    20px, 700
box-shadow:   0 4px 12px rgba(34,197,94,.2)
margin:       0 auto 20px
```

### 3.6 数据指标 (`.metric-row`)

```
布局:       grid 3列
边框:       1px solid var(--border-light)
圆角:       var(--radius-md)
背景:       #FFFFFF
内间距:     44px 20px

数字:
  - font-size: 48px, 700
  - 颜色: var(--text-primary)
  - 强调色: var(--accent) (通过 .num-accent 类)

分隔符:
  - 使用 ::before 伪元素
  - 居中竖线, 高度60%, top 20%
```

### 3.7 Mockup (产品截图)

```
容器:
  - aspect-ratio: 16/10
  - border-radius: 20px
  - box-shadow: var(--shadow-lg)

标题栏:
  - 红/黄/绿 macOS 风格圆点
  - 毛玻璃背景
  - URL 标签

内容区:
  - flex 居中布局
  - 两张卡片 + 箭头
  - 卡片可 hover 上浮
```

### 3.8 页脚 (`.footer`)

```
背景:     var(--bg-section)
上边线:   1px solid var(--border-light)
内边距:   48px 24px 24px
布局:     flex space-between
            → 移动端: flex column
品牌区:   最大 200px
链接列:   gap 48px (移动端 32px)
底部:     36px margin-top, 20px padding-top
            border-top + flex space-between
```

---

## 四、页面结构

```
Nav (sticky, 48px)
├─ Logo ◆DemoGo
└─ Nav Links: [功能介绍] [使用流程] [免费使用]

Hero Section
├─ Badge: "免费内测中"
├─ h1: "做完作品，直接扔个链接"
├─ p: 描述文字
├─ CTAs: [免费开始使用] [看看怎么玩 →]
└─ Mockup: macOS 风格窗口 → 项目→链接流程

Features Section (深灰背景 + 绿色光晕)
├─ Label: "核心功能"
├─ h2: "做完，发出去，就这么简单"
├─ p: 描述
└─ 3列卡片网格
   ├─ ⚡ 秒上线
   ├─ 🔗 闭眼分享
   └─ 🛠️ 通吃所有工具

Steps Section (白色背景)
├─ Label: "就三步"
├─ h2: "比泡面还快"
└─ 3列步骤
   ├─ ① 做出东西
   ├─ ② 扔进 DemoGo
   └─ ③ 丢链接出去

Metrics Section (深灰背景 + 绿色光晕)
├─ Label: "数据说话"
└─ 3列数据
   ├─ 500+ 创作者已加入
   ├─ 2,300+ 本周生成的演示
   └─ 97% 愿意推荐给朋友

CTA Section (白色背景)
├─ Label: "还等什么？"
├─ h2: "你的下个作品，现在就发出去"
├─ p: 描述
├─ CTA: [免费开始使用]
└─ Note: "无需信用卡，随时取消"

Footer
├─ Brand: ◆DemoGo + tagline
├─ Links: 产品(3) + 资源(3)
└─ Bottom: Copyright + Social
```

---

## 五、交互规范

| 元素 | 常态 | Hover | Active | 过渡 |
|------|------|-------|--------|------|
| 导航链接 | `color: text-secondary` | `color: text-primary` | — | `color .2s` |
| 导航 CTA | outline pill | 填充绿色 | — | `all .3s cubic-bezier` |
| 主按钮 | 绿色填充 | 深绿 + scale(1.02) | scale(.97) | `all .35s cubic-bezier` |
| 次要按钮 | border + 透明 | border 加深 | — | `all .35s cubic-bezier` |
| 功能卡片 | 白底 + 浅边框 | 绿色边框 + 阴影 + 上浮3px | 上浮1px | `all .4s cubic-bezier` |
| 步骤卡片 | 平铺 | 上浮2px | — | `transform .3s` |
| Mockup 卡片 | 白底 + 浅阴影 | 上浮 + 深阴影 | — | `transform .3s` |
| 页脚链接 | `color: text-secondary` | `color: text-primary` | — | `color .2s` |

---

## 六、响应式断点

### 900px 断点（平板/小桌面）

| 组件 | 变化 |
|------|------|
| 全局间距 | `120px → 80px` |
| 导航 | padding 0 40px → 0 20px；导航链接隐藏（仅保留 CTA） |
| Hero | padding 100px 24px 80px → 80px 20px 60px |
| 卡片网格 | 3列 → 1列 |
| 数据指标 | border 容器 → 无边框，竖线→上边线 |
| CTA 区 | 按钮全宽居中 |
| 页脚 | flex row → column |
| Mockup | 水平 → 垂直，箭头旋转 90° |

### 480px 断点（手机）

| 组件 | 变化 |
|------|------|
| 按钮 | 全宽 |
| CTA 区 | 按钮全宽居中 |

---

## 七、代码规范

### 7.1 CSS 架构

- **CSS 变量**：集中定义在 `:root`，使用 `--` 前缀命名
- **选择器**：基于类名，避免嵌套过深
- **过渡**：统一使用 `cubic-bezier(.25,0,.15,1)`（Apple 常用缓动）
- **字体**：系统原生字体栈，零外部请求

### 7.2 可访问性规范

| 要求 | 实现方式 |
|------|---------|
| 焦点样式 | `:focus-visible` 绿色 outline |
| 动效安全 | `@media (prefers-reduced-motion: reduce)` 禁用动画 |
| 选中样式 | `::selection` 绿色半透明背景 |
| 装饰性图标 | `aria-hidden="true"` |
| 语义结构 | `<nav>`, `<section>`, `<footer>`, `<h1-h4>` |

### 7.3 性能规范

- **零外部请求**：字体使用系统栈，无 Google Fonts 等外部依赖
- **单文件**：所有 CSS 内联，无额外样式表加载
- **无 JavaScript**：纯 CSS 实现全部交互效果

---

## 八、后续开发指南

### 8.1 迁移到框架

当从原型迁移到实际框架（React/Vue）时：

1. **CSS 变量保持不变**：可直接复制 `:root` 到全局样式
2. **组件拆分**：每个视觉组件对应一个独立组件文件
3. **BEM 命名**：建议保留现有类名结构，或迁移至 CSS Modules
4. **交互使用 CSS**：优先使用 CSS hover/active，避免 JS 介入

### 8.2 多页扩展

当前设计包含落地页，后续页面（登录、工作台、管理后台）应遵循：

- 继承同一套 CSS 变量
- 保持 `--section-gap` 间距规范
- 使用相同按钮/卡片/表单组件样式
- 保持相同的圆角系统和阴影层级

### 8.3 主题定制

如需暗色模式：

- 在 `:root` 或 `[data-theme="dark"]` 中覆盖色彩变量
- 调整 `--bg` → 深色, `--text-primary` → 浅色
- 调整 `--accent-subtle`/`--shadow-*` 透明度
- 其他令牌（字体/间距/圆角）保持不变

---

*本文档基于 `demogo-landing-ios.html` (v1.0) 生成，作为开发团队的唯一设计参考。*
