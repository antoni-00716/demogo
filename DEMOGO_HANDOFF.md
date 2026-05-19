# DemoGo 项目交接说明

更新时间：2026-05-11

## 1. 项目定位

DemoGo 是一个面向 AI 编程用户的 Demo 发布工具，核心目标是：

- 把 AI 编程工具生成的本地小产品，快速发布成可访问的测试链接。
- 主要服务 Demo 试用、客户演示、早期验证阶段。
- 早期重点不是完整云平台，而是解决“本地能跑，别人打不开”的问题。
- 当前阶段面向中国大陆用户，强调国内可访问、免用户自己买域名、免备案、免服务器配置。

当前域名：`demogo.cn`

当前服务器：

- 阿里云 ECS
- 公网 IP：`8.155.150.162`
- 操作系统：Alibaba Cloud Linux 3.2104 LTS 64 位

## 2. 当前版本

当前已上线版本：`v0.1.6`

线上访问：

- 官网：首页 `http://8.155.150.162/`
- 登录注册：`http://8.155.150.162/login.html`
- 用户端：`http://8.155.150.162/app.html`
- 管理后台：`http://8.155.150.162/admin.html`
- Demo 链接：`http://8.155.150.162/d/{slug}/`
- API 健康检查：`http://8.155.150.162/api/health`

## 3. 产品结构

DemoGo 当前分为三端：

1. 官网首页
   - 面向潜在客户
   - 解释 DemoGo 价值、适用场景、套餐和预约体验

2. 用户端
   - 用户注册登录
   - 上传 zip 项目包
   - 项目检测
   - 发布 Demo 链接
   - 查看自己的 Demo、状态、访问次数、估算流量
   - 下线、重新上线、删除下线 Demo

3. 管理后台
   - Basic Auth 保护
   - 查看用户、Demo、状态、访问次数、估算流量
   - 管理员下线 Demo
   - 删除已下线或已过期 Demo

## 4. v0.1.6 已实现能力

### 用户与权限

- 邮箱密码注册
- 邮箱密码登录
- HttpOnly Cookie Session
- 用户只能管理自己发布的 Demo

### 发布能力

支持上传 `.zip` 项目包，当前支持：

- 根目录包含 `index.html` 的静态网页
- `dist/index.html`
- `build/index.html`
- 包含 `package.json` 和 `scripts.build` 的常见前端源码项目
- React / Vue / Vite 等可构建前端项目

不完整支持：

- 需要独立后端服务的项目
- 需要数据库的完整 SaaS 系统
- 长期运行的 Node/Express 服务
- Docker 应用
- 表单数据托管、飞书/腾讯文档集成，尚未实现

### 项目检测

用户可以先点击“检测项目”，系统会返回：

- 是否可以发布
- 识别出的项目类型
- 可发布文件数量
- 项目大小
- 已忽略的无关文件
- 不能发布时的原因和建议

注意：用户不强制必须先点“检测项目”。后端在发布时也会再次检测。

### 自动忽略无关文件

发布时会自动忽略：

- `node_modules`
- `.git`
- `.cache`
- `.vscode`
- 日志文件
- 临时文件
- 常见构建缓存

敏感文件、密钥文件、可执行脚本会被阻止发布。

### Demo 管控

免费版当前规则：

- 当前在线 Demo：1 个
- 每月发布/更新：3 次
- Demo 有效期：7 天

Lite / Pro 规则已在后端代码中预置，但当前还没有正式支付和订单系统。

### Demo 更新

- 已发布 Demo 可以上传 V2/V3 更新
- 原链接保持不变
- 更新成功后替换内容
- 更新失败不影响原版本
- 更新消耗每月发布/更新次数

### 下线、重新上线、删除

- 已发布 Demo 可以下线
- 下线后链接不可访问
- 下线 Demo 可重新上线
- 已下线或已过期 Demo 可以删除
- 已发布 Demo 不允许直接删除，必须先下线
- 删除为软删除记录，文件会物理删除，历史记录保留

### 访问统计

v0.1.6 增加：

- Demo 访问次数
- 估算流量
- 管理后台总访问

注意：估算流量目前通过前端浏览器 `performance` 估算，可能显示 `0B`。后续要做准确流量管控，应接入 Nginx 日志统计。

## 5. 当前技术架构

### 前端

当前是静态 HTML/CSS/JS：

- `index.html`
- `login.html`
- `app.html`
- `admin.html`
- `terms.html`
- `privacy.html`
- `content-policy.html`
- `assets/demogo-hero.png`

### 后端

Node.js + Express：

- 主文件：`server/src/server.js`
- 包管理：`server/package.json`
- 端口：`3001`
- systemd 服务：`demogo-server`

