export function UserList({ users }) {
  return (
    <div className="user-list">
      <h3>用户列表</h3>
      <div className="users">
        {users.map(user => (
        <div key={user.id} className="user-item">
          <div className="user-info">
            <h4>{user.name}</h4>
            <p>{user.email}</p>
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
