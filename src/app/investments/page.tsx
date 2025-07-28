'use client'

import React from 'react'
import Layout from '@/components/layout/Layout'
import InvestmentList from '@/components/investments/InvestmentList'

export default function InvestmentsPage() {
  return (
    <Layout>
      <InvestmentList />
    </Layout>
  )
}