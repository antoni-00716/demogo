<script>
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<main>
  <h1>🎉 Hello Svelte!</h1>
  <p class="subtitle">Svelte + Vite 项目示例</p>
  
  <div class="counter">
    <p>计数: {count}</p>
    <button on:click={increment}>
      点击 +1
    </button>
  </div>

  <div class="info">
    <h3>关于 Svelte</h3>
    <p>Svelte 是一个全新的前端框架，它在构建时将代码转换为高效的原生 JavaScript，而不是在运行时解释。</p>
  </div>

  <div class="status">
    ✅ 运行中...
  </div>

  <p class="footer">由 DemoGo 支持</p>
</main>

<style>
  main {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  h1 {
    color: white;
    font-size: 2.5rem;
    margin-bottom: 10px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }

  .subtitle {
    color: rgba(255,255,255,0.9);
    font-size: 1.1rem;
    margin-bottom: 40px;
  }

  .counter {
    background: white;
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .counter p {
    color: #333;
    font-size: 1.5rem;
    margin-bottom: 20px;
  }

  .counter button {
    background: #667eea;
    color: white;
    border: none;
    padding: 15px 40px;
    border-radius: 8px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }

  .counter button:hover {
    background: #5a67d8;
    transform: scale(1.05);
  }

  .counter button:active {
    transform: scale(0.95);
  }

  .info {
    margin-top: 40px;
    background: rgba(255,255,255,0.95);
    border-radius: 12px;
    padding: 30px;
    max-width: 500px;
  }

  .info h3 {
    color: #667eea;
    margin-bottom: 15px;
  }

  .info p {
    color: #4a5568;
    line-height: 1.6;
  }

  .status {
    margin-top: 30px;
    padding: 15px 30px;
    background: #dcfce7;
    border: 1px solid #22c55e;
    border-radius: 8px;
    color: #166534;
  }

  .footer {
    margin-top: 30px;
    color: rgba(255,255,255,0.8);
    font-size: 0.85rem;
  }
</style>
