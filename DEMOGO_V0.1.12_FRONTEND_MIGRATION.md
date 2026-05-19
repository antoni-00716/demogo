# DemoGo v0.1.12 前端现代化迁移方案

更新时间：2026-05-12

## 1. 结论

v0.1.12 不再继续在 `index.html`、`app.html`、`admin.html` 上堆功能。

建议正式启动前端现代化迁移：

```text
React + Vite + TypeScript
```

版本定位调整为：

```text
前端现代化重构 + 三端体验重设计版
```

目标不是追求技术炫技，而是解决当前页面已经难以继续支撑产品试运营的问题。

## 2. 为什么现在要迁移

当前静态 HTML 方式的优点是快，但已经开始暴露明显问题：

- 首页、用户端、管理后台都在单文件里堆 CSS 和 JS；
- 用户端和管理后台交互越来越多，维护成本快速上升；
- 套餐、状态、列表、按钮、提示文案重复散落；
- 后续表单托管、Demo 详情、反馈列表、升级申请列表会让 HTML 文件更复杂；
- 页面体验要整体升级，继续补 HTML 会形成更重的历史债务。

从 v0.1.12 开始迁移，时机合适：

- 后端 API 已经基本成型；
- MySQL 已经接入；
- 用户端、管理端、首页三端都需要重设计；
- 还没有大量复杂前端资产，迁移成本可控。

## 3. 为什么选择 React + Vite

### React

适合 DemoGo 的原因：

- 更适合 SaaS 控制台和运营后台；
- 组件生态成熟；
- 后续 Demo 列表、发布记录、升级申请、反馈列表都适合组件化；
- 未来如果接入更复杂的表单托管和数据表，维护更清晰。

### Vite

适合 DemoGo 的原因：

- 构建快；
- 输出静态文件，适合当前 Nginx 部署；
- 不需要引入服务端渲染；
- 不需要大改后端；
- 适合从现有静态页面平滑过渡。

### TypeScript

建议引入。

原因：

- API 数据结构越来越多；
- 套餐、反馈、升级申请、Demo 状态都需要类型约束；
- 可以减少前端字段拼错和状态判断错误。

## 4. 暂不选择的方案

### 不选 Next.js

原因：

- 当前不需要服务端渲染；
- 会增加部署复杂度；
- 需要额外 Node 前端服务或静态导出配置；
- 对当前 MVP 试运营来说偏重。

### 不选 Vue

Vue 也能做，但 DemoGo 后续更像 SaaS 控制台，React 在团队协作、组件生态和未来扩展上更合适。

### 不引入大型 UI 框架

暂不引入 Ant Design、MUI 等大型 UI 框架。

原因：

- 容易让 DemoGo 看起来像通用后台模板；
- 视觉差异化会被框架限制；
- 当前组件数量还不多。

可以先自建轻量组件：

- Button；
- Card；
- Badge；
- Table；
- Tabs；
- Modal；
- Toast；
- EmptyState；
- MetricCard。

## 5. 推荐目录结构

```text
web/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    routes.tsx
    api/
      client.ts
      auth.ts
      demos.ts
      feedback.ts
      planRequests.ts
      admin.ts
    components/
      Button.tsx
      Card.tsx
      Badge.tsx
      Table.tsx
      Toast.tsx
      EmptyState.tsx
      MetricCard.tsx
      Shell.tsx
    pages/
      HomePage.tsx
      LoginPage.tsx
      UserDashboard.tsx
      AdminDashboard.tsx
    features/
      demos/
      plans/
      feedback/
      admin/
      inspections/
    styles/
      tokens.css
      global.css
    config/
      plans.ts
      statuses.ts
```

## 6. 路由策略

为了减少 Nginx 和后端改动，建议保持现有访问路径：

```text
/            首页
/login.html  登录页
/app.html    用户端
/admin.html  管理后台
```

实现方式：

- Vite 构建一个前端应用；
- 根据当前路径渲染不同页面；
- 构建后输出静态文件；
- 部署脚本把构建产物复制到 `/var/www/demogo-preview`；
- Nginx 现有路径尽量不变。

后续再考虑真正的 SPA 路由，如：

```text
/login
/app
/admin
```

当前不急。

## 7. 部署策略

保持线上部署模型不变：

```text
用户浏览器 -> Nginx -> 静态前端文件
                    -> /api 代理到 Node 后端
```

构建产物：

```text
web/dist/
```

打包时：

- 使用 React/Vite 构建生成静态文件；
- 将 `web/dist` 打包为 `demogo-site-preview.zip`；
- 后端包仍为 `demogo-server-v0.1.12.zip`；
- 运维脚本仍为 `demogo-ops-scripts-v0.1.12.zip`。

