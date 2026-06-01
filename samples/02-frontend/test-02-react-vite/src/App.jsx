import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1>React + Vite 测试</h1>
      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, margin: '20px 0' }}>
        <p>这是一个 React + Vite 项目，需要构建后发布。</p>
        <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>
          ✅ 如果你看到这个页面，说明 React + Vite 构建产物发布成功。
        </p>
      </div>
      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, margin: '20px 0' }}>
        <h2>计数器测试</h2>
        <p>点击次数：{count}</p>
        <button onClick={() => setCount(count + 1)} style={{ padding: '10px 20px', fontSize: 16 }}>
          点击 +1
        </button>
      </div>
    </div>
  )
}

export default App
