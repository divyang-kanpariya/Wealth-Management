'use client'

import React from 'react'
import InvestmentList from '@/components/investments/InvestmentList'
import Layout from '@/components/layout/Layout'

export default function InvestmentsPage() {
  return (
    <Layout>
      <InvestmentList />
    </Layout>
  )
}