import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from '../components/ErrorBoundary'
import { ToastProvider } from '../components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Personal Wealth Management',
    default: 'Personal Wealth Management',
  },
  description: 'Track your investments, manage financial goals, and monitor portfolio performance',
  keywords: ['investment', 'portfolio', 'wealth management', 'financial goals', 'stocks', 'mutual funds'],
  authors: [{ name: 'Personal Wealth Management' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}