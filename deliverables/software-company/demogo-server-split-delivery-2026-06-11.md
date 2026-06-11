# DemoGo server.js 拆分重构 — 交付报告

**日期**: 2026-06-11
**版本**: v0.9.39
**团队**: software-demogo-server-split
**状态**: ✅ 已部署到线上服务器 (demogo.cn)

---

## TL;DR

将 `server.js` 从 **2675 行** 的 God Object 拆解为 **1086 行** 的轻量入口文件，迁移 **40 个函数** 到共享库和专用服务，消除了惰性注入模式，修复了 2 个潜在的运行时崩溃 bug，176/176 测试全部通过并已部署到生产环境。

---

## 交付概览

| 指标 | 数值 |
|------|------|
| 总迁移函数 | **40 个** |
| 净删除行数 | **~1,323 行** |
| 新建文件 | **1 个** (`lib/file-utils.js`) |
| 修改文件 | **5 个** |
| 测试通过率 | **176/176 (100%)** |
| 修复的 Bug | **2 个** (logger 缺失、demoSlug 对象处理) |
| Commits | **6 个** |
| 线上状态 | ✅ 健康运行 (v0.9.39) |

---

## 任务清单

| ID | 描述 | Commit | 变更 |
|----|------|--------|------|
| T01 | 替换 13 个本地函数为共享库 import | `9459df7` | +241 / −347 |
| T02 | 合并 8 个辅助工具函数到共享库 | `69ecdd1` | −36 (净) |
| T03 | 消除 `setFileHandlers` 惰性注入 | `862a0d6` | +57 / −95 |
| T04 | 提取 `restartDemoRuntime` 到 pipeline | `3f77d18` | +108 / −107 |
| T05 | 删除 15 个重复函数，pipeline 成为唯一来源 | `523fa95` | +26 / −1304 |
| — | 版本提升至 v0.9.39 | `8cacc54` | +115 / −1 |

---

## 文件变更清单

### 新建文件
- `server/src/lib/file-utils.js` — `removePath`, `copyDemoArchive`, `shouldCopyDemoArchivePath`

### 修改文件
- `server/src/server.js` — 从 2675 行缩减至 1086 行
- `server/src/lib/slug-utils.js` — 修复 `demoSlug`（支持对象）、新增 `extractDemoSlug`
- `server/src/services/deployment-pipeline-service.js` — 新增 logger import、接管 18 个函数、消除 setFileHandlers
- `server/src/services/demo-lifecycle-service.js` — 清理死代码

### 新增部署脚本
- `scripts/server-deploy-demogo-v0.9.39.sh`
- `scripts/server-rollback-demogo-v0.9.39.sh`

---

## 修复的 Bug

1. **logger import 缺失** — `deployment-pipeline-service.js` 第 1554 行调用了 `logger.error()` 但未导入 logger，在 `performUpdateDeployment` 的清理路径上会触发 ReferenceError 导致 500 错误
2. **demoSlug 对象处理** — 共享库版本仅执行 `String(demoId || "")`，而 server.js 版本需要处理 `{ slug: "xxx" }` 对象参数。修复后使用 server.js 的版本

---

## 架构变化

### 重构前
```
server.js (2675 行)
├── 13 个函数有共享库副本但未使用
├── 3 个文件操作函数本地定义
├── 15 个函数与 deployment-pipeline-service 重复
├── setFileHandlers 惰性注入 (死代码)
├── restartDemoRuntime 本地定义
└── logger 在 pipeline service 中缺失
```

### 重构后
```
server.js (1086 行)
├── 路由注册 + 中间件 + 初始化
├── pipelineService 实例 (唯一事实源)
├── 薄编排层
└── 无重复函数

deployment-pipeline-service.js
├── 18 个导出函数
├── 无惰性注入
├── logger 已导入
└── 可独立测试
```

---

## 用户下一步建议

1. **监控线上行为** — 部署后 24 小时内关注服务器日志和错误率，确保 `performCreateDeployment` / `performUpdateDeployment` 的 inspection 路径切换 (flat → nested) 无异常
2. **删除 `demo-lifecycle-service.js`** — 该文件所有函数已迁移，factory 从未被调用，可完全删除
3. **补充分散函数** — server.js 中仍有 `redirectDemoAlias`, `readBearerToken`, `getUserFromRequest`, `resolveAgentUpdateDemoId` 等函数，可考虑后续提取到独立的 `auth-helpers.js` / `route-helpers.js`
4. **pipeline service 测试** — `deployment-pipeline-service.js` 现有 ~1500 行无独立测试，建议为核心路径（performCreateDeployment、extractStaticDemo）添加单元测试
