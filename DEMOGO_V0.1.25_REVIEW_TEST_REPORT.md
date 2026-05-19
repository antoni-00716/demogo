# DemoGo v0.1.25 审查与测试记录

日期：2026-05-18

## 总结论

v0.1.25 已完成发布前内容安全检查能力的代码接入、自动化验证和部署包构建。该版本的核心变化是：用户上传项目后，DemoGo 会在生成公开试用链接前检查页面内容；检查不通过、疑似风险或检查异常时，不生成公开链接。

当前没有发现阻塞部署的问题。可以进入部署准备。

## 本版目标

- 发布前增加内容检查，降低平台发布违法违规、诈骗导流、高风险收集信息等内容的连带风险。
- 用户端能看到发布前内容检查结果和修改方向。
- AI 发布接口也执行同一套检查，不允许绕过网页端规则。
- 管理后台能看到内容检查记录，便于运营人员跟踪被拦截项目。

## 当前支持的内容检查范围

- 检查上传包中的页面文本、脚本片段和关键文件名。
- 检查源码项目构建后的实际发布目录，避免构建后生成的页面绕过检查。
- 拦截或提示的重点包括：诈骗或高风险金融引导、博彩赌博、色情低俗、违法交易、恶意下载或攻击引导、敏感信息收集、外部联系方式导流、支付和订单相关风险。
- 检查结果会进入用户端检测报告、发布失败提示和管理后台内容检查记录。

## 明确不足

- 当前是本地规则初筛，不等于正式第三方智能审核。
- 当前不能识别图片、视频、音频里的真实内容；图片只做文件名层面的有限风险提示。
- 当前没有人工审核工作流，只有检查记录和拦截结果。
- 后续如果要正式对外试用，建议接入阿里云、腾讯云等内容安全服务，并补充人工复核入口。

## 第一轮：后端发布链路审查

审查范围：

- `/api/inspect`
- `/api/deploy`
- `/api/agent/deploy`
- `/api/demos/:id/update`
- 发布步骤记录、失败响应、后台内容检查记录
- JSON/MySQL 数据结构和迁移脚本

结论：

- `/api/inspect` 已返回 `inspection.contentReview`；内容不通过时 `canPublish=false`。
- 网页发布、AI 发布、项目更新都会强制执行内容检查。
- 被拦截项目不会生成公开链接。
- 被拦截记录会写入后台内容检查记录。
- 内容检查异常默认不放行，符合合规风险控制原则。

发现问题：

1. 当前规则仍是本地关键词和结构化规则，不能替代正式内容安全服务。
   - 影响：适合作为 MVP 阶段的风险闸门，但不能宣传成完整智能审核。
   - 是否阻塞部署：否。

2. 图片真实内容暂不能识别。
   - 影响：如果用户把违规信息做成图片，当前只能通过文件名等弱信号提示。
   - 是否阻塞部署：否，但正式试用前建议接第三方图片审核。

## 第二轮：前端与运营后台审查

审查范围：

- 用户端创建项目、检测、发布、失败提示
- 检测报告中的发布前内容检查展示
- 管理后台概览、运营队列、内容检查列表和详情

结论：

- 用户端已能展示“发布前内容检查”状态、摘要和命中项。
- 发布流程步骤中已加入“内容检查”。
- 发布失败时，如果服务端返回内容检查结果，前端会把检查结果展示给用户。
- 管理后台新增“内容检查”入口，能查看被拦截或需关注的项目。

发现问题：

1. 部分内容风险提示仍偏规则化，后续可继续优化成更面向非技术用户的话术。
   - 影响：用户能理解大意，但营销级体验还有提升空间。
   - 是否阻塞部署：否。

2. 管理后台当前是记录查看，还不是完整审核工作台。
   - 影响：运营人员能看见风险，但不能在后台做人工通过/驳回闭环。
   - 是否阻塞部署：否。

## 第三轮：自动化测试与部署包验证

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

结果：通过。

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```

结果：通过。

打包命令：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
```

已生成：

- `dist/demogo-site-preview.zip`
- `dist/demogo-server-v0.1.25.zip`
- `dist/demogo-ops-scripts-v0.1.25.zip`
- `dist/demogo-cli-v0.1.24.zip`
- `dist/demogo-mcp-v0.1.24.zip`
- `dist/demogo-codex-skill-v0.1.24.zip`

说明：本版核心改动在服务端、用户端和管理后台。CLI/MCP 发布协议未变，因此 CLI/MCP 分发包仍保持 v0.1.24。

## 重点测试覆盖

- 后端语法检查。
- 前端代码规范检查。
- 前端生产构建。
- 用户注册登录。
- 普通项目发布、更新、下线、恢复、删除。
- `.zip`、`.tar.gz`、`.tgz`。
- `dist`、`build`、`out`、`public` 静态目录。
- 有构建命令的源码项目。
- 缺少构建命令的源码项目拦截。
- 后端/SSR 项目明确不支持。
- 自动表单托管和公开提交。
- 套餐升级申请和后台接口。
- AI 发布密钥和 Agent 发布 API。
- 违规内容检测阶段拦截。
- 违规内容发布阶段拦截。
- 被拦截内容进入管理后台内容检查记录。

