# AI 发布与更新

DemoGo 的 AI 发布能力让 Codex、Cursor、Claude Code 等 AI 编程工具直接把当前项目发布为试用链接。

## 用户侧原则

用户端只提供一条通用 AI 发布提示词，不再按 Codex、Claude Code、Cursor 等工具拆分多套提示词。

产品原则是：

```text
把方便留给用户，把麻烦留给 DemoGo。
```

用户只需要告诉 AI 工具：

```text
请把当前项目发布到 DemoGo，生成一个可以分享给用户试用的链接。
```

不同工具之间的 CLI、MCP、Skill、Plugin、Agent API 差异，由 DemoGo 的集成层处理，不交给用户判断。

## 发布方式

优先使用 npm CLI：

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn --token <DemoGo AI 发布口令>
```

如果本地已安装 CLI：

```bash
demogo deploy --api https://demogo.cn --token <DemoGo AI 发布口令>
```

CLI 不可用时，可使用 MCP 或 Agent API 兜底，但必须明确说明不是 CLI 发布成功。

## 更新已有链接

更新版本的业务规则：

- 原链接保持不变。
- 不占用新的 Demo 数量。
- 占用一次发布/更新次数。
- 版本号加 1。
- 继续执行项目检查、内容安全、运行环境、数据库检查。
- AI 发布口令只能更新自己账号下的项目。

同一个项目目录再次执行：

```bash
demogo deploy
```

如果 `.demogo/project.json` 存在，CLI 会自动更新原链接。

如需强制生成新链接：

```bash
demogo deploy --new
```

如果换了目录或电脑，使用原链接更新：

```bash
demogo update --id https://demogo.cn/d/try-xxxxxx/
```

## Agent API

新建：

```text
POST /api/agent/deploy
```

更新：

```text
POST /api/agent/update
```

更新接口表单字段：

- `demoId`: Demo ID、链接后缀或完整 DemoGo 链接。
- `project`: 项目包，支持 `.zip`、`.tar.gz`、`.tgz`。
- `source`: `cli`、`mcp` 或 `agent_api`。

请求头：

```text
Authorization: Bearer <DemoGo AI 发布口令>
```

## 用户提示原则

- 首次发布：让 AI 生成新试用链接。
- 更新版本：让 AI 保持原链接不变。
- 不能只根据项目名猜测要更新哪个项目。
- 没有本地发布记录时，必须提供原 DemoGo 链接或 Demo ID。
