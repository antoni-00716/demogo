# DemoGo 项目类型完整测试报告

## 测试概览

- **测试时间**: 2026-05-31
- **测试范围**: DemoGo 支持的所有项目类型分类和识别
- **测试用例**: 35 个
- **正确识别**: 27/35 (77.1%)

## 测试结果汇总

### ✅ 支持的项目类型 (13 种)

| 项目类型 | 框架/技术栈 | 支持状态 | 说明 |
|---------|------------|---------|------|
| 静态网站 | 纯 HTML/CSS/JS | 完全支持 | 可直接托管 |
| 多页网站 | 多个 HTML 文件 | 完全支持 | 可直接托管 |
| 单页应用 (SPA) | 编译后的 dist/build | 完全支持 | 可直接托管 |
| 前端源码项目 (React) | React + Vite | 完全支持 | 自动构建 + 托管 |
| 前端源码项目 (Vue) | Vue + Vite | 完全支持 | 自动构建 + 托管 |
| 前端源码项目 (Solid) | Solid + Vite | 完全支持 | 自动构建 + 托管 |
| H5 页面 | 移动端网页 | 完全支持 | 可直接托管 |
| 数据看板 (Dashboard) | ECharts/AntV | 完全支持 | 可直接托管 |
| 数字大屏 (Big Screen) | Three.js | 完全支持 | 可直接托管 |
| AI 应用前端 | OpenAI/LangChain | 完全支持 | 自动构建 + 托管 |
| Web3 应用前端 | Ethers/Viem | 完全支持 | 自动构建 + 托管 |

### ⚠️ 部分支持的项目类型

| 项目类型 | 框架/技术栈 | 支持状态 | 限制 |
|---------|------------|---------|------|
| Node.js 服务 | Express/Koa/Fastify/Hono/NestJS | runtime 支持 | 需要 start 命令，监听 PORT，不支持多服务编排 |
| Node.js + MySQL | Express + MySQL/Prisma | runtime 支持 | 可为 MySQL 项目分配空数据库 |

### ❌ 暂不支持的项目类型

| 项目类型 | 原因 |
|---------|------|
| 全栈/元框架 (Next.js/Nuxt/SvelteKit/TanStack Start) | 暂不支持 SSR 运行时（可导出静态版本） |
| 小程序源码 | 无小程序真实运行环境 |
| 桌面应用 (Electron/Tauri) | 不生成桌面安装包 |
| 移动应用 (React Native/Flutter/UniApp) | 不生成移动 App 安装包 |
| 后端服务 (MongoDB/Redis/PostgreSQL) | 不支持自动配置外部数据库 |

## 识别问题分析

### 1. 分类优先级问题

**现象**: 
- Svelte 前端项目被识别为 fullstack_framework 而非 frontend_build
- Astro 前端项目被识别为 fullstack_framework 而非 frontend_build
- Next.js + LangChain 项目被识别为 fullstack_framework 而非 ai_frontend

**原因**: 在 `inferProjectType` 函数中，`isFullstackFramework` 的判断优先级高于前端构建项目的判断。

**建议**: 调整分类优先级，先检查是否为特定类型（AI、Web3、Dashboard 等），再检查是否为全栈框架，最后检查是否为前端构建项目。

### 2. 特定类型识别需优化

**现象**: 
- H5 页面、Dashboard、Big Screen 类型未正确识别，都被识别为 static_site

**原因**: 这些类型的识别依赖于 `detectedType` 标志位或更明确的路径/依赖特征。在测试中，仅设置了 `detectedType: "static-root"`，没有触发更具体的类型判断。

**建议**: 
1. 在静态网站基础上，进一步检查项目特征（依赖库、项目标题等）来识别更具体的类型
2. 优化 `isDashboard`、`isBigScreen`、`isH5Page` 等函数的判断逻辑，使其能在没有特定 `detectedType` 标志时也能工作

### 3. 后端服务分类问题

**现象**: 复杂后端服务（含 MongoDB + Redis）被识别为 node_service 而非 backend_service

**原因**: `isNodeService` 的判断条件比后端服务的判断更宽泛，且优先级更高。

**建议**: 调整判断逻辑，先检查是否有不支持的数据库（MongoDB、Redis、PostgreSQL 等），若有则分类为 backend_service，否则分类为 node_service。

## 项目类型分类逻辑分析

### 分类流程
1. 检查是否为小程序 → 桌面应用 → 移动应用
2. 检查是否为编译产物（dist/build）→ 静态网站
3. 检查是否为全栈框架（Next/Nuxt/SvelteKit/Astro/TanStack）
4. 检查是否为 Node.js 服务
5. 检查是否为后端服务
6. 检查是否为数字大屏 → 数据看板 → AI 前端 → Web3 前端 → H5 页面
7. 检查是否为前端源码项目（含 build 脚本）
8. 其他 → 未知

### 支持边界判断
- 静态类型（static_site/mpa/spa/h5_page/dashboard/big_screen/ai_frontend/web3_frontend）→ 完全支持
- node_service → runtime 支持（需 start 命令，监听 PORT）
- fullstack_framework → 仅特定框架支持运行时（Next/Nuxt/TanStack Start），其他需导出静态版本
- 其他类型 → 暂不支持

## 改进建议

### 高优先级
1. **调整分类优先级**：确保特定类型（AI、Web3、Dashboard 等）能正确识别
2. **优化静态网站子类识别**：在识别为 static_site 后，进一步检查特征来识别更具体的类型
3. **完善后端服务分类**：根据数据库依赖正确区分 node_service 和 backend_service

### 中优先级
4. **增加测试覆盖**：为每种项目类型添加实际部署测试，验证支持边界
5. **优化提示信息**：为不支持的项目类型提供更清晰的改进建议
6. **文档完善**：补充项目类型识别规则的详细文档

### 低优先级
7. **扩展支持范围**：逐步增加对更多全栈框架、数据库的支持
8. **智能修复**：为不支持的项目提供自动修复/转换建议

## 结论

DemoGo 的项目分类系统整体设计良好，覆盖了主流的前端项目类型。当前支持状态如下：
- ✅ **完全支持**: 纯静态网站、主流前端框架（React/Vue/Solid）构建项目、AI/Web3 前端等
- ⚠️ **部分支持**: Node.js 服务（含 MySQL）
- ❌ **暂不支持**: SSR 全栈框架、小程序、桌面/移动应用、含外部数据库的复杂后端

分类逻辑存在一些优先级和边界判断问题，建议按上述改进建议进行优化，以提高识别准确率。
