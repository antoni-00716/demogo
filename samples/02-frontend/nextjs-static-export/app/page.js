import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Next.js 14 静态导出</h1>
        <p className={styles.description}>
          使用 Next.js 14 App Router 和 output: 'export' 配置的完整示例
        </p>
        
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <h2>快速构建</h2>
            <p>Next.js 提供快速的构建工具和开发体验</p>
          </div>
          <div className={styles.card}>
            <h2>静态导出</h2>
            <p>使用 output: 'export' 配置生成纯静态文件</p>
          </div>
          <div className={styles.card}>
            <h2>App Router</h2>
            <p>最新的 Next.js 路由系统</p>
          </div>
          <div className={styles.card}>
            <h2>易于部署</h2>
            <p>静态文件可以部署到任何静态托管服务</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/about" className={styles.link}>
            关于我们
          </Link>
          <Link href="/contact" className={styles.link}>
            联系我们
          </Link>
        </nav>
      </div>
    </main>
  )
}
