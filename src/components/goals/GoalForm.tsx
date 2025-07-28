'use client';

import React, { useState } from 'react';
import { Goal } from '@/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import QuickActions from '../ui/QuickActions';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const GoalForm: React.FC<GoalFormProps> = ({
  goal,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    targetAmount: goal?.targetAmount?.toString() || '',
    targetDate: goal?.targetDate 
      ? new Date(goal.targetDate).toISOString().split('T')[0] 
      : '',
    priority: goal?.priority?.toString() || '1',
    description: goal?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }
    
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Target amount must be a positive number';
    }
    
    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit({
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        priority: parseInt(formData.priority, 10),
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Goal Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Retirement, House Down Payment"
          error={errors.name}
          required
        />
        
        <Input
          label="Target Amount"
          name="targetAmount"
          type="number"
          value={formData.targetAmount}
          onChange={handleChange}
          placeholder="e.g., 1000000"
          error={errors.targetAmount}
          required
        />
        
        <Input
          label="Target Date"
          name="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={handleChange}
          error={errors.targetDate}
          required
        />
        
        <Input
          label="Priority (1-5)"
          name="priority"
          type="number"
          min={1}
          max={5}
          value={formData.priority}
          onChange={handleChange}
          placeholder="1 (Highest) to 5 (Lowest)"
          helperText="1 is highest priority, 5 is lowest"
        />
        
        <div className="w-full">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add details about your financial goal"
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <QuickActions
          actions={[
            {
              id: 'cancel-goal',
              label: 'Cancel',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ),
              onClick: onCancel,
              disabled: isLoading,
              variant: 'secondary'
            },
            {
              id: 'submit-goal',
              label: isLoading ? (goal ? 'Updating...' : 'Creating...') : (goal ? 'Update Goal' : 'Create Goal'),
              icon: isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ),
              onClick: () => {
                const form = document.querySelector('form');
                if (form) {
                  const event = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(event);
                }
              },
              disabled: isLoading,
              variant: 'primary'
            }
          ]}
          size="md"
          layout="horizontal"
        />
      </div>
    </form>
  );
};

export default GoalForm;