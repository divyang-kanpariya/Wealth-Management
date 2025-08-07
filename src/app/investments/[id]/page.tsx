import React from 'react'
import { InvestmentDetailDataPreparator } from '@/lib/server/data-preparators'
import InvestmentDetailView from '@/components/investments/InvestmentDetailView'
import Layout from '@/components/layout/Layout'

interface InvestmentDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvestmentDetailsPage({ params }: InvestmentDetailsPageProps) {
  const { id } = await params
  
  const preparator = new InvestmentDetailDataPreparator()
  const pageData = await preparator.prepare(id)

  return (
    <Layout>
      <InvestmentDetailView data={pageData} />
    </Layout>
  )
}