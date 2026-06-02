import { useState } from 'react'

export function AddUser({ onAddUser }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name && email) {
      onAddUser(name, email)
      setName('')
      setEmail('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-user">
      <h3>添加用户</h3>
      <div className="form-group">
        <input
          type="text"
          placeholder="姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">添加</button>
      </div>
    </form>
  )
}