## 部署判断

v0.1.25 可以部署。

部署后必须确认：

- `/api/health` 返回 `0.1.25`。
- Nginx `/api/health` 代理返回 `0.1.25`。
- 首页、登录页、用户端返回 200。
- 管理后台返回 401 是正常现象，因为有 Basic Auth。
- `demogo-server.service` 是 `active (running)`。
- 上传一个明显违规测试包时，检测阶段应显示不能发布，发布阶段应返回失败，不生成公开链接。

## 后续建议

1. v0.1.26 或 v0.2.0 前接入正式第三方内容安全服务，覆盖文本和图片。
2. 增加管理后台人工复核状态：待复核、已确认违规、误判放行、已处理。
3. 增加用户侧申诉或修改后重新提交说明，避免用户不知道下一步怎么做。
4. 内容检查文案继续产品化，避免让用户感觉是内部风控规则。

---

# 追加记录：5 轮代码审查与 5 轮测试验证

日期：2026-05-18

## 总结论

已完成 v0.1.25 的 5 轮代码审查和 5 轮测试验证。当前没有发现阻塞部署的问题。

本版可以部署，但需要明确：当前内容检查是本地规则初筛，不是完整第三方智能审核；图片、视频、音频内容识别仍需后续接入正式内容安全服务。

## 5 轮代码审查

### 第 1 轮：后端发布与内容检查链路

审查范围：

- 普通网页发布 `/api/deploy`
- AI 发布 `/api/agent/deploy`
- 项目更新 `/api/demos/:id/update`
- 项目检测 `/api/inspect`
- `extractStaticDemo`
- `createAndPersistContentReview`
- `persistPreflightContentReview`

结论：

- 普通发布、AI 发布、项目更新三条路径都接入内容检查。
- 内容检查发生在公开链接正式可用前。
- 检查不通过时会停止发布，不会写入新的可访问项目。
- `/api/inspect` 返回内容检查结果，且不通过时 `canPublish=false`。

发现问题：

1. 创建发布仍有重复分析项目包的问题。
   - 影响：大项目发布速度可能偏慢。
   - 是否阻塞部署：否。

2. `review_required` 当前按失败处理，适合风险控制，但还没有人工复核闭环。
   - 影响：可能出现误杀后只能让用户修改重传。
   - 是否阻塞部署：否。

### 第 2 轮：数据模型、迁移和后台接口

审查范围：

- `content_reviews` 表结构
- `content-reviews.json`
- MySQL 兼容存储
- JSON 到 MySQL 迁移
- 迁移验证
- 后台 `/api/admin/content-reviews`
- 后台 `/api/admin/overview`

结论：

- 内容检查记录已支持 JSON 和 MySQL 两套存储。
- 迁移脚本已包含 `content_reviews`。
- 后台概览已统计内容检查总数、已拦截数、待人工确认数。
- 后台内容检查列表支持按状态和关键词过滤。

发现问题：

1. 内容检查记录只保留最近 5000 条。
   - 影响：MVP 阶段可接受；正式运营后要考虑归档或分页。
   - 是否阻塞部署：否。

2. 后台没有人工处理状态字段。
   - 影响：运营人员只能查看，不能标记“误判、已处理、确认违规”。
   - 是否阻塞部署：否。

### 第 3 轮：前端用户端与管理端体验

审查范围：

- 用户端上传、检测、发布、失败提示
- 用户端内容检查展示
- 管理后台内容检查入口
- 管理后台内容检查详情抽屉
- 首页、用户端、后台是否出现明显内部话术

结论：

- 用户端能展示发布前内容检查状态、摘要和命中项。
- 发布失败时，服务端返回的 `inspection` 能被前端展示。
- 管理后台已有“内容检查”入口和详情抽屉。
- 未发现“实验能力”这类容易误导用户的表述。

发现问题：

1. 用户端仍出现 React、Vue、Vite 等技术词。
   - 影响：不是本版新增问题；非技术用户可能理解成本偏高。
   - 是否阻塞部署：否。

2. 内容检查文案偏规则化，后续需要继续产品化。
   - 影响：用户能理解问题，但体验还不够顺滑。
   - 是否阻塞部署：否。

### 第 4 轮：AI 发布、CLI、MCP、Codex Skill

审查范围：

- CLI 打包和发布逻辑
- MCP 工具声明
- Codex Skill 文案
- AI 发布是否绕开内容检查

结论：

- CLI 和 MCP 都调用 `/api/agent/deploy`，不会绕过服务端内容检查。
- Codex Skill 已说明内容检查规则，要求遇到内容风险时修改项目而不是绕过。
- CLI/MCP/Skill 当前仍是 v0.1.24，符合本版范围，因为发布协议未变。

发现问题：

1. CLI/MCP 默认 API 地址仍是服务器 IP。
   - 影响：未来切换正式域名或 HTTPS 时必须同步调整。
   - 是否阻塞部署：否。

