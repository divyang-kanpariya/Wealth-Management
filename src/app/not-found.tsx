import ErrorState from '@/components/ui/ErrorState'
import { Layout } from '@/components/layout'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="relative">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0120 12c0-4.411-3.589-8-8-8s-8 3.589-8 8a7.962 7.962 0 002 5.291"
              />
            </svg>
          </div>
          
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Page Not Found</h1>
          <p className="mt-2 text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          
          <div className="mt-6 space-y-3">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go to Dashboard
            </Link>
            
            <div className="text-sm text-gray-500">
              <Link href="/investments" className="hover:text-gray-700 underline mr-4">
                Investments
              </Link>
              <Link href="/goals" className="hover:text-gray-700 underline mr-4">
                Goals
              </Link>
              <Link href="/sips" className="hover:text-gray-700 underline mr-4">
                SIPs
              </Link>
              <Link href="/accounts" className="hover:text-gray-700 underline">
                Accounts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}