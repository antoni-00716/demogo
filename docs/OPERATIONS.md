# 运维说明

## 常用检查

```bash
curl https://demogo.cn/api/health
curl https://demogo.cn/api/hosting/capabilities
curl https://demogo.cn/api/auth/register-options
systemctl status demogo-server --no-pager
journalctl -u demogo-server -n 100 --no-pager
```

## 数据目录

```
/var/lib/demogo/data      平台数据
/var/lib/demogo/uploads    上传临时文件
/var/lib/demogo/backups    部署备份
/var/www/demogo-preview/d  用户试用页面
```

## 回滚

备份路径：/var/lib/demogo/backups/pre-v<version>-YYYYmmddHHMMSS

```bash
cd /tmp
./server-rollback-demogo-v<version>.sh /var/lib/demogo/backups/pre-v<version>-YYYYmmddHHMMSS
```

## 运行环境

Node.js 运行环境依赖 Docker：
```bash
docker --version
systemctl is-active docker
```

## 邮件验证码

SMTP 配置：/etc/systemd/system/demogo-server.service.d/email.conf

注意：SMTP_PASS 是 163 授权码，不是邮箱登录密码。

变更后：
```bash
systemctl daemon-reload
systemctl restart demogo-server
curl https://demogo.cn/api/auth/register-options   # emailVerificationEnabled: true
```

## 清理测试数据

```bash
cd /tmp
./server-clean-demogo-data.sh
```
