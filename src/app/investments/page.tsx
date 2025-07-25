'use client'

import React from 'react'
import InvestmentList from '@/components/investments/InvestmentList'
import Layout from '@/components/layout/Layout'

export default function InvestmentsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <InvestmentList />
      </div>
    </Layout>
  )
}