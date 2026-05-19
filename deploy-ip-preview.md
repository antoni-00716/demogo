# DemoGo 使用公网 IP 临时部署官网

这份说明用于在 `demogo.cn` 备案完成前，先用 ECS 公网 IP 验证服务器、Nginx 和官网文件是否能正常工作。

重要边界：如果服务器在中国内地，直接使用公网 IP 对外提供网站服务同样涉及 ICP 备案要求。当前步骤建议仅用于个人联调、备案前技术验收和小范围内部测试。正式公开访问仍应等 `demogo.cn` 备案通过后再解析域名上线。

## 目标

- 在 ECS 上安装 Nginx。
- 把 DemoGo 静态官网放到 `/var/www/demogo-preview`。
- 通过 `http://你的公网IP` 访问首页。
- 等备案通过后，再把站点切换到 `demogo.cn` 并配置 HTTPS。

## 需要上传的文件

上传这些文件到 ECS：

- `index.html`
- `terms.html`
- `privacy.html`
- `content-policy.html`
- `assets/demogo-hero.png`

## ECS 安全组

在阿里云 ECS 控制台确认安全组已放行：

- TCP 22：SSH 登录服务器
- TCP 80：HTTP 临时访问

备案通过并配置 HTTPS 后，再放行：

- TCP 443：HTTPS

## Ubuntu / Debian 系统命令

用 SSH 登录服务器后执行：

```bash
sudo apt update
sudo apt install -y nginx unzip
sudo mkdir -p /var/www/demogo-preview/assets
sudo chown -R $USER:$USER /var/www/demogo-preview
```

把文件上传到 `/var/www/demogo-preview` 后，创建 Nginx 配置：

```bash
sudo tee /etc/nginx/sites-available/demogo-preview >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    root /var/www/demogo-preview;
    index index.html;

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

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/demogo-preview /etc/nginx/sites-enabled/demogo-preview
sudo nginx -t
sudo systemctl reload nginx
```

然后访问：

```text
http://你的公网IP
```

## CentOS / Alibaba Cloud Linux 系统命令

用 SSH 登录服务器后执行：

```bash
sudo yum install -y nginx unzip
sudo mkdir -p /var/www/demogo-preview/assets
sudo chown -R $USER:$USER /var/www/demogo-preview
sudo systemctl enable nginx
sudo systemctl start nginx
```

创建 Nginx 配置：

```bash
sudo tee /etc/nginx/conf.d/demogo-preview.conf >/dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/demogo-preview;
    index index.html;

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

然后访问：

```text
http://你的公网IP
```

## 文件上传方式

如果你在本地 Windows PowerShell，可以用 `scp` 上传：

```powershell
scp .\index.html .\terms.html .\privacy.html .\content-policy.html root@你的公网IP:/var/www/demogo-preview/
scp .\assets\demogo-hero.png root@你的公网IP:/var/www/demogo-preview/assets/
```

如果服务器禁止 root 登录，把 `root` 换成你的服务器用户名，例如 `ecs-user`、`ubuntu`。

## 验证

打开：

```text
http://你的公网IP
```

检查：

- 首页可以打开。
- 背景图正常显示。
- 用户协议、隐私政策、内容规范链接能打开。
- 预约体验邮件链接能唤起邮件客户端。

## 备案通过后

- 在阿里云 DNS 把 `demogo.cn` 解析到 ECS 公网 IP。
- 把 Nginx 的 `server_name _;` 改成 `server_name demogo.cn www.demogo.cn;`。
- 申请 HTTPS 证书。
- 配置 HTTP 跳转 HTTPS。
- 首页底部添加真实 ICP 备案号。
