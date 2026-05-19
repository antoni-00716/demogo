# DemoGo 架构对标与改造建议

更新时间：2026-05-11

## 1. 结论先行

DemoGo 当前最大差距不是“功能少”，而是代码和架构还停留在 MVP 快速验证形态。

参考 Vercel、Coolify、Dokploy、CapRover 这类成熟项目后，DemoGo 不应该马上照搬微服务或完整 PaaS，但应该立即补三类能力：

1. 后端从单文件逐步拆成模块化单体；
2. 发布、检测、反馈、套餐、管理后台 API 形成清晰边界；
3. 增加可持续测试、部署、回滚和运营支撑能力。

一句话：

> DemoGo 现阶段不需要变成 Coolify 或 CapRover，但必须从“一个能跑的脚本式后端”升级成“可持续迭代的模块化产品后端”。

本原则从 v0.1.10 开始固化为版本要求：

> 后续每个版本都必须包含至少一个小型架构演进项。业务功能可以快速迭代，但代码结构、数据库表结构、测试体系和部署体系不能长期停留在临时 MVP 形态。

架构演进不是一次性重构，而是持续迁移：

- 每次新增功能，优先放入清晰的 service / route / db / test 边界；
- 每次修改老功能，顺手拆出一小块可独立测试的逻辑；
- 每次新增数据能力，优先形成正式表结构，而不是只塞 JSON 字段；
- 每次发布版本，都补一条自动化测试或部署校验；
- 每次做运营后台，都沉淀成可查询、可筛选、可审计的数据结构。

## 2. 参考对象

### Vercel

参考点：

- 开源仓库是明显的 monorepo；
- 有 `api`、`packages`、`internals`、`examples`、`scripts`、`test`、`utils` 等目录；
- 使用包管理、测试、CLI、本地开发流程来支撑长期工程协作；
- 重点学习工程化、测试、包边界和 CLI 思路。

DemoGo 对应迁移方向：

- v0.1.x 先保持单仓库；
- v0.2 以后逐步形成 `server`、`site`、`shared`、`scripts`、`tests` 的清晰边界；
- 未来再考虑 CLI / API SDK / OpenAPI，而不是现在就做。

不照搬：

- Vercel 商业平台完整后台并非完全开源；
- DemoGo 当前不需要复杂 monorepo。

### Coolify

参考点：

- 典型自托管 PaaS；
- 目录包含 `app`、`database`、`docker`、`routes`、`resources`、`storage`、`tests`、`templates`；
- 说明成熟部署平台会把应用逻辑、路由、数据库、Docker、模板、测试拆开。

DemoGo 对应迁移方向：

- 发布、检测、构建、Demo 文件管理要从 `server.js` 中逐步拆出；
- 数据库表结构要服务长期运营，而不是只为当前页面拼字段；
- Docker / 构建隔离后置，但发布任务边界要提前抽象。

不照搬：

- DemoGo 当前不做完整自托管 PaaS；
- 不急于接入 Docker 服务编排。

### Dokploy

参考点：

- 采用 `apps`、`packages/server`、`openapi.json`、多个 Dockerfile、workspace 结构；
- 支持应用、数据库、备份、Docker Compose、多节点等；
- 重点学习 API 边界、服务分层、部署任务抽象。

DemoGo 对应迁移方向：

- 每个业务域形成独立 API 分组，例如 auth、demos、deployments、feedback、planRequests、admin；
- 后续把发布过程抽象成 deployment job；
- 后续引入构建日志、任务状态、失败原因统计。

不照搬：

- DemoGo 暂不做多节点、Docker Compose、数据库托管。

### CapRover

参考点：

- 有 `src`、`public`、`template`、`tests`、`dockerfiles`；
- 强调 Docker、Nginx、Let's Encrypt、CLI、Web GUI；
- 重点学习“简单界面 + 自动化运维”的产品思路。

DemoGo 对应迁移方向：

- 管理后台不只是看数据，还要能处理运营待办；
- 运维脚本要持续保留备份、验证、回滚；
- 正式域名、HTTPS、Nginx 配置、日志统计要逐步平台化。

不照搬：

- DemoGo 当前不是通用应用托管平台；
- 不把 Docker 作为 v0.1.x 主线。

## 3. DemoGo 当前代码状态

当前结构：

- 前端：`index.html`、`login.html`、`app.html`、`admin.html`
- 后端主文件：`server/src/server.js`
- 数据库层：`server/src/db/*`
- 运维脚本：`scripts/*`

主要问题：

