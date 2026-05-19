# DemoGo 部署状态记录 - 2026-05-08

## 当前环境

- 云服务商：阿里云
- ECS 公网 IP：`8.155.150.162`
- 操作系统：Alibaba Cloud Linux 3.2104 LTS 64 位
- Web Server：Nginx 1.20.1
- API Runtime：Node.js + systemd
- 当前访问协议：HTTP
- 当前域名状态：`demogo.cn` 备案中，尚未解析到 ECS

## 当前可访问地址

```text
http://8.155.150.162/             官网首页
http://8.155.150.162/app.html     用户控制台
http://8.155.150.162/admin.html   管理后台，已加 Basic Auth
http://8.155.150.162/d/{slug}/    用户 Demo 链接
http://8.155.150.162/api/health   API 健康检查
```

## 当前服务器目录

```text
/var/www/demogo-preview           前端页面和用户 Demo 根目录
/var/www/demogo-preview/d         用户 Demo 发布目录
/opt/demogo/server                DemoGo v0.1 API
/var/lib/demogo/uploads           上传 zip 临时目录
/var/lib/demogo/data              用户、session、Demo 元数据 JSON 存储
/etc/nginx/conf.d/demogo-preview.conf
/etc/nginx/.demogo_admin_pass     管理后台 Basic Auth 密码文件
```

## 当前 systemd 服务

```text
demogo-server.service
```

核心环境变量：

```text
PORT=3001
PUBLIC_BASE_URL=http://8.155.150.162
DEMOGO_UPLOAD_DIR=/var/lib/demogo/uploads
DEMOGO_DEMO_ROOT=/var/www/demogo-preview/d
DEMOGO_DATA_DIR=/var/lib/demogo/data
DEMOGO_DEPLOY_TOKEN=临时发布密码
DEMOGO_ADMIN_USER=admin
DEMOGO_ADMIN_PASSWORD=后台 API 密码
DEMOGO_BUILD_MODE=auto
DEMOGO_BUILD_DOCKER_IMAGE=node:20-alpine
DEMOGO_BUILD_DOCKER_MEMORY=512m
DEMOGO_BUILD_DOCKER_CPUS=1
```

常用命令：

```bash
sudo systemctl status demogo-server
sudo systemctl restart demogo-server
sudo journalctl -u demogo-server -n 100 --no-pager
```

## 当前 Nginx 能力

- `/` 静态官网
- `/app.html` 用户控制台
- `/admin.html` 管理后台，已启用 Basic Auth
- `/api/` 反向代理到 `127.0.0.1:3001`
- `/d/` 访问用户发布的静态 Demo
- 上传大小限制：`client_max_body_size 60m`

