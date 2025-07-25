import React from 'react';
import GoalDetails from '@/components/goals/GoalDetails';

export const metadata = {
  title: 'Goal Details | Personal Wealth Management',
  description: 'View and manage details of your financial goal',
};

export default function GoalDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <GoalDetails goalId={params.id} />
    </div>
  );
}