import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '가격레이더',
  description: '네이버 쇼핑 최저가 모니터링',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
