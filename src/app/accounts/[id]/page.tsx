import React from 'react';
import { notFound } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { AccountDetailDataPreparator } from '@/lib/server/data-preparators/account-detail';
import { AccountDetailView } from '@/components/accounts/AccountDetailView';

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params
  const preparator = new AccountDetailDataPreparator()
  
  try {
    const pageData = await preparator.prepare(id)
    
    return (
      <Layout>
        <AccountDetailView data={pageData} />
      </Layout>
    )
  } catch (error) {
    // Handle not found case
    if (error && typeof error === 'object' && 'digest' in error) {
      notFound()
    }
    
    // Handle other errors
    throw error
  }
}

