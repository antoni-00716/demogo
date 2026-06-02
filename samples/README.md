# DemoGo 测试 Demo 集合

包含 DemoGo 支持的各类技术类型的示例项目，用于测试项目分类、构建和部署功能。共 21 个项目。

## 目录结构

```
samples/
├── 01-static/          # 静态网站类（4个）
├── 02-frontend/        # 前端构建项目（6个）
├── 03-nodejs/          # Node.js 服务（6个）
├── 04-special/         # 特殊类型（5个）
└── test-all-demos.js   # 批量测试脚本
```

## 项目清单

### 01-static/ — 静态网站

| 项目 | 类型 | 说明 |
|------|------|------|
| static-website-basic | static-site | 基础静态网站，纯 HTML+CSS |
| static-website-multipage | mpa | 多页静态网站 |
| test-01-static-html | static-site | 静态 HTML 测试项目 |
| spa-dist-output | spa | 已构建的 SPA dist 目录 |

### 02-frontend/ — 前端构建项目

| 项目 | 类型 | 框架 |
|------|------|------|
| test-02-react-vite | frontend-build | React + Vite |
| test-03-vue-vite | frontend-build | Vue + Vite |
| svelte-vite | frontend_build | Svelte + Vite |
| solid-vite | frontend_build | Solid + Vite |
| astro-static | frontend-build | Astro |
| test-08-react-supabase | frontend-build | React + Supabase |

### 03-nodejs/ — Node.js 服务

| 项目 | 类型 | 框架 |
|------|------|------|
| koa-basic | node_service | Koa |
| test-04-express | node-service | Express |
| test-05-fastify | node-service | Fastify |
| test-06-hono | node-service | Hono |
| test-07-express-mysql | node-service | Express + MySQL |
| booking-system | node-service | Express + MySQL（完整应用） |

### 04-special/ — 特殊类型

| 项目 | 类型 | 技术栈 |
|------|------|------|
| h5-mobile-page | h5_page | 移动端 H5 页面 |
| dashboard-echarts | dashboard | ECharts 数据看板 |
| big-screen-threejs | big-screen | Three.js 数字大屏 |
| ai-chat-app | ai_frontend | AI 聊天应用 |
| web3-wallet-demo | web3-frontend | Web3 钱包演示 |

## 类型覆盖

完全支持：static-site、mpa、spa、frontend-build、node-service、h5_page、dashboard、big-screen、ai_frontend、web3-frontend

> 注意：项目类型标识存在不一致（如 frontend-build vs frontend_build），建议统一。

## 使用方法

```bash
cd samples/02-frontend/test-02-react-vite  # 单个项目
cd samples && node test-all-demos.js        # 批量测试
```
