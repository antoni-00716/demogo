<template>
  <div class="container">
    <h1 class="title">联系我们</h1>
    <p class="description">
      这是 Nuxt 3 静态导出示例的联系页面
    </p>
    
    <div class="card">
      <h2>联系方式</h2>
      <p>邮箱: demo@example.com</p>
      <p>电话: 123-456-7890</p>
    </div>
    
    <NuxtLink to="/" class="link">
      返回首页
    </NuxtLink>
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

.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  margin-bottom: 2rem;
  max-width: 600px;
}

.card h2 {
  font-size: 1.5rem;
  color: #f5576c;
  margin-bottom: 1rem;
}

.card p {
  color: #666;
  font-size: 1rem;
  margin: 0.5rem 0;
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