- `server/src/server.js` 已接近 1900 行，包含路由、鉴权、业务逻辑、文件处理、检测、发布、统计、反馈、工具函数；
- 管理后台 API、用户 API、发布 API 混在同一个文件；
- 检测规则、部署逻辑、套餐额度、反馈逻辑没有形成模块边界；
- 本地测试主要靠临时脚本，不是固定测试命令；
- 还没有统一错误结构和 API 响应规范；
- 没有任务队列，构建和发布仍在主 API 流程里执行；
- 管理后台运营能力弱，套餐调整、反馈处理、用户运营还未成体系。

## 4. 应该马上改的内容

### A. 后端模块化单体

不要上来做微服务，但要拆模块。

建议目录：

```text
server/src/
  app.js
  server.js
  config.js
  routes/
    health.js
    auth.js
    me.js
    demos.js
    deploy.js
    inspect.js
    feedback.js
    admin.js
  middleware/
    auth.js
    admin.js
    upload.js
    error-handler.js
  services/
    users-service.js
    demos-service.js
    quota-service.js
    inspect-service.js
    deploy-service.js
    feedback-service.js
    audit-service.js
    usage-service.js
  db/
    mysql.js
    mysql-store.js
    schema.sql
  utils/
    crypto.js
    paths.js
    errors.js
    format.js
```

v0.1.9 不需要一次拆完，但至少要拆出：

- `config.js`
- `middleware/auth.js`
- `middleware/admin.js`
- `services/quota-service.js`
- `services/feedback-service.js`
- `services/audit-service.js`
- `routes/admin.js`

v0.1.10 起继续迁移：

- 新增业务优先进入独立 service；
- 新增数据库能力优先进入正式表；
- 新增后台列表必须有筛选、状态、审计日志；
- 新增关键流程必须进入 smoke test；
- 老的 `server.js` 每个版本至少减少或隔离一类职责。

### B. 管理后台 API 分组

当前管理能力会越来越多，需要提前分组：

```text
GET  /api/admin/overview
GET  /api/admin/users
POST /api/admin/users/:id/plan
GET  /api/admin/feedback
POST /api/admin/feedback/:id/status
POST /api/admin/demos/:id/offline
POST /api/admin/demos/:id/delete
```

### C. 统一运营状态

反馈状态建议统一为：

- `open`：待处理；
- `in_progress`：处理中；
- `resolved`：已处理；
- `closed`：已关闭。

套餐建议继续使用：

- `free`
- `lite`
- `pro`

### D. 固定测试命令

参考成熟项目的测试流程，DemoGo 至少要有固定命令：

```json
{
  "scripts": {
    "check": "node --check src/server.js",
    "test:smoke": "node src/tests/smoke-test.js"
  }
}
```

后续再逐步补：

- API 回归测试；
- 发布流程测试；
- 管理后台接口测试；
- MySQL 迁移验证测试。

### E. 发布任务后续 Worker 化

v0.1.9 不拆 Worker，但代码要为后续留边界。

当前发布流程仍可同步执行，但服务层应抽象为：

```text
createDeploymentJob()
inspectProject()
extractAndBuild()
publishStaticFiles()
recordDeploymentResult()
```

v0.3 再把其中耗时任务移到 Worker。

## 5. 不应该现在改的内容

暂不建议在 v0.1.9 做：

- 完整微服务拆分；
- Docker 应用托管；
- Kubernetes；
- 多节点部署；
- 对象存储 OSS；
- CI/CD 平台化；
- OpenAPI 全量规范化；
- CLI 工具。

这些是后续方向，不是当前阻塞。

## 6. v0.1.9 建议落地范围

v0.1.9 应该同时做产品功能和架构改造：

产品功能：

- 管理员手动调整套餐；
- 完整反馈列表；
- 反馈状态处理；
- 用户搜索和套餐筛选。

架构改造：

- 拆出配置模块；
- 拆出鉴权中间件；
- 拆出套餐额度服务；
- 拆出反馈服务；
- 拆出审计日志服务；
- 管理后台 API 分组；
- 增加固定 smoke test。

这样做的好处：

- 不影响当前线上能力；
- 不做大重构；
- 但能明显降低后续继续堆功能的风险。

## 7. 后续演进路线

### v0.1.9

模块化单体第一步，补管理运营能力。

### v0.1.10

试用转化闭环，补用户升级申请、后台申请处理、分享文案体验修复。

架构演进项：

- 新增 `plan_upgrade_requests` 正式表；
- 新增 `plan-request-service.js`；
- 升级申请进入固定 smoke test；
- 继续把运营状态从页面临时逻辑迁移到数据库和服务层。

### v0.2.0

表单托管，数据回收，表单提交数据后台。

### v0.3.0

发布任务 Worker 化，构建日志和任务状态独立化。

### v0.5+

对象存储、CDN、支付、备份、监控、OpenAPI、CLI。
