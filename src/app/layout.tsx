import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Personal Wealth Management',
    default: 'Personal Wealth Management',
  },
  description: 'Track your investments, manage financial goals, and monitor portfolio performance',
  keywords: ['investment', 'portfolio', 'wealth management', 'financial goals', 'stocks', 'mutual funds'],
  authors: [{ name: 'Personal Wealth Management' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}