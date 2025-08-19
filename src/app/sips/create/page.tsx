import React from 'react'
import Layout from '@/components/layout/Layout'
import { SipCalculatorPage } from '@/components/sips'
import { GoalsDataPreparator } from '@/lib/server/data-preparators'
import { AccountsDataPreparator } from '@/lib/server/data-preparators'

// Enable dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'

export default async function CreateSipPage() {
  // Get goals and accounts for linking
  const goalsPreparator = new GoalsDataPreparator()
  const accountsPreparator = new AccountsDataPreparator()
  
  const [goalsData, accountsData] = await Promise.all([
    goalsPreparator.prepare(),
    accountsPreparator.prepare()
  ])
  
  return (
    <Layout>
      <SipCalculatorPage 
        goals={goalsData.goals}
        accounts={accountsData.accounts}
      />
    </Layout>
  )
}