'use client';

import React, { useState } from 'react';
import { Goal } from '@/types';
import { calculateInflationAdjustedValue } from '@/lib/calculations';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import QuickActions from '../ui/QuickActions';
import { Toggle, Tooltip, InflationDisplay } from '../ui';

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
  const [enableInflationAdjustment, setEnableInflationAdjustment] = useState(false);
  const [inflationRate, setInflationRate] = useState(6);


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

        {/* Inflation Adjustment Section */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Inflation Adjustment</h3>
                <p className="text-xs text-gray-600">Account for inflation to see real purchasing power</p>
              </div>
              <Tooltip content="Inflation erodes the value of money over time. A goal of ₹10 lakhs today will need to be much higher in 10 years to have the same purchasing power. Enable this to see the real impact.">
                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </div>
            <Toggle
              checked={enableInflationAdjustment}
              onChange={setEnableInflationAdjustment}
              label=""
            />
          </div>

          {enableInflationAdjustment && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Expected Inflation Rate (%)"
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                />
                

              </div>

              {/* Inflation Impact Display */}
              {formData.targetAmount && formData.targetDate && (() => {
                const targetAmount = parseFloat(formData.targetAmount);
                const targetDate = new Date(formData.targetDate);
                const currentDate = new Date();
                const yearsToTarget = Math.max(0, (targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                
                if (targetAmount > 0 && yearsToTarget > 0) {
                  const futureValue = calculateInflationAdjustedValue(targetAmount, inflationRate, yearsToTarget);
                  
                  return (
                    <InflationDisplay
                      nominalValue={futureValue}
                      realValue={targetAmount}
                      inflationRate={inflationRate}
                      years={yearsToTarget}
                      onInflationRateChange={setInflationRate}
                      title="Inflation Impact"
                      nominalLabel="Required Future Value"
                      realLabel="Your Goal (Today's Value)"
                      variant="compact"
                      showToggle={false}
                      description="How inflation affects your goal over time"
                    />
                  );
                }
                return null;
              })()}
            </div>
          )}
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