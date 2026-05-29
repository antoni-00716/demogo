# CLAUDE.md

DemoGo 工程硬约束

更新时间：2026-05-28

不要一上来就改代码，不要一上来就重构，不要一上来就发布。

## 1. 真实性约束

必须做到：

- 不确定就明确说"不确定"，不能假装知道。
- 涉及线上状态、npm 版本、部署结果、接口返回、测试结果时，必须通过命令或接口验证。
- 解释能力边界时，必须区分"已支持""可识别但不可运行""规划中""明确不支持"。
- 对关键判断必须说明依据，例如来自代码、测试、线上接口、npm 返回、服务器日志或用户确认。

禁止：

- 禁止胡编乱造。
- 禁止把推测说成事实。
- 禁止把没有测试的功能说成"已完成"。
- 禁止把没有上线的功能说成"线上已支持"。
- 禁止把不支持的能力包装成"实验能力""理论可行""基本支持"。

## 2. 开发纪律

必须做到：

- 修改代码前先读现有结构、调用链和相关文档。
- 大改动前先给方案，等项目负责人确认后再开发。
- 每次改动都要保持范围克制，只改和任务直接相关的内容。
- 优先复用现有模式和现有服务，不为炫技引入新依赖。
- 如果发现架构问题，先说明问题、影响和分阶段处理方案，不能直接大重构。
- 对用户不熟悉的技术概念，要用"业务含义 + 技术逻辑 + 实现方式 + 验证方式"解释。

禁止：

- 禁止一上来就重构。
- 禁止为了"架构高级"做大拆分。
- 禁止改无关代码。
- 禁止顺手格式化大量无关文件。
- 禁止擅自删除文件。
- 禁止擅自恢复已删除旧文件。
- 禁止在用户未确认时引入新依赖、新框架、新数据库或新云服务。

## 3. 测试和验证纪律

必须做到：

- 代码完成后必须尽可能运行测试。
- 测试失败必须说明失败原因，不能说完成。
- 无法测试时必须说明为什么不能测试，以及建议用户如何验证。
- 发布相关改动必须验证本地版本、线上版本、npm 版本和 npx 结果是否一致。
- 前端体验改动必须至少检查首页、登录页、用户端、管理端和 AI 发布页。
- 后端能力改动必须检查接口、日志、失败场景和 smoke test。

禁止：

- 禁止只说"应该可以"。
- 禁止没跑测试就说"已验证"。
- 禁止忽略失败测试。
- 禁止只验证 happy path，不看失败路径。
- 禁止把本地通过说成线上通过。

## 4. 发布纪律

必须做到：

- 开发完成不等于发布。
- 只有项目负责人明确说"发布这个版本"或"发布 vX.X.X"时，才可以部署线上和发布 npm。
- 涉及 CLI/MCP 的版本发布后，必须同步验证 npm 和 npx。
- 发布完成后必须验证：
  - `https://demogo.cn/api/health`
  - `https://demogo.cn/api/hosting/capabilities`
  - 首页、登录页、用户端、管理端状态
  - npm CLI 版本
  - npx CLI 版本
  - `doctor --api https://demogo.cn`

禁止：

- 禁止擅自发布。
- 禁止只部署服务器不验证 npm/npx。
- 禁止只发布 npm 不验证线上服务。
- 禁止发布后不说明验证结果。

## 5. Git 和文件安全纪律

必须做到：

- 当前工作树可能很脏，必须尊重已有改动。
- 不确定某个改动是不是自己造成的，就当作用户已有改动处理。
- 删除文件前必须确认删除理由和影响。

禁止：

- 禁止使用 `git reset --hard`。
- 禁止随意 `git checkout --` 回退文件。
- 禁止回退用户已有改动。
- 禁止用 git 状态替代真实代码理解。
- 禁止把临时测试文件、密钥、日志、构建缓存当业务文件提交。

## 6. 安全和密钥约束

必须做到：

- 看到密钥、token、SMTP 授权码、数据库密码时，不能在最终回复中完整暴露。
- AI 发布口令只能显示前缀或脱敏形式。
- SMTP_PASS 是 163 SMTP 授权码，不是邮箱登录密码。

禁止：

- 禁止把密钥写入文档、代码示例或日志摘要。
- 禁止要求用户在公开页面输入高权限密钥。
- 禁止保存或展示 Supabase `service_role` 密钥。
- 禁止把测试账号、真实邮箱、token 当普通文案扩散。

## 7. 产品表达约束

必须做到：

- 面向用户的文案要让非技术用户看懂。
- DemoGo 的核心表达是"分享、试用、反馈"，不是炫耀技术栈。
- 支持就说支持，不支持就明确说不支持。
- 失败提示要告诉用户下一步怎么处理。

禁止：

- 禁止在用户首页写内部工程话术。
- 禁止把"不支持"写成模糊承诺。
- 禁止把复杂技术细节推给用户。
- 禁止让用户为了发布而理解一堆命令和工具差异。

## 8. 不偷懒约束

必须做到：

- 能通过代码确认的，不凭猜测。
- 能通过命令验证的，不口头带过。
- 能一次处理完整闭环的，不只处理表面症状。
- 发现同类问题时，要检查是否存在系统性原因。
- 给方案时要包含取舍、风险和验证方式。

禁止：

- 禁止只修表面现象，不看根因。
- 禁止只做最容易的一小块，然后声称版本完成。
- 禁止遇到复杂问题就绕开核心矛盾。
- 禁止为了快而牺牲基本可用性、稳定性和可信度。

## 9. 验证命令

版本验证：

```powershell
Invoke-WebRequest -UseBasicParsing https://demogo.cn/api/health
Invoke-WebRequest -UseBasicParsing https://demogo.cn/api/hosting/capabilities
& "C:\Program Files\nodejs\npm.cmd" view @demogo-cn/cli version
& "C:\Program Files\nodejs\npm.cmd" view demogo-mcp version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest --version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
```

测试验证：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
& "C:\Program Files\nodejs\npm.cmd" run check
& "C:\Program Files\nodejs\npm.cmd" run test:smoke

cd C:\Users\wei.gu\Documents\demogo\web
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run build
```

打包和部署：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\deploy-demogo-release.ps1
```

npm 发布：

```powershell
cd C:\Users\wei.gu\Documents\demogo\cli
& "C:\Program Files\nodejs\npm.cmd" publish --access public
& "C:\Program Files\nodejs\npm.cmd" view @demogo-cn/cli version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest --version
& "C:\Program Files\nodejs\npx.cmd" --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
```
