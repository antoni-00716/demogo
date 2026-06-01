import { useState } from 'react'
import { UserList } from './components/UserList'
import { AddUser } from './components/AddUser'
import './App.css'

function App() {
  const [users, setUsers] = useState([
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' }
  ])

  const addUser = (name, email) => {
    const newUser = {
      id: users.length + 1,
      name,
      email
    }
    setUsers([...users, newUser])
  }

  return (
    <div className="container">
      <div className="content">
        <h1>Vite + tRPC + Prisma</h1>
        <p className="subtitle">端到端类型安全的全栈开发体验</p>
        
        <div className="cards">
          <div className="card">
            <h3>🛡️ 类型安全</h3>
            <p>tRPC 提供完整的端到端类型安全</p>
          </div>
          <div className="card">
            <h3>⚡ 极速开发</h3>
            <p>Vite 带来超快的开发体验</p>
          </div>
          <div className="card">
            <h3>📦 类型安全 ORM</h3>
            <p>Prisma 提供类型安全的数据库操作</p>
          </div>
        </div>

        <div className="user-section">
          <h2>用户管理</h2>
          <AddUser onAddUser={addUser} />
          <UserList users={users} />
        </div>
      </div>
    </div>
  )
}

export default App
