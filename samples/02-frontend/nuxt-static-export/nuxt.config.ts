export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  target: 'static',
  app: {
    head: {
      title: 'Nuxt 3 静态导出',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Nuxt 3 静态导出示例' }
      ]
    }
  }
})
