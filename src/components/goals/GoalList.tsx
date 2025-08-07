'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Goal } from '@/types';
import { GoalsPageData } from '@/lib/server/data-preparators/goals';
import GoalTable from './GoalTable';
import GoalForm from './GoalForm';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { CompactCard, QuickActions } from '../ui';
import Alert from '../ui/Alert';

interface GoalListProps {
  data: GoalsPageData;
  className?: string;
  onViewDetails?: (goalId: string) => void;
}

const GoalList: React.FC<GoalListProps> = ({ 
  data, 
  className = '', 
  onViewDetails 
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Handle goal form submission
  const handleGoalSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const url = selectedGoal 
        ? `/api/goals/${selectedGoal.id}`
        : '/api/goals';
      
      const method = selectedGoal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }

      // Close modal and refresh page
      setIsEditModalOpen(false);
      setSelectedGoal(null);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: selectedGoal ? 'Goal updated successfully' : 'Goal created successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);

      // Refresh the page to get updated data
      router.refresh();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save goal'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle goal deletion
  const handleGoalDelete = async () => {
    if (!selectedGoal) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete goal');
      }

      // Close modal and refresh page
      setIsDeleteModalOpen(false);
      setSelectedGoal(null);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Goal deleted successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);

      // Refresh the page to get updated data
      router.refresh();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete goal'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsEditModalOpen(true);
  };

  // Handle delete button click
  const handleDelete = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDeleteModalOpen(true);
  };

  // Handle view details click
  const handleViewDetails = (goal: Goal) => {
    if (onViewDetails) {
      // If external handler is provided, use it
      onViewDetails(goal.id);
    } else {
      // Navigate to goal details page
      router.push(`/goals/${goal.id}`);
    }
  };

  // Handle add new goal
  const handleAddNew = () => {
    setSelectedGoal(null);
    setIsEditModalOpen(true);
  };



  return (
    <div className="space-y-4">
        {/* Header Card */}
        <CompactCard
          title="My Goals"
          badge={data.goals.length}
          variant="default"
          actions={
            <QuickActions
              actions={[
                {
                  id: 'add-goal',
                  label: 'Add Goal',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  ),
                  onClick: handleAddNew,
                  variant: 'primary',
                  disabled: isSubmitting
                }
              ]}
              size="sm"
              layout="horizontal"
            />
          }
        >
          <div></div>
        </CompactCard>

        {/* Goal Display */}
        {data.goals.length === 0 ? (
          <CompactCard variant="minimal">
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first financial goal.</p>
              <Button onClick={handleAddNew}>Add Your First Goal</Button>
            </div>
          </CompactCard>
        ) : (
          <GoalTable
            goals={data.goals}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            isLoading={isSubmitting}
          />
        )}

        {/* Edit/Add Goal Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedGoal(null);
          }}
          title={selectedGoal ? 'Edit Goal' : 'Add New Goal'}
          size="lg"
        >
          <GoalForm
            goal={selectedGoal || undefined}
            onSubmit={handleGoalSubmit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedGoal(null);
            }}
            isLoading={isSubmitting}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedGoal(null);
          }}
          title="Delete Goal"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete &quot;{selectedGoal?.name}&quot;? This action cannot be undone.
              {(selectedGoal?.investments?.length ?? 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  Note: This goal has {selectedGoal?.investments?.length ?? 0} linked investments. 
                  These investments will be updated to have no goal.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedGoal(null);
                }}
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

export default GoalList;