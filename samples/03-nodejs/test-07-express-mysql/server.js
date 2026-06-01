const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let pool;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'test_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
  }
}

app.get('/', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [orders] = await pool.query('SELECT COUNT(*) as count FROM orders');
    
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Express + MySQL 测试</title>
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
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 1rem 0;
          }
          .stat-item {
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 4px;
          }
          .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #007bff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Express + MySQL 测试</h1>
          <div class="info">
            <p><strong>技术栈：</strong>Express.js + MySQL</p>
            <p><strong>运行端口：</strong>${PORT}</p>
            <p><strong>状态：</strong><span class="status">运行中</span></p>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${products[0].count}</div>
              <div>商品数量</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${orders[0].count}</div>
              <div>订单数量</div>
            </div>
          </div>
          
          <div class="endpoint">
            <h3>可用接口：</h3>
            <p>GET <a href="/api/products">/api/products</a> - 获取商品列表</p>
            <p>GET <a href="/api/orders">/api/orders</a> - 获取订单列表</p>
            <p>GET <a href="/api/health">/api/health</a> - 健康检查</p>
          </div>
          
          <div class="info">
            <p>DemoGo Express + MySQL 部署测试成功！</p>
            <p>此服务连接 DemoGo 试用数据库，展示商品和订单数据。</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Database error: ' + error.message);
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, p.name as product_name 
      FROM orders o 
      JOIN products p ON o.product_id = p.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Express + MySQL server running on port ${PORT}`);
});