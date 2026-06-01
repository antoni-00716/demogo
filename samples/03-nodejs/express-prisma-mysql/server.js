const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Express + Prisma + MySQL 用户管理 API',
    endpoints: {
      getUsers: 'GET /api/users',
      getUser: 'GET /api/users/:id',
      createUser: 'POST /api/users',
      updateUser: 'PUT /api/users/:id',
      deleteUser: 'DELETE /api/users/:id'
    }
  });
});

let users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', age: 25 },
  { id: 2, name: '李四', email: 'lisi@example.com', age: 30 },
  { id: 3, name: '王五', email: 'wangwu@example.com', age: 28 }
];
let nextId = 4;

app.get('/api/users', (req, res) => {
  res.json({ success: true, data: users });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ success: false, message: '用户未找到' });
  }
  res.json({ success: true, data: user });
});

app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: '姓名和邮箱为必填项' });
  }
  
  const newUser = { id: nextId++, name, email, age: age || null };
  users.push(newUser);
  res.status(201).json({ success: true, data: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: '用户未找到' });
  }
  
  const { name, email, age } = req.body;
  users[userIndex] = { ...users[userIndex], name, email, age };
  res.json({ success: true, data: users[userIndex] });
});

app.delete('/api/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: '用户未找到' });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  res.json({ success: true, data: deletedUser });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
