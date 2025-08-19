import React from 'react'
import Layout from '@/components/layout/Layout'
import InvestmentListView from '@/components/investments/InvestmentListView'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators'

// Enable dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic'

export default async function InvestmentsPage() {
  const preparator = new InvestmentsDataPreparator()
  const pageData = await preparator.prepare()
  
  return (
    <Layout>
      <InvestmentListView data={pageData} />
    </Layout>
  )
}