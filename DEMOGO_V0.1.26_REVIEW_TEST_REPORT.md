# DemoGo v0.1.26 审查与测试记录

日期：2026-05-18

## 总结论

v0.1.26 已完成“真实试用可信增强版”的核心开发、测试和打包。当前没有发现阻塞部署的问题，可以进入部署准备。

本版主要增强三件事：

- 内容安全决策更清晰。
- 管理后台增加内容检查处理闭环。
- 用户端和 AI 发布接口的失败提示更容易理解。

## 已完成内容

### 1. 内容安全生产化增强

- 服务端版本升级到 `0.1.26`。
- 内容检查结果增加决策信息：
  - `allow`
  - `manual_review`
  - `deny`
- 内容检查结果增加下一步说明 `nextStep`。
- 保留本地规则初筛。
- 增加第三方内容安全接口预留配置：
  - `DEMOGO_CONTENT_REVIEW_EXTERNAL_ENDPOINT`
  - `DEMOGO_CONTENT_REVIEW_EXTERNAL_TOKEN`
- 当前未硬接第三方 SDK，没有配置外部服务时仍使用本地规则。

### 2. 管理后台人工复核闭环

- 内容检查记录增加处理状态：
  - `pending`
  - `confirmed_violation`
  - `false_positive`
  - `resolved`
- 内容检查记录增加：
  - 管理员备注
  - 处理人
  - 处理时间
- 新增后台接口：
  - `POST /api/admin/content-reviews/:id/status`
- 后台内容检查列表展示处理状态。
- 后台内容检查详情支持保存处理状态和备注。
- 后台概览增加待处理内容检查数量。

### 3. 用户端失败体验优化

- 内容检查结果展示下一步说明。
- 明确区分：
  - 明显违规：不能公开分享。
  - 疑似风险：需要平台确认。
  - 检查失败：暂不生成公开链接。
- 给 AI 编程工具的修改指令继续保留。

## 数据结构变更

`content_reviews` 新增字段：

- `resolution_status`
- `admin_note`
- `handled_by`
- `handled_at`

MySQL 迁移脚本已补充旧表升级逻辑。

## 测试结果

已执行：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

结果：通过。

已执行：

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

结果：通过。

## 已生成部署包

- `dist/demogo-site-preview.zip`
- `dist/demogo-server-v0.1.26.zip`
- `dist/demogo-ops-scripts-v0.1.26.zip`
- `dist/demogo-cli-v0.1.24.zip`
- `dist/demogo-mcp-v0.1.24.zip`
- `dist/demogo-codex-skill-v0.1.24.zip`

说明：CLI/MCP/Skill 发布协议未变化，因此仍保持 v0.1.24。

## 重点验证覆盖

- 普通项目发布。
- 项目更新。
- AI 发布接口。
- 内容风险检测拦截。
- 内容风险发布拦截。
- 后台内容检查记录查询。
- 后台内容检查处理状态更新。
- 内容检查记录按处理状态过滤。
- 前端后台构建。
- v0.1.26 部署包完整性。

## 仍需注意

1. 当前仍不是正式第三方智能审核。
2. 图片、视频、音频真实内容仍不能识别。
3. 管理员“误判”目前只是运营记录，不会自动恢复发布。
4. CLI/MCP 默认 API 地址仍是服务器 IP，后续切正式域名时需要同步。

## 部署后验收建议

1. `/api/health` 返回 `0.1.26`。
2. 上传正常项目，确认可以生成链接。
3. 上传明显违规测试页，确认不能生成链接。
4. 登录后台，进入“内容检查”，确认能看到拦截记录。
5. 在内容检查详情中修改处理状态和备注，确认保存成功。
