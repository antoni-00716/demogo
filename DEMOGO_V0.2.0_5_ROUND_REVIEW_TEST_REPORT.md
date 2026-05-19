# DemoGo v0.2.0 五轮代码审查与五轮测试报告

日期：2026-05-18

## 总结论

v0.2.0 已完成 5 轮代码审查和 5 轮全流程测试。当前没有发现阻塞部署的问题，可以进入部署阶段。

本次复核重点覆盖：

- 网页上传发布
- `.zip`、`.tar.gz`、`.tgz`
- `index.html`、`dist`、`build`、`out`、`public`
- 前端源码项目构建
- 无 build 命令源码项目拦截
- 后端/SSR/数据库/支付/登录等不支持项目拦截
- 自动表单收集
- 内容安全检查
- Agent 发布 API
- CLI、MCP、Codex Skill
- 用户端、首页、运营后台
- 打包、上传、部署、回滚

## 5 轮代码审查

### 第 1 轮：后端发布主链路与内容安全

审查范围：
- `/api/inspect`
- `/api/deploy`
- `/api/agent/deploy`
- `/api/demos/:id/update`
- 内容安全检查
- 项目检测与解压
- 表单自动收集
- 额度检查

结论：通过。

关键判断：
- Agent 发布没有绕过现有发布核心链路。
- 发布前会先做项目检测，再做额度检查，避免额度提示挡住项目自身问题。
- 内容检查不通过、疑似风险、检查异常均不能生成公开链接。
- `.zip` 和 `.tar.gz/.tgz` 均有路径安全检查。
- `.env`、密钥、证书等敏感文件会被拦截。
- `node_modules`、缓存、日志等无关文件会被忽略。

记录风险：
- 内容安全仍以本地规则为主，不能识别图片、视频、音频中的真实内容。当前属于已知能力边界，不阻塞试运营。

### 第 2 轮：AI 发布链路 CLI / MCP / Skill

审查范围：
- `cli/bin/demogo.js`
- `cli/lib/core.js`
- `mcp/bin/demogo-mcp.js`
- `mcp/lib/core.js`
- `codex-skill/demogo-deploy/SKILL.md`

结论：通过。

关键判断：
- CLI / MCP / Skill 均为 `0.2.0`。
- CLI 不再固定服务器 IP，要求配置当前 DemoGo 平台地址。
- CLI 打包会过滤 `.env`、密钥、`.git`、`node_modules`、缓存、日志。
- MCP 提供项目检查、发布、查看配置三类工具。
- Skill 明确说明支持和不支持范围，没有把不支持能力包装成实验能力。

记录风险：
- CLI 会把 AI 发布口令保存在本机配置文件中。对试运营可接受，正式商业化前建议增加 `demogo config clear` 或口令删除命令。

### 第 3 轮：前端三端体验与文案

审查范围：
- 首页
- 登录入口相关跳转
- 用户端工作台
- AI 发布页
- 项目详情抽屉
- 管理后台概览和列表页

结论：通过。

关键判断：
- 首页表达以非技术用户能理解的话为主。
- 用户端 AI 发布页明确告诉用户如何复制指令给 AI。
- 当前支持和暂不支持范围表达清楚。
- 管理后台增加 AI 发布、失败原因、内容检查待处理等指标。

记录风险：
- AI 发布页信息量较大，非技术用户可能仍需要引导。建议部署后真实观察用户是否理解“复制给 AI 工具”这一步。

### 第 4 轮：打包、上传、部署、回滚

审查范围：
- `scripts/build-demogo-packages.ps1`
- `scripts/upload-demogo-packages.ps1`
- `scripts/server-deploy-demogo-v0.2.0.sh`
- `scripts/server-rollback-demogo-v0.2.0.sh`
- `scripts/server-verify-demogo.sh`

结论：通过。

关键判断：
- 六个交付包均按 v0.2.0 命名。
- 服务端包、运维包、CLI 包、MCP 包、Codex Skill 包均被打包。
- 部署脚本会备份数据、服务端目录和站点目录。
- 回滚脚本可以恢复服务端、前端和 JSON 数据备份。

