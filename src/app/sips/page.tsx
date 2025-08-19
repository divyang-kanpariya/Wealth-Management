import React from 'react'
import Layout from '@/components/layout/Layout'
import { SipList } from '@/components/sips'
import { SIPsDataPreparator } from '@/lib/server/data-preparators'

// Enable dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic'

export default async function SipsPage() {
  const preparator = new SIPsDataPreparator()
  const pageData = await preparator.prepare()
  
  return (
    <Layout>
      <SipList data={pageData} />
    </Layout>
  )
}