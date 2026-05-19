# DemoGo v0.1 上传 API 部署说明

这一步把 DemoGo 从静态页面原型升级为可用的最小上传发布服务：

```text
上传 zip -> 服务端解压检查 -> 发布到 /d/{slug} -> 返回访问链接
```

## 服务器目录

```text
/var/www/demogo-preview        静态前端和用户 Demo
/opt/demogo/server             Node 后端 API
/var/lib/demogo/uploads        临时上传 zip
/var/www/demogo-preview/d      发布后的 Demo
```

## 安装 Node.js

Alibaba Cloud Linux 3 可先使用 NodeSource 安装 Node.js 20：

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
node -v
npm -v
```

## 上传后端包

在本地 PowerShell 执行：

```powershell
scp "C:\Users\wei.gu\Documents\Codex\2026-05-07\codex-agent-github\dist\demogo-server-v0.1.zip" root@8.155.150.162:/tmp/
```

服务器执行：

```bash
sudo mkdir -p /opt/demogo/server
sudo unzip -o /tmp/demogo-server-v0.1.zip -d /opt/demogo/server
cd /opt/demogo/server
npm install --omit=dev
sudo mkdir -p /var/lib/demogo/uploads /var/lib/demogo/data /var/www/demogo-preview/d
```

## 启动 API 服务测试

先用前台方式测试：

```bash
cd /opt/demogo/server
PUBLIC_BASE_URL=http://8.155.150.162 PORT=3001 npm start
```

新开一个服务器 SSH 窗口测试：

```bash
curl http://127.0.0.1:3001/api/health
```

正常返回：

```json
{"ok":true,"service":"demogo-server","version":"0.1.0"}
```

## 配置 systemd 常驻服务

测试正常后，创建系统服务：

```bash
sudo tee /etc/systemd/system/demogo-server.service >/dev/null <<'EOF'
[Unit]
Description=DemoGo v0.1 API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/demogo/server
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=PUBLIC_BASE_URL=http://8.155.150.162
Environment=DEMOGO_UPLOAD_DIR=/var/lib/demogo/uploads
Environment=DEMOGO_DEMO_ROOT=/var/www/demogo-preview/d
Environment=DEMOGO_DATA_DIR=/var/lib/demogo/data
Environment=DEMOGO_DEPLOY_TOKEN=请替换成你的发布密码
Environment=DEMOGO_ADMIN_USER=admin
Environment=DEMOGO_ADMIN_PASSWORD=请替换成你的后台密码
Environment=DEMOGO_BUILD_MODE=auto
Environment=DEMOGO_BUILD_DOCKER_IMAGE=node:20-alpine
Environment=DEMOGO_BUILD_DOCKER_MEMORY=512m
Environment=DEMOGO_BUILD_DOCKER_CPUS=1
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable demogo-server
sudo systemctl start demogo-server
sudo systemctl status demogo-server
```

## 更新 Nginx 配置

用下面配置替换 `/etc/nginx/conf.d/demogo-preview.conf`：

```bash
sudo tee /etc/nginx/conf.d/demogo-preview.conf >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 8.155.150.162;

    client_max_body_size 60m;

    root /var/www/demogo-preview;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /d/ {
        try_files $uri $uri/ =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(png|jpg|jpeg|gif|webp|svg|ico|css|js)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx
```

## 验证

```bash
curl http://127.0.0.1:3001/api/health
curl http://8.155.150.162/api/health
```

打开：

```text
http://8.155.150.162/app.html
```

上传一个包含 `index.html` 的 zip，应该返回：

```text
http://8.155.150.162/d/{slug}/
```

## 当前限制

- 当前 API 不执行 `npm install` / `npm run build`。
- 当前只发布已经有 `index.html`、`dist/index.html` 或 `build/index.html` 的项目包。
- 当前用户系统使用 JSON 文件存储，路径为 `/var/lib/demogo/data`。
- 当前上传接口使用 `DEMOGO_DEPLOY_TOKEN` 做临时保护，不是正式用户系统。
- 动态后端、数据库、Docker 项目不支持。
- 管理后台仍是静态原型，不能公开使用。
