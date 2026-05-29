# 旧文件清理确认清单

本清单只作为确认依据。未得到项目负责人确认前，不删除这些文件。

## 建议删除：临时目录

- `.tmp`
- `.uploads`
- `.workbuddy`
- `test-packages`
- `tmp_fixed_expand_check`
- `tmp_tar_check`
- `tmp_zip_check`

理由：均为开发、测试、临时展开目录，不应长期留在项目根目录。

## 建议删除：旧版本文档

根目录下大量历史计划、任务、复盘、报告建议删除，包括：

- `DEMOGO_V0.1.*`
- `DEMOGO_V0.2.*`
- `DEMOGO_PROJECT_RETROSPECTIVE_*`
- `DEMOGO_*旧计划/旧报告/旧架构`
- `DemoGo_v0.4.0_项目全面报告.md`
- `DEMOGO_项目理解报告_2026-05-25.md`
- `DEMOGO_项目复盘报告_2026-05-25.md`
- `DEMOGO_改进建议与工作计划_2026-05-25.md`
- `项目总体情况报告.md`

理由：这些文档大多描述历史版本，容易误导后续 AI 和人工判断。最新信息应集中在 `README.md` 和 `docs/`。

## 建议删除：旧根目录页面

- `admin.html`
- `app.html`
- `index.html`
- `login.html`
- `demogo-bp.html`
- `demogo-landing.html`
- `demogo-posters.html`

理由：真实前端入口在 `web/`，这些是早期静态原型或旧页面。

## 需迁移后再删除

- `terms.html`
- `privacy.html`
- `content-policy.html`

理由：当前打包脚本仍会复制这些文件到站点包。建议后续迁移到 `web/public/` 或 `web/src` 正式页面后，再删除根目录版本。

## 建议删除：旧部署/回滚脚本

建议删除：

- `scripts/server-deploy-demogo-v0.1.*.sh`
- `scripts/server-deploy-demogo-v0.2.*.sh`
- `scripts/server-deploy-demogo-v0.3.*.sh`
- `scripts/server-deploy-demogo-v0.4.0.sh`
- `scripts/server-deploy-demogo-v0.4.1.sh`
- `scripts/server-deploy-demogo-v0.4.2.sh`
- 对应 `server-rollback-*` 旧脚本

建议保留：

- `scripts/server-deploy-demogo-v0.4.3.sh`
- `scripts/server-rollback-demogo-v0.4.3.sh`
- `scripts/build-demogo-packages.ps1`
- `scripts/upload-demogo-packages.ps1`
- `scripts/deploy-demogo-release.ps1`
- `scripts/server-verify-demogo.sh`
- `scripts/server-clean-demogo-data.sh`
- `scripts/run-real-project-fixtures.mjs`

理由：只保留当前版本部署脚本和通用脚本，减少误部署旧版本风险。

## 建议保留

- `README.md`
- `AGENTS.md`
- `VERSION`
- `docs/`
- `server/`
- `web/`
- `cli/`
- `mcp/`
- `codex-skill/`
- `scripts/` 中当前版本与通用脚本
- `assets/`
- `brand/`

## 执行建议

确认后再执行删除，并在删除后跑：

```powershell
cd C:\Users\wei.gu\Documents\demogo\server
npm run check
npm run test:smoke
```

```powershell
cd C:\Users\wei.gu\Documents\demogo\web
npm run lint
npm run build
```
