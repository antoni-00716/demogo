const Koa = require('koa');
const app = new Koa();

app.use(async (ctx) => {
  if (ctx.path === '/') {
    ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Koa 服务</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: white; border-radius: 20px; padding: 60px 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; margin: 20px; }
    h1 { color: #333; font-size: 2.5rem; margin-bottom: 10px; }
    .subtitle { color: #666; font-size: 1.1rem; margin-bottom: 30px; }
    .status { margin-top: 20px; padding: 15px; background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; color: #166534; }
    .routes { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: left; }
    .routes h3 { margin-bottom: 10px; color: #333; }
    .routes ul { list-style: none; }
    .routes li { padding: 8px 0; color: #4a5568; }
    .routes code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Koa 服务</h1>
    <p class="subtitle">Node.js Koa 框架示例</p>
    <div class="routes">
      <h3>可用路由：</h3>
      <ul>
        <li><code>GET /</code> - 首页</li>
        <li><code>GET /api</code> - API 接口</li>
        <li><code>GET /api/hello</code> - Hello 接口</li>
      </ul>
    </div>
    <div class="status">
      ✅ 服务运行中... 端口: ${process.env.PORT || 3000}
    </div>
    <p style="margin-top: 30px; color: #999; font-size: 0.85rem;">由 DemoGo 自动部署</p>
  </div>
</body>
</html>
    `;
    ctx.type = 'text/html';
  } else if (ctx.path === '/api') {
    ctx.body = {
      message: 'Koa API 服务',
      version: '1.0.0',
      status: 'running'
    };
  } else if (ctx.path === '/api/hello') {
    ctx.body = {
      message: 'Hello from Koa!',
      timestamp: new Date().toISOString()
    };
  } else {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Koa server running on port ${port}`);
});
