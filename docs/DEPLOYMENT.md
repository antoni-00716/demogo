# 部署说明

## 原则

开发完成不等于发布。只有项目负责人明确说发布时才执行部署和 npm 发布。

## 部署前强制检查（硬性门禁）

1. `server npm run check` — 语法检查
2. `server npm run test` — 单元测试 0 失败
3. `server npm run test:integration` — 集成测试全部通过（硬性门禁）
4. `server npm run test:smoke` — 烟雾测试
5. `web npm run lint` — 前端 lint
6. `web npm run build` — 前端构建
7. `npm audit` — server + web 均 0 漏洞
8. `node --check server/src/server.js` — 入口语法
9. 版本号统一（VERSION、server/package.json、cli/package.json、mcp/package.json）

v0.9.4 事故教训：跳过集成测试导致缺少 start 脚本和 email/mailer.js 导出错误，部署后服务无法启动。集成测试是硬性门禁。

## 本地打包

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-demogo-packages.ps1
```

输出 8 个包：
```
dist/demogo-site-preview.zip
dist/demogo-server-v<version>.zip
dist/demogo-ops-scripts-v<version>.zip
dist/demogo-cli-v<version>.zip
dist/demogo-mcp-v<version>.zip
dist/demogo-codex-skill-v<version>.zip
dist/demogo-codex-plugin-v<version>.zip
dist/demogo-claude-code-plugin-v<version>.zip
```

## 上传与部署

一键部署（推荐）：
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-demogo-release.ps1
```

服务器手动步骤：
```bash
cd /tmp
unzip -o demogo-ops-scripts-v<version>.zip
sed -i 's/$//' server-deploy-demogo-v<version>.sh server-rollback-demogo-v<version>.sh server-verify-demogo.sh
chmod +x server-deploy-demogo-v<version>.sh server-rollback-demogo-v<version>.sh server-verify-demogo.sh
./server-deploy-demogo-v<version>.sh 2>&1 | tee /tmp/demogo-v<version>-deploy.log
./server-verify-demogo.sh
```

## 验证

```bash
curl https://demogo.cn/api/health              # 版本号一致
curl https://demogo.cn/api/hosting/capabilities
curl -I https://demogo.cn                      # 首页 200
curl -I https://demogo.cn/login.html           # 登录页 200
curl -I https://demogo.cn/app.html             # 用户端 200
curl -I https://demogo.cn/admin.html           # 管理端 401（Basic Auth）
systemctl status demogo-server --no-pager      # active (running)
```

## npm CLI 发布

```powershell
cd cli
npm publish --access public
npm view @demogo-cn/cli version
npx --yes @demogo-cn/cli@latest --version
npx --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
```

最终确认：
- npm 版本与 /api/health 一致
- npx --version 与线上一致
- doctor 显示平台连接正常
