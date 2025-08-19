'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Goal, Investment } from '@/types';
import { GoalDetailPageData } from '@/lib/server/data-preparators';
import { calculateGoalProgressWithInflation } from '@/lib/calculations';
import GoalProgress from './GoalProgress';
import GoalForm from './GoalForm';
import GoalAnalytics from './GoalAnalytics';
import GoalInvestmentList from './GoalInvestmentList';
import GoalMilestones from './GoalMilestones';
import Button from '../ui/Button';
import ErrorState from '../ui/ErrorState';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';
import CompactCard from '../ui/CompactCard';
import DataGrid from '../ui/DataGrid';
import TabPanel from '../ui/TabPanel';
import { Toggle, Tooltip, InflationDisplay } from '../ui';

interface GoalDetailsProps {
  data: GoalDetailPageData;
  onBack?: () => void;
}

const GoalDetails: React.FC<GoalDetailsProps> = ({ data, onBack }) => {
  const router = useRouter();
  const { goal } = data;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'investments' | 'milestones'>('overview');
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);
  const [inflationRate, setInflationRate] = useState(6);

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

      // Navigate back or to goals list
      if (onBack) {
        onBack();
      } else {
        router.push('/goals');
      }
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate days remaining
  const calculateTimeRemaining = (targetDate: string) => {
    const daysRemaining = Math.ceil(
      (new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
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

  // Calculate current progress
  const calculateProgress = (goal: Goal) => {
    if (!goal.investments || goal.investments.length === 0) {
      return { currentAmount: 0, percentage: 0 };
    }
    
    const currentAmount = goal.investments.reduce((sum, investment) => {
      // If the investment has a current value, use that, otherwise calculate from units and price
      if (investment.totalValue) {
        return sum + investment.totalValue;
      } else if (investment.units && investment.buyPrice) {
        return sum + (investment.units * investment.buyPrice);
      }
      return sum;
    }, 0);
    
    const percentage = Math.min(Math.round((currentAmount / goal.targetAmount) * 100), 100);
    
    return { currentAmount, percentage };
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

  if (error) {
    return (
      <ErrorState
        title="Failed to update goal"
        message={error}
        onRetry={() => setError(null)}
      />
    );
  }

  if (!goal) {
    return (
      <ErrorState
        title="Goal not found"
        message="The requested goal could not be found."
        onRetry={() => router.push('/goals')}
      />
    );
  }

  const { currentAmount, percentage } = calculateProgress(goal);
  const inflationAdjustedProgress = calculateGoalProgressWithInflation(
    goal, 
    data.investmentsWithValues || [], 
    inflationRate
  );
  const timeRemaining = calculateTimeRemaining(typeof goal.targetDate === 'string' ? goal.targetDate : goal.targetDate.toISOString());
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
              onClick={onBack || (() => router.push('/goals'))}
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
          {/* Value Type Toggle */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${!showInflationAdjusted ? 'text-blue-600' : 'text-gray-500'}`}>
                Nominal Values
              </span>
              <Toggle
                checked={showInflationAdjusted}
                onChange={setShowInflationAdjusted}
                size="sm"
              />
              <span className={`text-sm font-medium ${showInflationAdjusted ? 'text-blue-600' : 'text-gray-500'}`}>
                Inflation Adjusted
              </span>
            </div>
            <div className="text-xs text-blue-600">
              {showInflationAdjusted ? 'Real purchasing power' : 'Future value without inflation'}
            </div>
          </div>

          {/* Quick Stats */}
          <DataGrid
            items={[
              {
                label: 'Progress',
                value: showInflationAdjusted 
                  ? `${Math.round(inflationAdjustedProgress.realProgress)}%`
                  : `${percentage}%`,
                color: (showInflationAdjusted ? inflationAdjustedProgress.realProgress : percentage) >= 75 
                  ? 'success' 
                  : (showInflationAdjusted ? inflationAdjustedProgress.realProgress : percentage) >= 50 
                    ? 'warning' 
                    : 'danger'
              },
              {
                label: 'Current Value',
                value: formatCurrency(currentAmount),
                color: 'info'
              },
              {
                label: showInflationAdjusted ? 'Inflation-Adjusted Target' : 'Target Amount',
                value: showInflationAdjusted 
                  ? formatCurrency(inflationAdjustedProgress.inflationAdjustedTarget)
                  : formatCurrency(goal.targetAmount),
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
                percentage >= 100 ? 'bg-green-500' :
                percentage >= 75 ? 'bg-blue-500' :
                percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
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
                currentAmount={currentAmount}
                targetAmount={showInflationAdjusted ? inflationAdjustedProgress.inflationAdjustedTarget : goal.targetAmount}
                percentage={showInflationAdjusted ? inflationAdjustedProgress.realProgress : percentage}
                className="mb-4"
              />
              
              <DataGrid
                items={[
                  {
                    label: 'Current Amount',
                    value: formatCurrency(currentAmount),
                    color: 'info'
                  },
                  {
                    label: showInflationAdjusted ? 'Inflation-Adjusted Target' : 'Target Amount',
                    value: showInflationAdjusted 
                      ? formatCurrency(inflationAdjustedProgress.inflationAdjustedTarget)
                      : formatCurrency(goal.targetAmount),
                    color: 'default'
                  },
                  {
                    label: 'Remaining',
                    value: showInflationAdjusted
                      ? formatCurrency(Math.max(0, inflationAdjustedProgress.inflationAdjustedTarget - currentAmount))
                      : formatCurrency(Math.max(0, goal.targetAmount - currentAmount)),
                    color: 'warning'
                  }
                ]}
                columns={3}
                variant="default"
                className="mt-6"
              />

              {/* Inflation Impact Summary */}
              {showInflationAdjusted && (
                <div className="mt-6">
                  <InflationDisplay
                    nominalValue={inflationAdjustedProgress.inflationAdjustedTarget}
                    realValue={goal.targetAmount}
                    inflationRate={inflationRate}
                    years={inflationAdjustedProgress.yearsToTarget}
                    onInflationRateChange={setInflationRate}
                    title="Inflation Impact Summary"
                    nominalLabel="Inflation-Adjusted Target"
                    realLabel="Original Goal"
                    variant="default"
                    showToggle={false}
                    description="How inflation affects your goal over time"
                  />
                </div>
              )}
            </CompactCard>

            {/* Goal Details */}
            <CompactCard title="Goal Details">
              <DataGrid
                items={[
                  {
                    label: 'Target Date',
                    value: formatDate(typeof goal.targetDate === 'string' ? goal.targetDate : goal.targetDate.toISOString())
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
                    value: goal.investments?.length.toString() || '0',
                    color: 'info'
                  }
                ]}
                columns={2}
                variant="default"
              />
            </CompactCard>

            {/* Recent Investments */}
            <CompactCard title="Recent Investments">
              {goal.investments && goal.investments.length > 0 ? (
                <div className="space-y-3">
                  {goal.investments.slice(0, 5).map((investment: Investment) => (
                    <div key={investment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{investment.name}</div>
                        <div className="text-sm text-gray-600">{investment.type.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {investment.totalValue ? (
                            formatCurrency(investment.totalValue)
                          ) : investment.units && investment.buyPrice ? (
                            formatCurrency(investment.units * investment.buyPrice)
                          ) : (
                            'N/A'
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(investment.buyDate.toString())}
                        </div>
                      </div>
                    </div>
                  ))}
                  {goal.investments.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-gray-600">
                        and {goal.investments.length - 5} more investments
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
            currentAmount={currentAmount}
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
    </div>
  );
};

export default GoalDetails;