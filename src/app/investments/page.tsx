import React from 'react'
import Layout from '@/components/layout/Layout'
import InvestmentListView from '@/components/investments/InvestmentListView'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators'

export default async function InvestmentsPage() {
  const preparator = new InvestmentsDataPreparator()
  const pageData = await preparator.prepare()
  
  return (
    <Layout>
      <InvestmentListView data={pageData} />
    </Layout>
  )
}