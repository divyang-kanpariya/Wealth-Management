import React, { useState } from 'react';
import { AccountType } from '@prisma/client';
import { Account } from '@/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import QuickActions from '../ui/QuickActions';

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'BROKER', label: 'Broker' },
  { value: 'DEMAT', label: 'Demat Account' },
  { value: 'BANK', label: 'Bank Account' },
  { value: 'OTHER', label: 'Other' },
];

const AccountForm: React.FC<AccountFormProps> = ({
  account,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    type: account?.type || 'BROKER' as AccountType,
    notes: account?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Account Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Zerodha, HDFC Securities, SBI Bank"
          error={errors.name}
          required
        />
        
        <Select
          label="Account Type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          options={ACCOUNT_TYPE_OPTIONS}
          required
        />
        
        <div className="w-full">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes about this account"
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <QuickActions
          actions={[
            {
              id: 'cancel-account',
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
              id: 'submit-account',
              label: isLoading ? (account ? 'Updating...' : 'Creating...') : (account ? 'Update Account' : 'Create Account'),
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

export default AccountForm;