import React from 'react'
import Layout from '@/components/layout/Layout'
import { SipList } from '@/components/sips'
import { SIPsDataPreparator } from '@/lib/server/data-preparators'

export default async function SipsPage() {
  const preparator = new SIPsDataPreparator()
  const pageData = await preparator.prepare()
  
  return (
    <Layout>
      <SipList data={pageData} />
    </Layout>
  )
}