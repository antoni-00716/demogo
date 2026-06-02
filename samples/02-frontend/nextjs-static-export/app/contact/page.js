import Link from 'next/link'
import styles from '../page.module.css'

export default function Contact() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>联系我们</h1>
        <p className={styles.description}>
          这是 Next.js 14 静态导出示例的联系页面
        </p>
        
        <div className={styles.card} style={{ marginBottom: '2rem' }}>
          <h2>联系方式</h2>
          <p>邮箱: demo@example.com</p>
          <p>电话: 123-456-7890</p>
        </div>
        
        <Link href="/" className={styles.link}>
          返回首页
        </Link>
      </div>
    </main>
  )
}
