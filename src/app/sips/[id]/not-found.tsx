import Link from 'next/link'
import Layout from '@/components/layout/Layout'

export default function NotFound() {
  return (
    <Layout>
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.608-4.29-3.593 0-.98.407-1.864 1.063-2.528.656-.664 1.548-1.071 2.527-1.071s1.871.407 2.527 1.071c.656.664 1.063 1.548 1.063 2.528 0 1.985-1.95 3.593-4.29 3.593z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">SIP Not Found</h2>
        <p className="text-gray-600 mb-6">
          The SIP you&apos;re looking for doesn&apos;t exist or may have been deleted.
        </p>
        <div className="space-x-4">
          <Link 
            href="/sips"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to SIPs
          </Link>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  )
}