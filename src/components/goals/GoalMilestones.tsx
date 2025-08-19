'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Goal } from '@/types';
import CompactCard from '../ui/CompactCard';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Alert from '../ui/Alert';

interface Milestone {
  id: string;
  percentage: number;
  amount: number;
  description: string;
  achieved: boolean;
  achievedDate?: Date;
}

interface GoalMilestonesProps {
  goal: Goal;
  currentAmount: number;
  className?: string;
}

const GoalMilestones: React.FC<GoalMilestonesProps> = ({
  goal,
  currentAmount,
  className = ''
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    percentage: '',
    description: ''
  });
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const initializeMilestones = useCallback(() => {
    // Create default milestones if none exist
    const defaultMilestones: Milestone[] = [
      { id: '1', percentage: 25, amount: goal.targetAmount * 0.25, description: '25% Complete', achieved: false },
      { id: '2', percentage: 50, amount: goal.targetAmount * 0.50, description: '50% Complete', achieved: false },
      { id: '3', percentage: 75, amount: goal.targetAmount * 0.75, description: '75% Complete', achieved: false },
      { id: '4', percentage: 100, amount: goal.targetAmount, description: 'Goal Achieved!', achieved: false }
    ];

    // Check which milestones are achieved
    const updatedMilestones = defaultMilestones.map(milestone => ({
      ...milestone,
      achieved: currentAmount >= milestone.amount,
      achievedDate: currentAmount >= milestone.amount ? new Date() : undefined
    }));

    setMilestones(updatedMilestones);
  }, [goal, currentAmount]);

  useEffect(() => {
    initializeMilestones();
  }, [initializeMilestones]);

  const addCustomMilestone = () => {
    if (!newMilestone.percentage || !newMilestone.description) return;

    const percentage = parseFloat(newMilestone.percentage);
    if (percentage <= 0 || percentage > 100) {
      setStatusMessage({
        type: 'error',
        text: 'Percentage must be between 1 and 100'
      });
      return;
    }

    const amount = goal.targetAmount * (percentage / 100);
    const milestone: Milestone = {
      id: Date.now().toString(),
      percentage,
      amount,
      description: newMilestone.description,
      achieved: currentAmount >= amount,
      achievedDate: currentAmount >= amount ? new Date() : undefined
    };

    const updatedMilestones = [...milestones, milestone].sort((a, b) => a.percentage - b.percentage);
    setMilestones(updatedMilestones);
    
    setNewMilestone({ percentage: '', description: '' });
    setShowAddModal(false);
    
    setStatusMessage({
      type: 'success',
      text: 'Milestone added successfully'
    });
  };

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getNextMilestone = () => {
    return milestones.find(m => !m.achieved);
  };

  const getProgressToNextMilestone = () => {
    const nextMilestone = getNextMilestone();
    if (!nextMilestone) return 100;

    const previousMilestone = milestones
      .filter(m => m.percentage < nextMilestone.percentage && m.achieved)
      .sort((a, b) => b.percentage - a.percentage)[0];

    const startAmount = previousMilestone ? previousMilestone.amount : 0;
    const targetAmount = nextMilestone.amount;
    const currentProgress = Math.max(0, currentAmount - startAmount);
    const totalNeeded = targetAmount - startAmount;

    return totalNeeded > 0 ? Math.min((currentProgress / totalNeeded) * 100, 100) : 0;
  };

  const achievedCount = milestones.filter(m => m.achieved).length;
  const nextMilestone = getNextMilestone();
  const progressToNext = getProgressToNextMilestone();

  return (
    <div className={className}>
      <CompactCard 
        title="Milestones"
        badge={`${achievedCount}/${milestones.length} Achieved`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            Add Milestone
          </Button>
        }
      >
        {/* Next Milestone Progress */}
        {nextMilestone && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-900">Next Milestone</h4>
              <span className="text-sm text-blue-600">{progressToNext.toFixed(1)}%</span>
            </div>
            <div className="mb-2">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm text-blue-700">
              <span>{nextMilestone.description}</span>
              <span>{formatCurrency(nextMilestone.amount)}</span>
            </div>
          </div>
        )}

        {/* Milestones List */}
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                milestone.achieved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  milestone.achieved 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {milestone.achieved ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{milestone.percentage}%</span>
                  )}
                </div>
                
                <div>
                  <div className={`font-medium ${
                    milestone.achieved ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {milestone.description}
                  </div>
                  <div className={`text-sm ${
                    milestone.achieved ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {formatCurrency(milestone.amount)}
                    {milestone.achieved && milestone.achievedDate && (
                      <span className="ml-2">• Achieved {formatDate(milestone.achievedDate)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Remove button for custom milestones */}
              {!['25% Complete', '50% Complete', '75% Complete', 'Goal Achieved!'].includes(milestone.description) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeMilestone(milestone.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {achievedCount === milestones.length && (
          <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Congratulations! 🎉
                </h3>
                <div className="mt-1 text-sm text-green-700">
                  You&apos;ve achieved all milestones for this goal!
                </div>
              </div>
            </div>
          </div>
        )}
      </CompactCard>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Custom Milestone"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Percentage of Goal
            </label>
            <Input
              type="number"
              placeholder="e.g., 30"
              value={newMilestone.percentage}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, percentage: e.target.value }))}
              min="1"
              max="100"
            />
            {newMilestone.percentage && (
              <div className="mt-1 text-sm text-gray-600">
                Target Amount: {formatCurrency(goal.targetAmount * (parseFloat(newMilestone.percentage) / 100))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              placeholder="e.g., Emergency fund milestone"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={addCustomMilestone}
              disabled={!newMilestone.percentage || !newMilestone.description}
            >
              Add Milestone
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

export default GoalMilestones;