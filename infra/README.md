# DemoGo Infrastructure

本目录包含 DemoGo 项目的基础设施配置文件。

## 目录结构

```
infra/
├── README.md               # 本文件
├── nginx/
│   └── demogo.nginx.conf   # Nginx 反向代理配置（SSL、WebSocket、缓存）
├── systemd/
│   └── demogo-server.service  # systemd 服务配置
├── env/
│   └── demogo.env.example  # 环境变量模板
└── backup/
    └── demogo-backup.sh    # 数据库和数据备份脚本
```

## 各目录说明

- **nginx/** — Nginx 反向代理和静态资源服务配置。监听 443 (SSL) 并将 80 重定向到 443，反向代理到 localhost:3001。
- **systemd/** — systemd service units，用于管理 demogo-server 服务进程的生命周期和自动重启。
- **env/** — 环境变量配置模板，部署时复制为 `.env` 并填入实际值。
- **backup/** — 备份脚本，支持 MySQL 数据库和 `STORAGE_PATH` 数据目录的每日自动备份。
