# Express + Prisma + MySQL

这是一个使用 Express、Prisma 和 MySQL 构建的完整用户管理 API 演示项目。

## 功能特性

- ✅ Express 4 作为后端框架
- ✅ Prisma ORM 进行数据库操作
- ✅ MySQL 数据库
- ✅ 用户 CRUD 操作
- ✅ RESTful API 设计

## 快速开始

```bash
npm install
npx prisma db push
npm start
```

## API 端点

- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 获取单个用户
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户
