'use client'

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import GoalDetails from '@/components/goals/GoalDetails';
import { BreadcrumbItem } from '@/components/ui';
import { Goal } from '@/types';

export default function GoalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalId, setGoalId] = useState<string>('');

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setGoalId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (goalId) {
      fetchGoal();
    }
  }, [goalId]);

  const fetchGoal = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}`);
      if (response.ok) {
        const data = await response.json();
        setGoal(data);
      }
    } catch (error) {
      console.error('Error fetching goal:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/' },
    { label: 'Goals', href: '/goals' },
    { label: loading ? 'Loading...' : (goal?.name || 'Goal Details'), current: true }
  ];

  return (
    <Layout>
      <GoalDetails goalId={goalId} />
    </Layout>
  );
}