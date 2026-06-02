<template>
  <div class="container">
    <h1 class="title">Nuxt 3 静态导出</h1>
    <p class="description">
      使用 Nuxt 3、ssr: false 和 target: static 配置的完整示例
    </p>
    
    <div class="card-grid">
      <div class="card">
        <h2>Vue 3</h2>
        <p>使用最新的 Vue 3 组合式 API</p>
      </div>
      <div class="card">
        <h2>静态构建</h2>
        <p>使用 nuxt generate 生成纯静态文件</p>
      </div>
      <div class="card">
        <h2>无需 SSR</h2>
        <p>配置 ssr: false 实现纯客户端渲染</p>
      </div>
      <div class="card">
        <h2>易于部署</h2>
        <p>静态文件可以部署到任何静态托管服务</p>
      </div>
    </div>

    <nav class="nav">
      <NuxtLink to="/about" class="link">
        关于我们
      </NuxtLink>
      <NuxtLink to="/contact" class="link">
        联系我们
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.title {
  font-size: 3.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1rem;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.description {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.9);
  margin-bottom: 3rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  max-width: 900px;
  width: 100%;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}

.card h2 {
  font-size: 1.25rem;
  color: #f5576c;
  margin-bottom: 0.5rem;
}

.card p {
  color: #666;
  font-size: 0.95rem;
}

.nav {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.link {
  background: white;
  color: #f5576c;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.link:hover {
  background: #fff5f5;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}
</style>
