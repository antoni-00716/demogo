# DemoGo 项目类型差距分析报告

## 调研背景

根据对国际主流AI编程工具（GitHub Copilot、Cursor、Claude Code、Replit等）的调研，以及2026年前端技术趋势分析，目前AI工具生成的产品类型覆盖情况如下：

## DemoGo 现有支持（已覆盖）

### ✅ 已支持的项目类型（17种可识别，实际可部署 9种）

| 项目类型 | 支持状态 | 当前Demo |
|---------|---------|---------|
| `static_site` - 静态网站 | ✅ 完全支持 | static-website-basic, test-01-static-html |
| `mpa` - 多页网站 | ✅ 完全支持 | static-website-multipage |
| `spa` - 单页应用 | ✅ 完全支持 | spa-dist-output |
| `frontend_build` - 前端源码项目 | ✅ 完全支持 | test-02-react-vite, test-03-vue-vite, svelte-vite, solid-vite, astro-static, test-08-react-supabase |
| `fullstack_framework` - 全栈/元框架 | ⚠️ 可识别，部分支持 | - |
| `h5_page` - 移动H5页面 | ✅ 完全支持 | h5-mobile-page |
| `dashboard` - 数据看板 | ✅ 完全支持 | dashboard-echarts |
| `big_screen` - 数字大屏 | ✅ 完全支持 | big-screen-threejs |
| `ai_frontend` - AI应用前端 | ✅ 完全支持 | ai-chat-app |
| `web3_frontend` - Web3应用前端 | ✅ 完全支持 | web3-wallet-demo |
| `node_service` - Node.js单服务 | ✅ 完全支持 | test-04-express, test-05-fastify, test-06-hono, test-07-express-mysql, koa-basic, booking-system |

## 2026主流AI工具常用项目类型（差距分析）

### 🔥 缺失但高频使用的类型

| 项目类型 | 流行度 | 框架/技术 | DemoGo支持 | 优先级 |
|---------|--------|---------|-----------|--------|
| Next.js 项目 | ⭐⭐⭐⭐⭐ | Next.js 13+ App Router | ⚠️ 可识别（可静态导出） | P0 |
| Nuxt 项目 | ⭐⭐⭐⭐ | Nuxt 3+ | ⚠️ 可识别（可静态导出） | P0 |
| SvelteKit 项目 | ⭐⭐⭐ | SvelteKit | ⚠️ 可识别（可静态导出） | P1 |
| TanStack Start 项目 | ⭐⭐ | TanStack Start | ⚠️ 可识别（可静态导出） | P1 |
| Vite + Tailwind CSS | ⭐⭐⭐⭐⭐ | Vite + Tailwind CSS | ❌ 缺Demo | P0 |
| Vite + shadcn/ui | ⭐⭐⭐⭐ | Vite + shadcn/ui | ❌ 缺Demo | P0 |
| Vite + tRPC | ⭐⭐⭐ | Vite + tRPC | ❌ 缺Demo | P1 |
| Express + Prisma | ⭐⭐⭐⭐ | Express + Prisma | ❌ 缺Demo | P0 |
| NestJS 基础服务 | ⭐⭐⭐ | NestJS | ⚠️ 可识别 | P1 |
| AI 应用（带OpenAI API） | ⭐⭐⭐⭐⭐ | OpenAI API | ✅ 有ai-chat-app |  |
| 演示营销页（单页） | ⭐⭐⭐⭐ | HTML/CSS/JS | ✅ 已有 |  |

### 📊 现有Demo覆盖情况

- **静态网站类**：4个 Demo ✅
- **前端构建类**：6个 Demo ✅
- **Node.js服务类**：6个 Demo ✅
- **特殊类型类**：5个 Demo ✅
- **总计**：21个 Demo

## 建议补充的Demo（以达到95%覆盖）

### P0 - 立即补充（高频）
1. `vite-tailwind-shadcn` - Vite + React + Tailwind + shadcn/ui 完整演示
2. `nextjs-static-export` - Next.js 静态导出示例
3. `nuxt-static-export` - Nuxt 静态导出示例
4. `express-prisma-mysql` - Express + Prisma + MySQL 完整应用
5. `vite-trpc-prisma` - tRPC 全栈示例

### P1 - 重要补充
1. `sveltekit-static` - SvelteKit 静态示例
2. `nestjs-basic` - NestJS 基础服务
3. `astro-blog` - Astro 博客站点
4. `vite-storybook` - Storybook 组件库演示
5. `react-firebase` - Firebase 集成示例

### P2 - 小众补充
1. `remix-static` - Remix 静态导出
2. `quasar-app` - Quasar 跨端应用
3. `capacitor-app` - Capacitor 跨端应用
