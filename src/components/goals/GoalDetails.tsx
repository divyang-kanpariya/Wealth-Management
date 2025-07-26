'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Goal, Investment } from '@/types';
import GoalProgress from './GoalProgress';
import GoalForm from './GoalForm';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';

interface GoalDetailsProps {
  goalId: string;
  onBack?: () => void;
}

const GoalDetails: React.FC<GoalDetailsProps> = ({ goalId, onBack }) => {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Fetch goal details
  const fetchGoalDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/goals/${goalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch goal details');
      }

      const data = await response.json();
      setGoal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal details');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (goalId) {
      fetchGoalDetails();
    }
  }, [goalId]);

  // Handle goal update
  const handleGoalUpdate = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/goals/${goalId}`, {
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

      // Refresh data
      await fetchGoalDetails();
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

      const response = await fetch(`/api/goals/${goalId}`, {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load goal details"
        message={error}
        onRetry={fetchGoalDetails}
      />
    );
  }

  if (!goal) {
    return (
      <ErrorState
        title="Goal not found"
        message="The requested goal could not be found."
        onRetry={fetchGoalDetails}
      />
    );
  }

  const { currentAmount, percentage } = calculateProgress(goal);
  const timeRemaining = calculateTimeRemaining(goal.targetDate.toISOString());
  const priorityInfo = getPriorityLabel(goal.priority || 3);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack || (() => router.push('/goals'))}
              className="mr-4"
            >
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">{goal.name}</h1>
            <span className={`ml-3 text-xs px-2 py-1 rounded-full ${priorityInfo.color}`}>
              {priorityInfo.label} Priority
            </span>
          </div>
          <div className="flex space-x-2">
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
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Progress Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Progress</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <GoalProgress
              currentAmount={currentAmount}
              targetAmount={goal.targetAmount}
              percentage={percentage}
              className="mb-4"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Current Amount</div>
                <div className="text-xl font-semibold">{formatCurrency(currentAmount)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Target Amount</div>
                <div className="text-xl font-semibold">{formatCurrency(goal.targetAmount)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Remaining</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(Math.max(0, goal.targetAmount - currentAmount))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Goal Details</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Target Date</div>
                <div className="font-medium">{formatDate(goal.targetDate.toISOString())}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Time Remaining</div>
                <div className={`font-medium ${timeRemaining.isOverdue ? 'text-red-600' : ''}`}>
                  {timeRemaining.text}
                </div>
              </div>
              {goal.description && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Description</div>
                  <div className="font-medium">{goal.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linked Investments Section */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Linked Investments</h2>
          {goal.investments && goal.investments.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {goal.investments.map((investment: Investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{investment.name}</div>
                        {investment.symbol && (
                          <div className="text-xs text-gray-500">{investment.symbol}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {investment.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {investment.totalValue ? (
                          formatCurrency(investment.totalValue)
                        ) : investment.units && investment.buyPrice ? (
                          formatCurrency(investment.units * investment.buyPrice)
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {investment.account?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
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
        </div>
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