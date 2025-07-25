'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import InvestmentDetails from '@/components/investments/InvestmentDetails'
import Layout from '@/components/layout/Layout'

interface InvestmentDetailsPageProps {
  params: {
    id: string
  }
}

export default function InvestmentDetailsPage({ params }: InvestmentDetailsPageProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push('/investments')
  }

  const handleEdit = (investment: any) => {
    // This would typically open an edit modal or navigate to edit page
    console.log('Edit investment:', investment)
  }

  const handleDelete = (investment: any) => {
    // This would typically show a confirmation dialog
    console.log('Delete investment:', investment)
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <InvestmentDetails
          investmentId={params.id}
          onBack={handleBack}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </Layout>
  )
}