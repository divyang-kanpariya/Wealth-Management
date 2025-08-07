import React from 'react';
import { notFound } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import GoalDetailsView from '@/components/goals/GoalDetailsView';
import { GoalDetailDataPreparator } from '@/lib/server/data-preparators';

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GoalDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  try {
    const preparator = new GoalDetailDataPreparator();
    const pageData = await preparator.prepare(id);
    
    return (
      <Layout>
        <GoalDetailsView data={pageData} />
      </Layout>
    );
  } catch (error) {
    // If the goal is not found, show 404
    notFound();
  }
}