## 8. 迁移范围

### v0.1.12 必须迁移

- 首页；
- 登录页；
- 用户端；
- 管理后台；
- 前端 API 调用封装；
- 套餐配置；
- 状态标签；
- 基础组件。

### v0.1.12 不迁移

- 后端 Express 架构；
- MySQL 数据结构，除非页面功能必须；
- Nginx 路由；
- 支付；
- 表单托管；
- 大模型 AI；
- 微服务。

## 9. 页面改造重点

### 首页

按 `DEMOGO_V0.1.12_HOMEPAGE_DRAFT.md` 执行：

- 痛点落地页；
- 国内试用稳定性；
- 对比 Vercel / Netlify / 自建服务器 / 截图 zip；
- 发布前基础体检；
- Free / Lite / Pro；
- 支持边界和合规提醒。

### 用户端

重做为产品控制台：

- 概览；
- 我的 Demo；
- 上传发布；
- 套餐与额度；
- 我的升级申请；
- 本月发布记录；
- 反馈问题。

关键修复：

- Free / Lite / Pro 命名统一；
- 升级申请列表化；
- 拒绝原因可见；
- 待处理申请清楚展示；
- 发布记录列表化；
- 复制文案保持一键复制。

### 管理后台

重做为运营控制台：

- 运营概览；
- 待办事项；
- Demo 管理；
- 用户列表；
- 升级申请；
- 反馈列表；
- 最近事件；
- 系统状态。

关键修复：

- 升级申请展示处理说明；
- 反馈状态更清楚；
- 用户列表只读；
- 待办事项突出。

## 10. 风险控制

### 风险 1：一次迁移三端，范围变大

控制方式：

- 保持后端 API 不动；
- 保持部署路径不动；
- 先迁移页面表现和前端结构；
- 不同时做支付、表单托管、大模型。

### 风险 2：React 构建引入新部署问题

控制方式：

- 本地先跑 `npm run build`；
- 部署包仍输出静态文件；
- 服务器 Nginx 不做大改；
- 保留回滚包。

### 风险 3：功能回归

控制方式：

- 前端自测清单；
- 后端 smoke test 保留；
- 新增前端构建检查；
- 部署后按用户端、管理后台、首页逐项验收。

### 风险 4：开发周期变长

控制方式：

- v0.1.12 聚焦前端架构和体验；
- 不并入新业务大功能；
- 先完成等价迁移和关键体验修复；
- 花哨交互后置。

## 11. 实施步骤

### 第一步：搭建 `web/`

- 初始化 React + Vite + TypeScript；
- 配置构建脚本；
- 配置基础样式和设计 token；
- 建立 API client。

### 第二步：首页重做

- 先完成 HomePage；
- 对照首页落地页文档；
- 确认视觉和文案。

### 第三步：登录页迁移

- 复用现有登录注册 API；
- 保持登录成功后跳转逻辑。

### 第四步：用户端迁移

- 迁移 Demo 列表、上传发布、反馈、套餐；
- 新增升级申请列表；
- 完善发布记录；
- 修复命名和拒绝原因展示。

### 第五步：管理后台迁移

- 迁移 Demo 管理；
- 迁移用户列表；
- 迁移升级申请；
- 迁移反馈列表；
- 增加运营待办。

### 第六步：打包部署

- 更新构建脚本；
- 更新部署脚本；
- 自审；
- 自测；
- 打包；
- 交付服务器部署步骤。

## 12. 验收标准

前端架构：

- `web/` 工程可独立构建；
- 构建产物可部署到现有 Nginx；
- 页面路径保持兼容；
- 不引入不必要的大型依赖。

首页：

- 首页不再是功能说明页，而是痛点落地页；
- 首屏打中“部署和打开”痛点；
- DemoGo 与国外平台、自建服务器、截图 zip 的差异清楚；
- 支持边界清楚。

用户端：

- Free / Lite / Pro 命名统一；
- 我的升级申请列表可见；
- 拒绝原因可见；
- 发布记录列表可见；
- 上传、检测、发布、更新、下线、恢复、删除功能可用。

管理后台：

- 待处理升级申请突出；
- 拒绝原因展示；
- 反馈列表可处理；
- 用户列表只读；
- Demo 管理功能可用。

测试：

- 前端构建通过；
- 后端 `npm run check` 通过；
- 后端 `npm run test:smoke` 通过；
- 页面手工验收通过；
- 部署脚本和回滚脚本可用。
