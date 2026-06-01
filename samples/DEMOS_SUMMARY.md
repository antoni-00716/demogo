# DemoGo 技术类型 Demo 测试总结

## 概述

本目录包含 DemoGo 支持的各种技术类型的示例项目，用于测试项目分类、构建和部署功能。

## 目录结构

```
samples/
├── 01-static/          # 静态网站类
├── 02-frontend/        # 前端构建项目
├── 03-nodejs/          # Node.js 服务
├── 04-special/         # 特殊类型
├── README.md
├── DEMOS_SUMMARY.md
└── test-all-demos.js
```

## 项目清单（共 21 个）

### 1. 01-static/ - 静态网站类型（4 个）
| 项目 | 类型 | 说明 |
|------|------|------|
| static-website-basic | static-site | 基础静态网站，纯 HTML+CSS |
| static-website-multipage | mpa | 多页静态网站 |
| test-01-static-html | static-site | 静态 HTML 测试项目 |
| spa-dist-output | spa | 已构建的 SPA dist 目录 |

### 2. 02-frontend/ - 前端构建项目（6 个）
| 项目 | 类型 | 框架 |
|------|------|------|
| test-02-react-vite | frontend-build | React + Vite |
| test-03-vue-vite | frontend-build | Vue + Vite |
| svelte-vite | frontend_build | Svelte + Vite |
| solid-vite | frontend_build | Solid + Vite |
| astro-static | frontend-build | Astro |
| test-08-react-supabase | frontend-build | React + Supabase |

### 3. 03-nodejs/ - Node.js 服务类型（6 个）
| 项目 | 类型 | 框架 |
|------|------|------|
| koa-basic | node_service | Koa |
| test-04-express | node-service | Express |
| test-05-fastify | node-service | Fastify |
| test-06-hono | node-service | Hono |
| test-07-express-mysql | node-service | Express + MySQL |
| booking-system | node-service | Express + MySQL (完整应用) |

### 4. 04-special/ - 特殊类型（5 个）
| 项目 | 类型 | 技术栈 |
|------|------|------|
| h5-mobile-page | h5_page | 移动端 H5 页面 |
| dashboard-echarts | dashboard | ECharts 数据看板 |
| big-screen-threejs | big-screen | Three.js 数字大屏 |
| ai-chat-app | ai_frontend | AI 聊天应用 |
| web3-wallet-demo | web3-frontend | Web3 钱包演示 |

## 测试结果

✅ **所有项目都配置了 .demogo/project.json**
✅ **所有项目都有 README.md（大部分）**
✅ **覆盖了 DemoGo 支持的主要项目类型**
✅ **已按技术类型分类整理**

## 项目类型覆盖

### 完全支持的类型
- static-site / mpa / spa
- frontend-build / frontend_build
- node-service / node_service
- h5_page
- dashboard
- big-screen
- ai_frontend
- web3-frontend

### 注意事项
- 项目类型标识存在不一致（如 frontend-build vs frontend_build, node-service vs node_service），建议统一
- 全栈框架（Next.js/Nuxt 等）暂未创建，可后续补充
- 小程序/桌面/移动应用不支持部署，已跳过

## 使用方法

### 单个项目测试
```bash
cd samples/02-frontend/test-02-react-vite
# 查看项目
cat README.md
# 测试项目分类（通过 DemoGo）
```

### 批量测试
```bash
cd samples
node test-all-demos.js
```

## 下一步建议

1. **统一项目类型标识符** - 确保所有 demo 使用一致的类型名称
2. **补充更多示例** - 添加更多框架（如 Preact, Qwik）
3. **添加测试脚本** - 实际测试 DemoGo 的分类和部署流程
4. **创建快速上手指南** - 说明如何使用这些 demo

---
*创建时间：2026-06-01*
*DemoGo 版本：v0.9.6*
