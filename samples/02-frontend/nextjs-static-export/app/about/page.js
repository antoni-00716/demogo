import Link from 'next/link'
import styles from '../page.module.css'

export default function About() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>关于我们</h1>
        <p className={styles.description}>
          这是 Next.js 14 静态导出示例的关于页面
        </p>
        
        <div className={styles.card} style={{ marginBottom: '2rem' }}>
          <h2>项目介绍</h2>
          <p>
            本项目演示了如何使用 Next.js 14 的 App Router 和静态导出功能，
            生成可以部署到任何静态托管服务的纯静态文件。
          </p>
        </div>
        
        <Link href="/" className={styles.link}>
          返回首页
        </Link>
      </div>
    </main>
  )
}
