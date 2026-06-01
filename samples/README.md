# DemoGo 测试 Demo 集合

这个目录包含 DemoGo 支持的所有技术类型的示例项目，用于测试项目分类、构建和部署功能。

## 目录结构

```
samples/
├── 01-static/          # 静态网站类
├── 02-frontend/        # 前端构建项目
├── 03-nodejs/          # Node.js 服务
├── 04-special/         # 特殊类型
├── README.md
├── DEMOS_SUMMARY.md
└── test-all-demos.js
```

## 项目类型清单

### 01-static/ - 静态网站类
- [x] `static-website-basic` - 基础静态网站
- [x] `static-website-multipage` - 多页网站
- [x] `spa-dist-output` - SPA 编译输出 (dist 目录)
- [x] `test-01-static-html` - 静态 HTML 测试

### 02-frontend/ - 前端构建项目
- [x] `test-02-react-vite` - React + Vite
- [x] `test-03-vue-vite` - Vue + Vite
- [x] `svelte-vite` - Svelte + Vite
- [x] `solid-vite` - Solid + Vite
- [x] `astro-static` - Astro 静态网站
- [x] `test-08-react-supabase` - React + Supabase

### 03-nodejs/ - Node.js 服务类
- [x] `test-04-express` - Express 基础服务
- [x] `koa-basic` - Koa 基础服务
- [x] `test-05-fastify` - Fastify 基础服务
- [x] `test-06-hono` - Hono 基础服务
- [x] `test-07-express-mysql` - Express + MySQL
- [x] `booking-system` - Express + MySQL (完整应用)

### 04-special/ - 特殊类型
- [x] `h5-mobile-page` - H5 移动页面
- [x] `dashboard-echarts` - 数据看板 (ECharts)
- [x] `big-screen-threejs` - 数字大屏 (Three.js)
- [x] `ai-chat-app` - AI 聊天应用
- [x] `web3-wallet-demo` - Web3 钱包演示

## 使用方法

### 1. 单个 Demo 测试

```bash
# 进入 demo 目录
cd samples/02-frontend/test-02-react-vite

# 安装依赖 (可选，用于本地测试)
npm install

# 构建 (前端项目需要)
npm run build

# 运行服务 (Node.js 项目)
npm start
```

### 2. 使用 DemoGo 部署

```bash
# 方法 1: 使用 CLI
demogo deploy samples/02-frontend/test-02-react-vite

# 方法 2: 打包上传
cd samples/02-frontend/test-02-react-vite
zip -r project.zip .
# 然后在 DemoGo Web 界面上传
```

### 3. 批量测试

运行测试脚本：
```bash
cd samples
node test-all-demos.js
```

## Demo 文件结构说明

每个 demo 项目应该包含：

```
demo-name/
├── .demogo/
│   └── project.json    # DemoGo 项目配置 (可选)
├── package.json        # 项目依赖和脚本 (如有)
├── README.md          # 项目说明
└── [其他项目文件]
```

## 项目配置 (.demogo/project.json)

```json
{
  "name": "项目名称",
  "description": "项目描述",
  "tags": ["React", "Vite"],
  "demoType": "frontend-build"
}
```
