# DemoGo v0.1 网页上传版 MVP

## 产品目标

用户上传一个 `.zip` 项目包，DemoGo 自动处理并返回一个可访问的 Demo 试用链接。

第一版验证的不是完整云平台能力，而是验证用户是否愿意为“免 GitHub、免 Vercel、免域名备案、生成国内试用链接”付费。

## 用户路径

1. 用户打开 DemoGo 页面。
2. 用户上传 `.zip` 项目包。
3. 系统检查文件大小、文件类型和基础安全风险。
4. 系统识别项目类型。
5. 系统构建或直接托管静态产物。
6. 系统生成试用链接。
7. 用户把链接发给客户、同事、老师或潜在用户。

## v0.1 支持范围

- 纯静态项目：根目录包含 `index.html`。
- 已构建前端项目：包含 `dist/` 或 `build/`。
- 常见前端项目：包含 `package.json`，可执行 `npm install` 和 `npm run build`。
- 生成 3-7 天有效链接。
- 支持手动下线。
- 单个项目包建议限制在 50MB 以内。

## v0.1 不支持范围

- 数据库。
- 长期运行的后端服务。
- Docker / Docker Compose。
- 需要复杂环境变量的项目。
- 需要私有 API key 才能运行的项目。
- 文件上传、支付、登录、敏感个人信息采集等生产级能力。
- 高风险内容、代理、爬虫、下载站和灰色业务。

## 最小技术架构

```text
网页上传入口
  ↓
DemoGo API
  ↓
上传 zip 到临时目录
  ↓
安全检查和项目识别
  ↓
构建 Worker
  ↓
静态产物目录
  ↓
Nginx / OSS 托管
  ↓
返回访问链接
```

## 第一版部署策略

为了降低复杂度，v0.1 可以先不接复杂 DNS 自动化。

备案通过前：

- 只做内部测试。
- 使用公网 IP 或临时路径验证上传和托管流程。

备案通过后：

- `demogo.cn` 作为官网。
- `app.demogo.cn` 作为上传控制台。
- 第一版链接可先使用路径：

```text
https://demogo.cn/d/coffee-crm
```

等泛域名和通配符证书稳定后，再升级为：

```text
https://coffee-crm.demogo.cn
```

## 项目识别逻辑

```text
if exists dist/index.html:
  直接发布 dist
else if exists build/index.html:
  直接发布 build
else if exists index.html:
  直接发布根目录
else if exists package.json:
  npm install
  npm run build
  查找 dist 或 build
else:
  返回不支持的项目类型
```

## 安全限制

上传前后都要排除或拒绝：

- `.env`
- `.env.local`
- `.git`
- `node_modules`
- `*.key`
- `*.pem`
- `id_rsa`
- 大文件压缩包嵌套
- 可执行二进制文件
- 超出大小限制的文件

构建必须在隔离环境中运行，建议使用 Docker 容器，并限制：

- CPU
- 内存
- 磁盘空间
- 构建超时时间
- 网络访问权限

## 数据表草案

### users

- id
- phone_or_email
- plan
- created_at

### projects

- id
- user_id
- name
- slug
- status
- source_file
- output_path
- public_url
- expires_at
- created_at
- updated_at

### deploys

- id
- project_id
- status
- log_path
- file_size
- detected_type
- started_at
- finished_at
- error_message

## 状态流转

```text
uploaded
  ↓
checking
  ↓
building
  ↓
published
  ↓
expired / offline / failed
```

## v0.1 API 草案

```text
POST /api/uploads
上传 zip，返回 upload_id

POST /api/deployments
提交发布任务，返回 deployment_id

GET /api/deployments/:id
查询发布状态、日志和最终链接

POST /api/projects/:id/offline
下线 Demo
```

当前后端骨架已先实现一个更小的接口：

```text
POST /api/deploy

字段：
- project: zip 文件
- name: Demo 名称

返回：
- slug
- publicUrl
- detectedType
- fileCount
- extractedBytes
```

并已增加用户自助下线接口：

```text
POST /api/demos/:id/offline
```

下线后会删除 `/d/{slug}` 目录，并把 Demo 状态更新为 `offline`。

v0.1.3 已支持包含 `package.json` 的源码包自动构建：执行 `npm install`/`npm ci` 和 `npm run build`，并发布 `dist/index.html` 或 `build/index.html`。

## 早期人工运营方案

自动发布接口未完全稳定前，官网可以先承接项目包和联系方式，由人工处理前 10-20 个真实项目。

每个真实项目记录：

1. 用户是谁。
2. 用什么 AI 编程工具生成。
3. 项目类型。
4. 上传文件大小。
5. 是否能自动构建。
6. 从上传到可访问耗时。
7. 用户是否愿意付 9.9 元/次或 19.9 元/月。

## 下一阶段

v0.2 再做 AI 编程工具接入：

- DemoGo CLI：`demogo deploy .`
- MCP Server：让 Cursor、Claude Code、Codex 等工具调用。
- Codex Skill：告诉 Codex 如何使用 DemoGo CLI/MCP。
- OpenAPI 插件：给支持 HTTP 工具调用的平台使用。