常用命令：

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo nginx -T | grep -A 20 -B 5 "location /api/"
```

## 当前已跑通能力

- 三端静态原型已部署：
  - 官网首页
  - 用户控制台
  - 管理后台
- 后端 API 已部署并常驻运行。
- `/api/health` 健康检查通过。
- 用户控制台上传 zip 已跑通。
- 上传包含 `index.html` 的 zip 后，可生成 `/d/{slug}/` 链接。
- 上传接口计划使用 `DEMOGO_DEPLOY_TOKEN` 做临时保护。
- 用户可下线自己的 Demo，下线后删除 `/d/{slug}` 目录并更新状态。
- 管理后台已加 Basic Auth。
- v0.1.1 已在本地完成：免费额度控制、真实用户端额度显示、管理后台真实概览。
- 阿里云 ECS 快照已创建。

## 当前 API 能力

```text
GET /api/health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/me
GET /api/demos
POST /api/deploy
POST /api/demos/:id/offline
GET /api/admin/overview
```

`POST /api/deploy` 字段：

```text
project: zip 文件
name: Demo 名称
```

成功返回：

```json
{
  "slug": "test-demo",
  "status": "published",
  "publicUrl": "http://8.155.150.162/d/test-demo/",
  "detectedType": "static-root",
  "fileCount": 1,
  "extractedBytes": 64
}
```

## 当前限制

- 只支持静态 Demo：
  - 根目录 `index.html`
  - `dist/index.html`
  - `build/index.html`
- 不执行 `npm install` / `npm run build`。
- 不支持数据库、后端服务、Docker 项目。
- 没有用户登录系统。
- 没有真实套餐扣减。
- 没有订单支付。
- 没有 Demo 到期自动下线。
- 已有手动下线接口，但管理后台尚未接真实下线操作。
- 没有管理后台真实数据。
- 仍是 HTTP，未配置 HTTPS。
- 使用公网 IP，域名备案通过前不建议公开传播。

## 已做安全措施

- 管理后台 Basic Auth。
- 上传限制 `.zip`。
- 上传大小限制 50MB。
- Nginx 上传大小限制 60MB。
- 解压路径穿越检查。
- 文件数量限制。
- 解压总大小限制。
- 拒绝 `.env`、`.git`、`*.key`、`*.pem`、`id_rsa` 等敏感文件。
- 拒绝常见可执行脚本/二进制扩展。

## 重要风险

- 当前构建和解压仍在主 ECS 上执行，后续需要用 Docker Worker 隔离。
- 当前没有用户系统，任何访问 `app.html` 的人都可以上传。
- 当前 `/api/deploy` 没有鉴权和限流。
- 当前 Demo 不会自动过期。
- 当前没有内容审核和举报后台流程。
- 当前管理后台只是静态原型，不是真实运营后台。

## 下一阶段建议

优先级从高到低：

1. 给 `/api/deploy` 加一个临时上传密码或 Basic Auth，防止任何人公开上传。
2. 增加 Demo 列表数据存储，先用 JSON 文件或 SQLite。
3. 增加删除/下线接口。
4. 增加到期时间和定时清理。
5. 增加用户登录和免费额度。
6. 增加构建 Worker，支持 Vite/React/Vue 源码包。
7. 备案通过后接入 `demogo.cn`、HTTPS 和备案号展示。

## v0.1.2 本地完成项

- 到期自动清理：服务启动时执行一次，之后每小时执行一次。
- 管理员下线任意 Demo：`POST /api/admin/demos/:id/offline`。
- 上传限流：默认 10 分钟内同用户或同 IP 最多 5 次发布。
- 审计日志：写入 `/var/lib/demogo/data/audit-logs.json`。
- 用户端和管理后台支持显示 `expired` 状态。

## v0.1.3 本地完成项

- 支持包含 `package.json` 的源码项目自动构建。
- 自动执行 `npm install` 或 `npm ci`。
- 自动执行 `npm run build`。
- 构建后发布 `dist/index.html` 或 `build/index.html`。
- 发布结果 `detectedType` 会显示为 `built-dist` 或 `built-build`。
- 当前构建仍在主机进程中执行，后续需要迁移到 Docker Worker 隔离。

## v0.1.4 本地完成项

- 支持 Docker 隔离构建。
- `DEMOGO_BUILD_MODE=auto` 时，检测到 Docker 会优先使用 `node:20-alpine` 临时容器构建。
- 支持配置 Docker 构建内存、CPU 和镜像。
- 无 Docker 时可回退到主机进程构建；正式开放前建议使用 Docker 模式。

## v0.1.5 本地完成项

- 免费体验版保持同一时间最多 1 个在线 Demo，本月发布/更新次数为 3 次。
- 下线 Demo 时保留离线归档，用户可重新上线。
- 用户端新增“重新上线”操作。
- 上传区域改为大面积拖拽/点击选择 zip。
- Demo 名称默认留空，不再带入示例业务名称。
- 用户端“我的 Demo”不再展示内置假数据，登录后只显示真实 Demo。
- 有效期改为按套餐只读展示，避免前端选项和后端规则不一致。
- 同名 Demo 下线后再次发布会自动生成新 slug，避免覆盖离线归档。
- 重新上线前检查访问路径是否被占用，避免覆盖其他 Demo。
- 离线 Demo 超过有效期后不能重新上线，并会清理离线归档。
- 健康检查版本号更新为 `0.1.5`，便于部署后核对。
- 支持更新已有 Demo：上传 V2/V3 时原访问链接不变，构建成功后替换线上内容。
- 更新失败不会覆盖当前线上版本。
- 发布/更新次数改为按发布事件和更新事件计数，更新同样消耗本月次数。
- 用户端和管理后台支持删除已下线/已过期 Demo。
- 已发布 Demo 不能直接删除，必须先下线。
- 删除后状态保留为 `deleted`，文件和离线归档会清理，发布/更新次数不退回，历史 slug 不复用。
- 部署脚本兼容 Windows zip 路径分隔符 warning，避免前端解压 warning 中断后端部署。
- 部署脚本会更新 systemd 服务描述为 `DemoGo v0.1.5 API`。
- 登录页限制 `next` 参数只能跳转站内控制台页面。
- 管理后台移除无效操作按钮，保留刷新、下线、删除等真实操作。
