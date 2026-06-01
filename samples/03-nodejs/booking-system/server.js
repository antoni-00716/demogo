const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'booking',
      waitForConnections: true,
      connectionLimit: 5
    });
  }
  return pool;
}

app.get('/api/health', async (req, res) => {
  let dbOk = false;
  try {
    const p = await getPool();
    await p.query('SELECT 1');
    dbOk = true;
  } catch (e) {
    dbOk = false;
  }
  res.json({ status: 'ok', db: dbOk, version: '1.0.0' });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { name, phone, date, time_slot, note } = req.body;
    if (!name || !phone || !date || !time_slot) {
      return res.status(400).json({ error: '请填写姓名、手机号、日期和时段' });
    }
    const p = await getPool();
    const [result] = await p.execute(
      'INSERT INTO bookings (name, phone, date, time_slot, note) VALUES (?, ?, ?, ?, ?)',
      [name, phone, date, time_slot, note || '']
    );
    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error('POST /api/bookings error:', e.message);
    res.status(500).json({ error: '提交失败: ' + e.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const p = await getPool();
    const [rows] = await p.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (e) {
    console.error('GET /api/bookings error:', e.message);
    res.status(500).json({ error: '查询失败: ' + e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Booking system running on port ${PORT}`);
});
