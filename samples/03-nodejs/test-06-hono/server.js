const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const app = new Hono();
const PORT = process.env.PORT || 3000;

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hono 单服务测试</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          text-align: center;
        }
        .info {
          background: #e8f4fd;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }
        .endpoint {
          background: #f8f9fa;
          padding: 1rem;
          border-left: 4px solid #007bff;
          margin: 1rem 0;
        }
        .status {
          color: #28a745;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hono 单服务测试</h1>
        <div class="info">
          <p><strong>技术栈：</strong>Hono</p>
          <p><strong>运行端口：</strong>${PORT}</p>
          <p><strong>状态：</strong><span class="status">运行中</span></p>
        </div>
        
        <div class="endpoint">
          <h3>可用接口：</h3>
          <p>GET <a href="/api/info">/api/info</a> - 返回服务信息</p>
          <p>GET <a href="/api/health">/api/health</a> - 健康检查</p>
          <p>GET <a href="/api/time">/api/time</a> - 获取当前时间</p>
        </div>
        
        <div class="info">
          <p>DemoGo Node.js 单服务部署测试成功！</p>
          <p>此服务监听 process.env.PORT，符合 DemoGo 运行环境要求。</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/api/info', (c) => {
  return c.json({
    name: 'test-06-hono',
    version: '1.0.0',
    runtime: 'Node.js',
    framework: 'Hono',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/time', (c) => {
  return c.json({
    current_time: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
});

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Hono server running on port ${info.port}`);
});