<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <p class="description">{{ description }}</p>
    
    <div class="counter-section">
      <p class="count">{{ count }}</p>
      <button @click="increment" class="btn">
        Click Me
      </button>
    </div>
    
    <div class="tech-stack">
      <p class="tech-title">技术栈：</p>
      <p class="tech-list">Vue 3 + Vite</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Vue + Vite Test')
const description = ref('DemoGo 构建产物测试')
const count = ref(0)

const increment = () => {
  count.value++
}
</script>

<style scoped>
.container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.8rem;
}

.description {
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.counter-section {
  margin-bottom: 2rem;
}

.count {
  font-size: 3rem;
  font-weight: bold;
  color: #42b883;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #36a072;
}

.tech-stack {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.tech-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
}

.tech-list {
  color: #666;
}
</style>