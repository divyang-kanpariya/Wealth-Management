import React from 'react';
import Layout from '@/components/layout/Layout';
import { GoalListView } from '@/components/goals';
import { GoalsDataPreparator } from '@/lib/server/data-preparators';

export default async function GoalsPage() {
  const preparator = new GoalsDataPreparator();
  const pageData = await preparator.prepare();

  return (
    <Layout>
      <GoalListView data={pageData} />
    </Layout>
  );
}