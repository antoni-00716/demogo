import './globals.css'

export const metadata = {
  title: 'Next.js 静态导出',
  description: 'Next.js 14 App Router 静态导出示例',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
