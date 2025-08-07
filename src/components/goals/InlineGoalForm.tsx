import React, { useState } from 'react';
import { Goal } from '@/types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { goalSchema } from '@/lib/validations';
import { z } from 'zod';

interface InlineGoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: (goal: Goal) => void;
  isLoading?: boolean;
}

interface GoalFormData {
  name: string;
  targetAmount: string;
  targetDate: string;
  priority: string;
  description: string;
}

const InlineGoalForm: React.FC<InlineGoalFormProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    targetDate: '',
    priority: '1',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      targetDate: '',
      priority: '1',
      description: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    try {
      const dataToValidate = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: new Date(formData.targetDate),
        priority: parseInt(formData.priority, 10),
        description: formData.description || undefined,
      };

      goalSchema.parse(dataToValidate);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleChange = (field: keyof GoalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const goalData = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        priority: parseInt(formData.priority, 10),
        description: formData.description || undefined,
      };

      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }

      const newGoal = await response.json();
      onGoalCreated(newGoal.data);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating goal:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create goal' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Goal"
      size="md"
      variant="compact"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Goal Name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Retirement, House Down Payment"
          error={errors.name}
          required
          autoFocus
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Target Amount (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formData.targetAmount}
            onChange={(e) => handleChange('targetAmount', e.target.value)}
            placeholder="e.g., 1000000"
            error={errors.targetAmount}
            required
          />
          
          <Input
            label="Target Date"
            type="date"
            value={formData.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value)}
            error={errors.targetDate}
            required
          />
        </div>
        
        <Input
          label="Priority (1-5)"
          type="number"
          min={1}
          max={5}
          value={formData.priority}
          onChange={(e) => handleChange('priority', e.target.value)}
          helperText="1 is highest priority, 5 is lowest"
        />
        
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Add details about your financial goal"
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {errors.submit && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {errors.submit}
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Goal'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default InlineGoalForm;