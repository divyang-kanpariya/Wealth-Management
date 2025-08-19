import React from 'react';
import Layout from '@/components/layout/Layout';
import { GoalListView } from '@/components/goals';
import { GoalsDataPreparator } from '@/lib/server/data-preparators';

// Enable dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const preparator = new GoalsDataPreparator();
  const pageData = await preparator.prepare();

  return (
    <Layout>
      <GoalListView data={pageData} />
    </Layout>
  );
}