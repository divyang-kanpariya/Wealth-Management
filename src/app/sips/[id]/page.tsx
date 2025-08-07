import { notFound } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { SIPDetailDataPreparator } from '@/lib/server/data-preparators/sip-detail'
import { SipDetailView } from '@/components/sips/SipDetailView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SipDetailPage({ params }: PageProps) {
  const { id } = await params
  
  try {
    const preparator = new SIPDetailDataPreparator()
    const pageData = await preparator.prepare(id)
    
    return (
      <Layout>
        <SipDetailView data={pageData} />
      </Layout>
    )
  } catch (error) {
    // If it's a Next.js notFound error, let it bubble up
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    
    // For other errors, show not found
    notFound()
  }
}

