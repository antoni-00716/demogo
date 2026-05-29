# Supabase 集成规划

## 定位

Supabase 是 DemoGo 需要支持的一类高频外部后端，不是 DemoGo 要自建的能力。

很多 AI 编程工具生成的项目会采用：

```text
前端项目 + Supabase 数据库 + Supabase Auth + Supabase Storage
```

这类项目的后端能力主要在用户自己的 Supabase 项目中，DemoGo 的合理角色是：

```text
识别项目使用了 Supabase
  -> 引导用户填写 Supabase 配置
  -> 安全注入环境变量
  -> 构建和发布前端或运行 Node 单服务
  -> 失败时给出清晰诊断
```

第一阶段不做 Supabase 托管，不自动创建 Supabase 项目，也不自动执行用户外部数据库迁移。

## 为什么重要

Supabase 在 AI App Builder 产物中很常见。它通常承担：

- 数据库。
- 用户注册和登录。
- 文件上传和存储。
- 实时数据。
- 后端函数。

如果 DemoGo 只支持 `Node.js + MySQL`，会漏掉大量 `前端 + Supabase` 项目。

## 产品边界

当前应做：

- 识别 Supabase 项目。
- 用户端展示“这个项目需要连接 Supabase”。
- 引导用户填写 Supabase URL 和 anon key。
- 根据项目类型注入正确变量名。
- 提示用户不要填写 `service_role` 高权限密钥。
- 检测 `supabase/migrations/` 并提示用户自行执行迁移。
- 失败时生成可复制给 AI 的修复提示。

当前不做：

- 不托管 Supabase。
- 不自动创建 Supabase 项目。
- 不保存或暴露 `service_role` 高权限密钥。
- 不自动写入用户外部生产数据库。
- 不承诺 Supabase Auth、Storage、Realtime、Edge Functions 全部自动可用。

## 识别线索

包依赖：

```text
@supabase/supabase-js
```

环境变量：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

目录和文件：

```text
supabase/
supabase/migrations/
supabase/config.toml
```

代码线索：

```text
createClient(...)
supabase.auth
supabase.storage
supabase.channel
```

## 变量注入策略

根据项目类型匹配变量名：

- Vite：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
- Next.js：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- Node.js 服务端：`SUPABASE_URL`、`SUPABASE_ANON_KEY`。

如果项目已经在 `.env.example` 中声明变量，优先使用项目声明的变量名。

## 安全规则

必须明确区分：

- `anon key`：可用于前端，但仍受 Supabase RLS 策略保护。
- `service_role key`：高权限密钥，不应进入前端，不应展示给用户页面。
- 数据库连接串：只适合后端使用，不能注入前端构建产物。

DemoGo 在用户填写疑似 `service_role`、`DATABASE_URL` 或完整数据库密码时，应给出风险提示，并根据项目类型判断是否允许保存。

## 版本安排

### v0.5.3

- 合并 Supabase 配置、检测、注入和诊断。
- Supabase 项目识别。
- 用户端 Supabase 连接配置。
- Supabase 环境变量注入。
- 保存配置时做 URL 和 anon key 基础连通性检测。
- 拒绝保存 `service_role` 高权限密钥。
- 外部后端不可用时返回结构化诊断。
- 管理端区分 DemoGo MySQL 试用库和用户自有 Supabase。
- `supabase/migrations/` 只做提示，不自动执行外部数据库迁移。

### v0.6.0

- 使用 `前端 + Supabase` 样本做完整验收。
- 与 `前端 + Node.js + MySQL` 样本一起验证 DemoGo 的完整应用试用部署能力。

## 用户端建议文案

```text
这个项目需要连接 Supabase。
请填写 Supabase 项目地址和匿名公钥后继续发布。
不要填写 service_role 高权限密钥。
```

```text
检测到 Supabase 数据库迁移文件。
当前 DemoGo 不会自动写入你的 Supabase 数据库，请先在 Supabase 控制台或 CLI 中执行迁移。
```

## 给 AI 的修复提示方向

```text
请把项目中的 Supabase 配置改为从环境变量读取。
Vite 项目使用 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。
Next.js 项目使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。
不要把 Supabase service_role key 写入前端代码。
```
