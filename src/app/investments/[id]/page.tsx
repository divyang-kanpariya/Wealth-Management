'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import InvestmentDetails from '@/components/investments/InvestmentDetails'
import Layout from '@/components/layout/Layout'
import { BreadcrumbItem } from '@/components/ui'
import { Investment } from '@/types'

interface InvestmentDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function InvestmentDetailsPage({ params }: InvestmentDetailsPageProps) {
  const router = useRouter()
  const [investment, setInvestment] = useState<Investment | null>(null)
  const [loading, setLoading] = useState(true)
  const [investmentId, setInvestmentId] = useState<string>('')

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setInvestmentId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (investmentId) {
      fetchInvestment();
    }
  }, [investmentId]);

  const fetchInvestment = async () => {
    try {
      const response = await fetch(`/api/investments/${investmentId}`)
      if (response.ok) {
        const data = await response.json()
        setInvestment(data)
      }
    } catch (error) {
      console.error('Error fetching investment:', error)
    } finally {
      setLoading(false)
    }
  }

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

  // Generate breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/' },
    { label: 'Investments', href: '/investments' },
    { label: loading ? 'Loading...' : (investment?.name || 'Investment Details'), current: true }
  ]

  return (
    <Layout 
      title={loading ? 'Investment Details' : investment?.name || 'Investment Details'}
      subtitle="View and manage investment details"
      breadcrumbs={breadcrumbs}
    >
      <InvestmentDetails
        investmentId={investmentId}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </Layout>
  )
}