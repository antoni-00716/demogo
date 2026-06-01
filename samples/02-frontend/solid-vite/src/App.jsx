import { createSignal } from 'solid-js';

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div style={{
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'min-height': '100vh',
      'display': 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
      'padding': '20px'
    }}>
      <h1 style={{
        'color': 'white',
        'font-size': '2.5rem',
        'margin-bottom': '10px',
        'text-shadow': '0 2px 10px rgba(0,0,0,0.2)'
      }}>🎉 Hello Solid!</h1>
      <p style={{
        'color': 'rgba(255,255,255,0.9)',
        'font-size': '1.1rem',
        'margin-bottom': '40px'
      }}>Solid + Vite 项目示例</p>

      <div style={{
        'background': 'white',
        'border-radius': '16px',
        'padding': '40px',
        'text-align': 'center',
        'box-shadow': '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <p style={{
          'color': '#333',
          'font-size': '1.5rem',
          'margin-bottom': '20px'
        }}>计数: {count()}</p>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            'background': '#667eea',
            'color': 'white',
            'border': 'none',
            'padding': '15px 40px',
            'border-radius': '8px',
            'font-size': '1.1rem',
            'cursor': 'pointer',
            'transition': 'transform 0.2s, background 0.2s'
          }}
          onMouseEnter={e => e.target.style.background = '#5a67d8'}
          onMouseLeave={e => e.target.style.background = '#667eea'}
        >
          点击 +1
        </button>
      </div>

      <div style={{
        'margin-top': '40px',
        'background': 'rgba(255,255,255,0.95)',
        'border-radius': '12px',
        'padding': '30px',
        'max-width': '500px'
      }}>
        <h3 style={{
          'color': '#667eea',
          'margin-bottom': '15px'
        }}>关于 Solid</h3>
        <p style={{
          'color': '#4a5568',
          'line-height': '1.6'
        }}>
          Solid 是一个用于构建用户界面的声明式 JavaScript 库，
          它使用细粒度的响应式系统来实现高性能，编译后没有虚拟 DOM 开销。
        </p>
      </div>

      <div style={{
        'margin-top': '30px',
        'padding': '15px 30px',
        'background': '#dcfce7',
        'border': '1px solid #22c55e',
        'border-radius': '8px',
        'color': '#166534'
      }}>
        ✅ 运行中...
      </div>

      <p style={{
        'margin-top': '30px',
        'color': 'rgba(255,255,255,0.8)',
        'font-size': '0.85rem'
      }}>由 DemoGo 支持</p>
    </div>
  );
}

export default App;
