# 运维说明

## 常用检查

```bash
curl https://demogo.cn/api/health
curl https://demogo.cn/api/hosting/capabilities
systemctl status demogo-server --no-pager
journalctl -u demogo-server -n 100 --no-pager
```

## 数据目录

```text
/var/lib/demogo/data
/var/lib/demogo/uploads
/var/lib/demogo/backups
/var/www/demogo-preview/d
```

## 清理测试数据

使用服务器脚本：

```bash
cd /tmp
./server-clean-demogo-data.sh
```

清理动作会影响线上数据，执行前必须确认。

## 回滚

部署脚本会创建备份目录：

```text
/var/lib/demogo/backups/pre-v<version>-YYYYmmddHHMMSS
```

回滚：

```bash
cd /tmp
./server-rollback-demogo-v<version>.sh /var/lib/demogo/backups/pre-v<version>-YYYYmmddHHMMSS
```

## 运行环境

Node.js 运行环境依赖 Docker。

上线检查：

```bash
docker --version
systemctl is-active docker
curl https://demogo.cn/api/hosting/capabilities
```

## 邮件验证码

SMTP 通过 systemd drop-in 配置，典型文件：

```text
/etc/systemd/system/demogo-server.service.d/email.conf
```

变更后：

```bash
systemctl daemon-reload
systemctl restart demogo-server
curl https://demogo.cn/api/auth/register-options
```
