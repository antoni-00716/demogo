# DemoGo Codex 上下文

## 协作原则

用户没有技术背景，但具备产品和商业判断力。回答和开发时要解释业务含义、技术逻辑和实现方式。

DemoGo 的开发原则：

- 优先低成本、快速验证、可上线。
- 不追求一开始完美，但要保证基本稳定和可信。
- 不要大规模重构。
- 不要引入不必要依赖。
- 不要删除线上用户数据。
- 代码发布必须批量发布，不要改一个小功能就部署一次。

发布前必须执行：

1. 自己做代码审查；
2. 自己做测试；
3. 两者通过后，再给部署包和部署步骤。

后续所有代码变更必须遵守 `DEMOGO_ENGINEERING_PROCESS.md`：

- 先明确需求和范围；
- 修改前阅读现有代码；
- 修改后先做代码自审；
- 自审通过后做自我测试；
- 测试通过后，才能交付用户发布和最终测试；
- 交付时必须说明变更内容、测试结果、部署步骤和回滚方式。

## 当前阶段

DemoGo 已完成可用 MVP 雏形，线上版本已推进到 `v0.1.11`。

v0.1.11 已上线并通过基础线上验收：

- 后端健康检查返回 `0.1.11`；
- Nginx API 代理返回 `0.1.11`；
- MySQL 已作为主数据源；
- JSON 到 MySQL 迁移数量校验通过；
- 报名表单测试包已通过线上检测和发布测试；
- 管理端 Basic Auth 保护正常。
- 用户反馈入口已上线；
- 管理后台已有 Demo 搜索、状态筛选和风险标签；
- 用户端已有套餐申请、发布记录、复制转发文案；
- 管理后台已有升级申请处理能力。

当前产品已经可以：

- 用户注册登录；
- 上传 zip 项目包；
- 检测项目；
- 发布静态网页和常见前端源码项目；
- 生成可访问 Demo 链接；
- 统计访问次数；
- 用户下线、重新上线、删除下线 Demo；
- 管理后台查看用户和 Demo，并进行下线/删除操作；
- 用户提交反馈，管理后台查看反馈列表；
- 用户提交 Free / Lite / Pro 升级申请；
- 管理员处理升级申请并开通套餐或拒绝。

## 当前支持边界

支持：

- 静态 HTML 页面；
- 已构建的 `dist` / `build` 前端项目；
- 常见 React / Vue / Vite 源码项目；
- 通过 `npm run build` 生成静态产物的项目。

暂不支持：

- 完整后端服务；
- 数据库；
- 长期运行的 Node/Express 服务；
- Docker 应用；
- 真实表单数据托管；
- 飞书/腾讯文档集成；
- 在线支付。

## 技术结构

前端是静态 HTML：

- `index.html`
- `login.html`
- `app.html`
- `admin.html`

后端：

- Node.js + Express
- 主文件：`server/src/server.js`
- 主数据源：MySQL 8
- JSON 文件：服务器 `/var/lib/demogo/data/*.json`，短期作为迁移备份和回滚依据
- Demo 文件：服务器 `/var/www/demogo-preview/d/{slug}/`

部署包：

- `dist/demogo-site-preview.zip`
- 当前线上：`dist/demogo-server-v0.1.11.zip`、`dist/demogo-ops-scripts-v0.1.11.zip`
- 已完成本地打包待部署：`dist/demogo-server-v0.1.12.zip`、`dist/demogo-ops-scripts-v0.1.12.zip`

## 重要服务器信息

- 服务器公网 IP：`8.155.150.162`
- 后端服务：`demogo-server`
- 后端端口：`3001`
- Nginx 对外提供网页和 API 代理

验证命令：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1/api/health
curl http://8.155.150.162/api/health
```

应该返回：

```json
{"ok":true,"service":"demogo-server","version":"0.1.11"}
```

## 下一步优先事项

最新口径以 `DEMOGO_V0.1.12_PLAN.md` 为准。不要每开发一个小功能就发布一个版本，v0.1.12 应作为完整小版本统一开发、测试、打包和部署。

`v0.1.12` 定位为“前端现代化重构 + 试运营体验重设计版”，优先做：

1. 新建 `web/` 前端工程，使用 React + Vite + TypeScript；
2. 构建产物仍作为静态文件部署，保持 `/`、`/login.html`、`/app.html`、`/admin.html` 路径兼容；
3. 套餐名称统一为 Free / Lite / Pro；
4. 用户端新增“我的升级申请”列表，展示待处理、已开通、已拒绝和管理员说明；
5. 管理后台升级申请列表展示处理说明；
6. 首页、用户端、管理后台做一次系统性体验重设计；
7. 参考 Vercel、Netlify、Railway、Render 的项目、部署、事件流和运营后台组织方式；
8. 每个版本继续推进一小步架构迁移。

`v0.1.12` 暂不做：

- 大模型 AI；
- 表单托管正式功能；
- 在线支付；
- Docker 或完整后端应用发布。

## v0.1.12 本地交付状态

截至 2026-05-12，本地已完成 v0.1.12 的 React + Vite + TypeScript 前端迁移和打包准备：

- 新增 `web/` 前端工程；
- 首页、登录页、用户端、管理后台均由 React 工程构建；
- 构建产物保持 `/`、`/login.html`、`/app.html`、`/admin.html` 路径兼容；
- 首页改为面向真实用户的落地页，突出国内试用链路、免服务器/域名/部署折腾、发布前基础体检；
- 用户端保留 Demo 管理、上传发布、套餐申请、申请列表、发布记录、反馈入口、复制转发文案；
- 管理后台保留运营概览、升级申请处理、Demo 管理、用户列表、反馈处理；
- 套餐名称统一为 `Free`、`Lite`、`Pro`；
- 后端版本号更新为 `0.1.12`，数据库计划种子名称同步为 `Free`、`Lite`、`Pro`。

本地自测已通过：

- `web`: `npm run build`
- `server`: `npm run check`
- `server`: `npm run test:smoke`
- v0.1.12 打包脚本已生成三个包：
  - `dist/demogo-site-preview.zip`
  - `dist/demogo-server-v0.1.12.zip`
  - `dist/demogo-ops-scripts-v0.1.12.zip`
