import React from 'react';
import { GoalList } from '@/components/goals';

export const metadata = {
  title: 'Financial Goals | Personal Wealth Management',
  description: 'Manage your financial goals and track progress towards them',
};

export default function GoalsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <GoalList />
    </div>
  );
}