'use client'

import React from 'react';
import Layout from '@/components/layout/Layout';
import { GoalList } from '@/components/goals';

export default function GoalsPage() {
  return (
    <Layout 
      title="Financial Goals" 
      subtitle="Manage your financial goals and track progress towards them"
    >
      <GoalList />
    </Layout>
  );
}