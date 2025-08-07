'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoalDetailPageData } from '@/lib/server/data-preparators';
import { Goal, Investment } from '@/types';
import GoalProgress from './GoalProgress';
import GoalForm from './GoalForm';
import GoalAnalytics from './GoalAnalytics';
import GoalInvestmentList from './GoalInvestmentList';
import GoalMilestones from './GoalMilestones';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';
import CompactCard from '../ui/CompactCard';
import DataGrid from '../ui/DataGrid';

interface GoalDetailsViewProps {
  data: GoalDetailPageData;
}

const GoalDetailsView: React.FC<GoalDetailsViewProps> = ({ data }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'investments' | 'milestones'>('overview');

  const { goal, goalProgress, investmentsWithValues, projections } = data;

  // Handle goal update
  const handleGoalUpdate = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update goal');
      }

      // Refresh the page to get updated data
      router.refresh();
      setIsEditModalOpen(false);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Goal updated successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle goal deletion
  const handleGoalDelete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete goal');
      }

      // Navigate back to goals list
      router.push('/goals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate days remaining
  const calculateTimeRemaining = (targetDate: string | Date) => {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const daysRemaining = Math.ceil(
      (target.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysRemaining <= 0) {
      return { text: 'Overdue', isOverdue: true };
    }
    
    const years = Math.floor(daysRemaining / 365);
    const months = Math.floor((daysRemaining % 365) / 30);
    const days = daysRemaining % 30;
    
    let result = '';
    if (years > 0) {
      result += `${years} year${years > 1 ? 's' : ''} `;
    }
    if (months > 0) {
      result += `${months} month${months > 1 ? 's' : ''} `;
    }
    if (days > 0 && years === 0) {
      result += `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return { text: result.trim(), isOverdue: false };
  };

  // Get priority label
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: 'Highest', color: 'bg-red-100 text-red-800' };
      case 2: return { label: 'High', color: 'bg-orange-100 text-orange-800' };
      case 3: return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
      case 4: return { label: 'Low', color: 'bg-blue-100 text-blue-800' };
      case 5: return { label: 'Lowest', color: 'bg-green-100 text-green-800' };
      default: return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const timeRemaining = calculateTimeRemaining(goal.targetDate);
  const priorityInfo = getPriorityLabel(goal.priority || 3);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'investments', label: 'Investments' },
    { id: 'milestones', label: 'Milestones' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <CompactCard 
        title={goal.name}
        badge={`${priorityInfo.label} Priority`}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/goals')}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              disabled={isSubmitting}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSubmitting}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Quick Stats */}
          <DataGrid
            items={[
              {
                label: 'Progress',
                value: `${goalProgress.progress}%`,
                color: goalProgress.progress >= 75 ? 'success' : goalProgress.progress >= 50 ? 'warning' : 'danger'
              },
              {
                label: 'Current Value',
                value: formatCurrency(goalProgress.currentValue),
                color: 'info'
              },
              {
                label: 'Target Amount',
                value: formatCurrency(goal.targetAmount),
                color: 'default'
              },
              {
                label: 'Time Remaining',
                value: timeRemaining.text,
                color: timeRemaining.isOverdue ? 'danger' : 'default'
              }
            ]}
            columns={4}
            variant="compact"
          />

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                goalProgress.progress >= 100 ? 'bg-green-500' :
                goalProgress.progress >= 75 ? 'bg-blue-500' :
                goalProgress.progress >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(goalProgress.progress, 100)}%` }}
            />
          </div>

          {goal.description && (
            <p className="text-gray-600 text-sm">{goal.description}</p>
          )}
        </div>
      </CompactCard>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Progress Section */}
            <CompactCard title="Goal Progress">
              <GoalProgress
                currentAmount={goalProgress.currentValue}
                targetAmount={goal.targetAmount}
                percentage={goalProgress.progress}
                className="mb-4"
              />
              
              <DataGrid
                items={[
                  {
                    label: 'Current Amount',
                    value: formatCurrency(goalProgress.currentValue),
                    color: 'info'
                  },
                  {
                    label: 'Target Amount',
                    value: formatCurrency(goal.targetAmount),
                    color: 'default'
                  },
                  {
                    label: 'Remaining',
                    value: formatCurrency(goalProgress.remainingAmount),
                    color: 'warning'
                  }
                ]}
                columns={3}
                variant="default"
                className="mt-6"
              />
            </CompactCard>

            {/* Goal Details */}
            <CompactCard title="Goal Details">
              <DataGrid
                items={[
                  {
                    label: 'Target Date',
                    value: formatDate(goal.targetDate)
                  },
                  {
                    label: 'Time Remaining',
                    value: timeRemaining.text,
                    color: timeRemaining.isOverdue ? 'danger' : 'default'
                  },
                  {
                    label: 'Priority',
                    value: priorityInfo.label,
                    color: 'default'
                  },
                  {
                    label: 'Investments',
                    value: (goal.investments?.length || 0).toString(),
                    color: 'info'
                  }
                ]}
                columns={2}
                variant="default"
              />
            </CompactCard>

            {/* Projections */}
            <CompactCard title="Projections">
              <DataGrid
                items={[
                  {
                    label: 'Months to Target',
                    value: projections.monthsToTarget.toString(),
                    color: 'info'
                  },
                  {
                    label: 'Required Monthly Investment',
                    value: formatCurrency(projections.requiredMonthlyInvestment),
                    color: 'warning'
                  },
                  {
                    label: 'Projected Completion',
                    value: formatDate(projections.projectedCompletionDate),
                    color: 'default'
                  }
                ]}
                columns={3}
                variant="default"
              />
            </CompactCard>

            {/* Recent Investments */}
            <CompactCard title="Recent Investments">
              {investmentsWithValues && investmentsWithValues.length > 0 ? (
                <div className="space-y-3">
                  {investmentsWithValues.slice(0, 5).map((invWithValue) => (
                    <div key={invWithValue.investment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{invWithValue.investment.name}</div>
                        <div className="text-sm text-gray-600">{invWithValue.investment.type.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(invWithValue.currentValue)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(invWithValue.investment.buyDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {investmentsWithValues.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-gray-600">
                        and {investmentsWithValues.length - 5} more investments
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">No investments are linked to this goal yet.</p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/investments')}
                  >
                    Add Investments
                  </Button>
                </div>
              )}
            </CompactCard>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <GoalAnalytics goal={goal} />
        )}

        {/* Investments Tab */}
        {activeTab === 'investments' && (
          <GoalInvestmentList 
            goal={goal}
            investments={data.investmentsWithValues || []}
            accounts={[]} // TODO: Add accounts to page data
            availableGoals={[]} // TODO: Add available goals to page data
            onInvestmentUpdate={() => router.refresh()}
          />
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <GoalMilestones 
            goal={goal} 
            currentAmount={goalProgress.currentValue}
          />
        )}
      </div>

      {/* Edit Goal Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Goal"
        size="lg"
      >
        <GoalForm
          goal={goal}
          onSubmit={handleGoalUpdate}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Goal"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete &quot;{goal.name}&quot;? This action cannot be undone.
            {goal.investments && goal.investments.length > 0 && (
              <span className="block mt-2 text-amber-600">
                Note: This goal has {goal.investments.length} linked investments. 
                These investments will be updated to have no goal.
              </span>
            )}
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGoalDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Message */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            type={statusMessage.type} 
            message={statusMessage.text}
            onClose={() => setStatusMessage(null)}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            type="error" 
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}
    </div>
  );
};

export default GoalDetailsView;