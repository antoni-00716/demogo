import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function App() {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [supabase, setSupabase] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('未连接')

  useEffect(() => {
    const savedUrl = localStorage.getItem('supabase_url')
    const savedKey = localStorage.getItem('supabase_key')
    if (savedUrl && savedKey) {
      setSupabaseUrl(savedUrl)
      setSupabaseKey(savedKey)
      connectToSupabase(savedUrl, savedKey)
    }
  }, [])

  const connectToSupabase = async (url, key) => {
    try {
      setLoading(true)
      setError(null)
      
      const client = createClient(url, key)
      setSupabase(client)
      
      const { data: testData, error: testError } = await client
        .from('test_table')
        .select('*')
        .limit(5)
      
      if (testError) {
        throw testError
      }
      
      setData(testData)
      setConnectionStatus('已连接')
      localStorage.setItem('supabase_url', url)
      localStorage.setItem('supabase_key', key)
    } catch (err) {
      setError(err.message)
      setConnectionStatus('连接失败')
      setSupabase(null)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (supabaseUrl && supabaseKey) {
      connectToSupabase(supabaseUrl, supabaseKey)
    }
  }

  const testConnection = async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: testData, error: testError } = await supabase
        .from('test_table')
        .select('*')
        .limit(5)
      
      if (testError) {
        throw testError
      }
      
      setData(testData)
      setConnectionStatus('连接正常')
    } catch (err) {
      setError(err.message)
      setConnectionStatus('连接异常')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          color: '#333', 
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          React + Supabase 测试
        </h1>
        
        <div style={{ 
          background: '#e8f4fd', 
          padding: '1rem', 
          borderRadius: '4px',
          marginBottom: '2rem'
        }}>
          <p><strong>技术栈：</strong>React + Supabase</p>
          <p><strong>连接状态：</strong><span style={{ 
            color: connectionStatus === '已连接' || connectionStatus === '连接正常' 
              ? '#28a745' 
              : connectionStatus === '连接失败' || connectionStatus === '连接异常'
                ? '#dc3545'
                : '#6c757d',
            fontWeight: 'bold'
          }}>{connectionStatus}</span></p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Supabase URL:
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Anon Key:
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="your-anon-key"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '连接中...' : '连接'}
            </button>
            
            {supabase && (
              <button
                type="button"
                onClick={testConnection}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                测试连接
              </button>
            )}
          </div>
        </form>
        
        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '1rem', 
            borderRadius: '4px',
            marginBottom: '2rem'
          }}>
            <strong>错误：</strong> {error}
          </div>
        )}
        
        {data && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>查询结果：</h3>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '4px',
              overflowX: 'auto'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr>
                    {Object.keys(data[0] || {}).map(key => (
                      <th key={key} style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left',
                        borderBottom: '2px solid #dee2e6',
                        backgroundColor: '#e9ecef'
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} style={{ 
                          padding: '0.75rem', 
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '4px',
          marginTop: '2rem'
        }}>
          <h4 style={{ marginBottom: '0.5rem' }}>使用说明：</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>输入您的 Supabase 项目 URL 和 anon key</li>
            <li>点击"连接"按钮测试连接</li>
            <li>连接成功后会自动查询 test_table 表的数据</li>
            <li>您可以修改代码查询其他表或执行其他操作</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App