### 数据存储

当前使用 JSON 文件，存放在服务器：

- `/var/lib/demogo/data/users.json`
- `/var/lib/demogo/data/sessions.json`
- `/var/lib/demogo/data/demos.json`
- `/var/lib/demogo/data/audit-logs.json`

上传临时目录：

- `/var/lib/demogo/uploads`

Demo 文件目录：

- `/var/www/demogo-preview/d/{slug}/`

### Nginx

Nginx 负责：

- 静态页面服务
- `/api/` 代理到 `127.0.0.1:3001`
- `/admin.html` Basic Auth 保护
- `/d/{slug}/` Demo 静态访问

## 6. 当前部署包

最新包在：

- `dist/demogo-site-preview.zip`
- `dist/demogo-server-v0.1.6.zip`
- `dist/demogo-ops-scripts-v0.1.6.zip`

部署脚本：

- `scripts/upload-demogo-packages.ps1`
- `scripts/server-deploy-demogo-v0.1.6.sh`
- `scripts/server-verify-demogo.sh`
- `scripts/server-clean-demogo-data.sh`

## 7. 部署流程

本地 PowerShell：

```powershell
cd C:\Users\wei.gu\Documents\Codex\2026-05-07\codex-agent-github
.\scripts\upload-demogo-packages.ps1
```

服务器：

```bash
cd /tmp
unzip -o demogo-ops-scripts-v0.1.6.zip
sed -i 's/\r$//' server-deploy-demogo-v0.1.6.sh server-verify-demogo.sh server-clean-demogo-data.sh
chmod +x server-deploy-demogo-v0.1.6.sh server-verify-demogo.sh
./server-deploy-demogo-v0.1.6.sh
./server-verify-demogo.sh
```

验证：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1/api/health
curl http://8.155.150.162/api/health
```

正常返回：

```json
{"ok":true,"service":"demogo-server","version":"0.1.6"}
```

## 8. 已知问题与注意事项

1. 发布按钮体验
   - 当前有“检测项目”和“开始发布”两个按钮。
   - 后端发布时已经会自动检测。
   - 下一版建议优化前端文案，让用户明确“发布会自动先检测”。

2. 流量统计
   - 当前是前端估算，可能显示 `0B`。
   - 后续应接入 Nginx 日志，做真实流量统计。

3. 支付和订单
   - 当前只是展示和人工开通思路。
   - 不建议马上做复杂支付系统。
   - MVP 阶段可先人工收款、后台改套餐。

4. 数据库
   - 当前使用 JSON 文件。
   - MVP 可接受。
   - 用户增长后应迁移到 SQLite 或 PostgreSQL。

5. 后端应用发布
   - 当前重点是静态 Demo 和前端源码项目。
   - 不要过早支持任意后端、数据库、Docker，否则复杂度和成本会快速上升。

## 9. 下一版建议

建议版本：`v0.1.7`

优先级：

1. 优化发布按钮文案
   - “开始发布”自动先检测，再发布
   - 检测失败显示结构化原因

2. 引入 Nginx 日志统计
   - 真实访问次数
   - 真实流量
   - 为后续套餐限制做准备

3. 增加套餐后台调整能力
   - 管理员可把用户从免费版改为 Lite / Pro
   - 不急着接支付

4. 增强项目检测报告
   - 明确展示入口文件
   - 展示是否含 `package.json`
   - 展示是否有 build 命令

5. 明确支持边界
   - 在用户端文案中说明当前支持静态页面、前端项目
   - 暂不支持完整后端服务、数据库、Docker 应用

## 10. 给新 Codex 项目的启动提示词

把下面这段发给新 Codex 项目：

```text
你现在接手 DemoGo 项目。请先阅读 DEMOGO_HANDOFF.md 和 DEMOGO_CODEX_CONTEXT.md，再查看当前目录结构。

DemoGo 是一个面向 AI 编程用户的 Demo 发布工具，当前已上线 v0.1.6，服务器是阿里云 ECS，公网 IP 8.155.150.162。

当前重点不是重构，而是在现有 MVP 基础上继续小步迭代。所有代码修改必须遵守：

1. 先理解现有结构和逻辑；
2. 不要大规模重构；
3. 不要删除用户数据；
4. 每次发布前必须先做代码审查；
5. 代码审查后必须自己测试；
6. 测试通过后再给部署包和部署步骤；
7. 优先低成本、快速验证、可上线。

下一步优先做 v0.1.7：

- 优化“开始发布”体验，让用户明确发布会自动先检测；
- 接入更准确的 Nginx 访问日志统计；
- 增加管理后台调整用户套餐能力；
- 保持当前静态/前端项目发布边界，不要马上支持完整后端应用。
```

