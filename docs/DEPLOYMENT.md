# 部署说明

## 原则

开发完成不等于发布。

只有项目负责人明确说“发布这个版本”时，才执行：

- 上传服务器。
- 线上部署。
- npm CLI 发布。
- npx 验证。

## 本地打包

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\build-demogo-packages.ps1
```

版本号来自根目录 `VERSION`。

输出：

```text
dist/demogo-site-preview.zip
dist/demogo-server-v<version>.zip
dist/demogo-ops-scripts-v<version>.zip
dist/demogo-cli-v<version>.zip
dist/demogo-mcp-v<version>.zip
dist/demogo-codex-skill-v<version>.zip
dist/demogo-codex-plugin-v<version>.zip
dist/demogo-claude-code-plugin-v<version>.zip
```

## 上传

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\wei.gu\Documents\demogo\scripts\upload-demogo-packages.ps1
```

## 服务器部署

```bash
cd /tmp
unzip -o demogo-ops-scripts-v<version>.zip
sed -i 's/\r$//' server-deploy-demogo-v<version>.sh server-rollback-demogo-v<version>.sh server-verify-demogo.sh server-clean-demogo-data.sh
chmod +x server-deploy-demogo-v<version>.sh server-rollback-demogo-v<version>.sh server-verify-demogo.sh server-clean-demogo-data.sh
./server-deploy-demogo-v<version>.sh 2>&1 | tee /tmp/demogo-v<version>-deploy.log
./server-verify-demogo.sh
```

## 验证

```bash
curl https://demogo.cn/api/health
curl https://demogo.cn/api/hosting/capabilities
curl -I https://demogo.cn
curl -I https://demogo.cn/login.html
curl -I https://demogo.cn/app.html
curl -I https://demogo.cn/admin.html
curl https://demogo.cn/api/auth/register-options
systemctl status demogo-server --no-pager
```

`admin.html` 返回 `401` 是正常的，因为管理端有 Basic Auth。

## npm CLI 发布

只有本版本包含 CLI 变化并且线上版本已经部署时，才发布 npm：

```powershell
cd C:\Users\wei.gu\Documents\demogo\cli
npm publish --access public
npm view @demogo-cn/cli version
npx --yes @demogo-cn/cli@latest --version
npx --yes @demogo-cn/cli@latest doctor --api https://demogo.cn
```

最终要求：

- npm 版本与线上 `/api/health` 一致。
- `npx --yes @demogo-cn/cli@latest --version` 与线上一致。
- `doctor` 显示平台连接正常，AI 发布口令有效或已配置。