2. CLI 没有 `inspect` 命令，当前是 `deploy` 前本地摘要检查。
   - 影响：后续文档和 AI 指令不能写成 `demogo inspect`。
   - 是否阻塞部署：否。

### 第 5 轮：部署包、脚本、版本和合规风险

审查范围：

- 打包脚本
- 上传脚本
- v0.1.25 部署脚本
- v0.1.25 回滚脚本
- 验证脚本
- 包内文件完整性
- 合规能力边界

结论：

- v0.1.25 服务端包和运维脚本包版本正确。
- 服务端包包含内容检查服务、数据库 schema、迁移脚本和验证脚本。
- 运维包包含部署、回滚、验证、清理和上传脚本。
- 部署脚本会执行 MySQL schema 和迁移验证。

发现问题：

1. 回滚脚本主要恢复文件和 JSON 备份，不会回滚 MySQL schema。
   - 影响：新增表通常不影响旧服务运行；但严格数据库回滚能力不足。
   - 是否阻塞部署：否。

2. 当前内容安全仍是规则初筛。
   - 影响：能降低明显风险，但不能替代正式内容安全服务。
   - 是否阻塞部署：否，但正式试用前建议增强。

## 5 轮测试验证

### 第 1 轮：静态与语法检查

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
```

结果：通过。

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
```

结果：通过。

CLI/MCP 语法检查：

```powershell
node --check cli\bin\demogo.js
node --check cli\lib\core.js
node --check mcp\bin\demogo-mcp.js
node --check mcp\lib\core.js
```

结果：通过。

### 第 2 轮：后端全链路烟雾测试

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run test:smoke
```

结果：通过。

覆盖重点：

- 注册登录。
- 项目检测。
- 普通项目发布和更新。
- `.zip`、`.tar.gz`、`.tgz`。
- 静态目录和源码构建。
- 无 build 命令拦截。
- 自动表单托管和公开提交。
- Agent 发布 API。
- 违规内容检测拦截。
- 违规内容发布拦截。
- 后台内容检查记录。

### 第 3 轮：前端生产构建

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run build
```

结果：通过。

生成页面：

- `index.html`
- `login.html`
- `app.html`
- `admin.html`

### 第 4 轮：部署包构建和包内容核对

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
```

结果：通过。

已生成：

- `dist/demogo-site-preview.zip`
- `dist/demogo-server-v0.1.25.zip`
- `dist/demogo-ops-scripts-v0.1.25.zip`
- `dist/demogo-cli-v0.1.24.zip`
- `dist/demogo-mcp-v0.1.24.zip`
- `dist/demogo-codex-skill-v0.1.24.zip`

包内容核对：

- 服务端包包含 `src/services/content-review-service.js`。
- 服务端包包含 `src/db/schema.sql`、`migrate-json-to-mysql.js`、`verify-migration.js`。
- 运维包包含 `server-deploy-demogo-v0.1.25.sh` 和 `server-rollback-demogo-v0.1.25.sh`。
- 站点包包含首页、登录页、用户端、管理后台和静态资源。

### 第 5 轮：用户入口、内容检查专项、AI 工具链测试

用户入口本地验证：

- `/` 返回 200。
- `/login.html` 返回 200。
- `/app.html` 返回 200。
- `/admin.html` 返回 200。

内容检查专项验证：

- 明显诈骗金融文案：拦截，通过。
- 正常活动报名页：通过，通过。
- 可疑二维码/支付图片文件名：进入待确认，通过。

AI 工具链验证：

- `node cli\bin\demogo.js --version` 返回 `0.1.24`。
- `node cli\bin\demogo.js config show` 可正常显示配置状态。
- 无 AI 发布口令时，CLI 会明确提示缺少口令。
- MCP `initialize` 通过。
- MCP `tools/list` 通过。
- MCP `demogo_get_config` 通过。
- Codex Skill 包结构正确，包含 `demogo-deploy/SKILL.md`。

发现问题：

1. CLI 当前没有 `inspect` 命令。
   - 说明：测试中验证过，命令会提示未知命令。
   - 正确用法：`demogo deploy`，发布前会做本地摘要检查和服务端检查。
   - 是否阻塞部署：否。

2. 本地直接构造中文风险文案时，PowerShell 管道编码可能影响临时测试文本。
   - 处理：改用 Unicode 转义方式复测后通过。
   - 是否阻塞部署：否。

## 最终部署判断

v0.1.25 通过 5 轮代码审查和 5 轮测试验证，可以部署。

部署后建议额外做一个线上专项验收：

1. 上传正常活动报名页，确认能生成链接。
2. 上传包含“导师带单、稳赚不赔、先垫付后返利”的测试页，确认检测阶段不能发布。
3. 对同一个违规测试页直接点发布，确认不会生成公开链接。
4. 登录管理后台，确认“内容检查”里能看到被拦截记录。
5. 调用 `/api/health`，确认版本返回 `0.1.25`。