记录风险：
- 服务器验证脚本主要验证服务端和前端页面，不验证 CLI/MCP/Skill 包。CLI/MCP/Skill 已通过本地包内容检查覆盖。

### 第 5 轮：边界能力、合规风险与数据安全

审查范围：
- 注册登录与 Session
- AI 发布口令
- 管理后台 Basic Auth
- 内容检查记录
- 表单提交
- 发布速率限制
- 文件路径安全

结论：通过。

关键判断：
- 用户密码使用哈希存储。
- AI 发布口令只显示一次，服务端保存哈希。
- Agent 发布通过 Bearer token 或专用请求头鉴权。
- 表单提交只保存配置字段，额外字段会被过滤。
- 压缩包路径穿越会被拒绝。

记录风险：
- 登录接口没有独立登录失败限速。试运营阶段可接受，正式开放前建议补登录失败限制或验证码。

## 5 轮测试

### 第 1 轮：后端全流程烟雾测试

命令：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

结果：通过。

覆盖：
- 注册登录
- 项目检测
- 发布
- 更新
- 下线
- 恢复
- 删除
- 表单托管
- 自动表单收集
- 内容安全拦截
- 后台处理内容检查
- 套餐升级申请
- 后台处理升级申请
- Agent 发布 API
- 后台 AI 发布指标
- SPA 深层路由回退

### 第 2 轮：前端构建测试

命令：

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

结果：通过。

产物：
- `index.html`
- `login.html`
- `app.html`
- `admin.html`
- 主 CSS/JS 资源

### 第 3 轮：CLI / MCP / Skill 测试

已测试：
- CLI 语法检查
- CLI `--version`
- CLI `config show`
- CLI 临时项目配置和打包
- 未连接真实 API 时的失败提示
- MCP `initialize`
- MCP `tools/list`
- MCP `demogo_get_config`
- MCP `demogo_check_project`
- Codex Skill 包内容

结果：通过。

### 第 4 轮：部署包内容测试

已确认包：

```text
dist\demogo-site-preview.zip
dist\demogo-server-v0.2.0.zip
dist\demogo-ops-scripts-v0.2.0.zip
dist\demogo-cli-v0.2.0.zip
dist\demogo-mcp-v0.2.0.zip
dist\demogo-codex-skill-v0.2.0.zip
```

结果：通过。

包内版本：
- 服务端 `package.json`：`0.2.0`
- 服务端 `src/config.js`：`0.2.0`
- CLI：`0.2.0`
- MCP：`0.2.0`
- Codex Skill：包含 v0.2.0 说明

### 第 5 轮：支持/不支持项目矩阵测试

通过后端烟雾测试覆盖：

支持并通过：
- 纯 `index.html`
- `dist/index.html`
- `build/index.html`
- `out/index.html`
- `.tar.gz`
- `.tgz`
- 可构建前端源码项目
- 带基础表单的静态页面
- Agent 发布 API

正确拦截：
- 后端服务项目
- 无 build 命令源码项目
- `.env` 敏感文件
- 不完整压缩包
- 不安全路径压缩包
- 违规/高风险内容

结果：通过。

## 不阻塞部署的问题清单

1. 内容安全本地规则仍不能识别图片、视频、音频真实内容。
   - 建议：后续接入阿里云/腾讯云内容安全服务，优先补图片审核。

2. AI 发布页信息量偏大。
   - 建议：部署后观察非技术用户是否能顺利完成“复制指令给 AI”。

3. CLI 本机保存 AI 发布口令，缺少清除命令。
   - 建议：后续增加 `demogo config clear`。

4. 登录接口缺少独立失败限速。
   - 建议：正式开放前增加登录失败限制或验证码。

5. 服务器验证脚本不验证 CLI/MCP/Skill 包。
   - 建议：后续可增加本地包验收脚本，不必放到服务器验证脚本里。

## 部署结论

可以部署 v0.2.0。

部署后重点验证：

1. `/api/health` 返回 `0.2.0`。
2. 首页、登录页、用户端、管理后台可访问。
3. 用户端可生成 AI 发布口令。
4. 复制给 Codex/Cursor 的发布指令包含当前平台地址。
5. 用真实 AI 工具执行一次发布，确认能返回试用链接。
6. 管理后台能看到 AI 发布指标。
