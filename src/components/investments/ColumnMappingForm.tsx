'use client';

import { useState } from 'react';
import { 
  Button, 
  Select, 
  QuickActions, 
  Alert 
} from '@/components/ui';
import { ColumnMapping } from '@/types';

interface ColumnMappingFormProps {
  availableColumns: string[];
  defaultMappings: ColumnMapping[];
  onComplete: (mapping: Record<string, string>) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function ColumnMappingForm({ 
  availableColumns, 
  defaultMappings, 
  onComplete, 
  onBack, 
  isLoading 
}: ColumnMappingFormProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    // Initialize with auto-detected mappings
    const initialMapping: Record<string, string> = {};
    defaultMappings.forEach(defaultMapping => {
      const matchingColumn = availableColumns.find(col => 
        col.toLowerCase().includes(defaultMapping.csvColumn.toLowerCase()) ||
        defaultMapping.csvColumn.toLowerCase().includes(col.toLowerCase())
      );
      if (matchingColumn) {
        initialMapping[matchingColumn] = defaultMapping.investmentField;
      }
    });
    return initialMapping;
  });

  const handleMappingChange = (csvColumn: string, investmentField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: investmentField
    }));
  };

  const handleSubmit = () => {
    onComplete(mapping);
  };

  const getRequiredFields = () => {
    return defaultMappings.filter(m => m.required).map(m => m.investmentField);
  };

  const getMappedFields = () => {
    return Object.values(mapping);
  };

  const getMissingRequiredFields = () => {
    const required = getRequiredFields();
    const mapped = getMappedFields();
    return required.filter(field => !mapped.includes(field));
  };

  const canProceed = getMissingRequiredFields().length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Map CSV Columns</h3>
        <p className="text-sm text-gray-600">
          Map your CSV columns to the corresponding investment fields. Required fields are marked with *.
        </p>
      </div>

      <div className="space-y-4">
        {availableColumns.map(csvColumn => (
          <div key={csvColumn} className="flex items-center space-x-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700">
                {csvColumn}
              </label>
            </div>
            <div className="w-2/3">
              <Select
                value={mapping[csvColumn] || ''}
                onChange={(e) => handleMappingChange(csvColumn, e.target.value)}
                className="w-full"
                placeholder="-- Select Field --"
                options={defaultMappings.map(defaultMapping => ({
                  value: defaultMapping.investmentField,
                  label: `${defaultMapping.investmentField}${defaultMapping.required ? ' *' : ''}`
                }))}
              />
            </div>
          </div>
        ))}
      </div>

      {!canProceed && (
        <Alert
          type="error"
          title="Missing Required Fields"
          message={
            <div>
              <p>The following required fields are not mapped:</p>
              <ul className="list-disc list-inside mt-2">
                {getMissingRequiredFields().map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          }
        />
      )}

      <div className="bg-gray-50 rounded-md p-4">
        <h4 className="font-medium text-gray-900 mb-2">Field Descriptions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>type*:</strong> Investment type (STOCK, MUTUAL_FUND, etc.)
          </div>
          <div>
            <strong>name*:</strong> Investment name
          </div>
          <div>
            <strong>symbol:</strong> Stock/fund symbol (optional)
          </div>
          <div>
            <strong>units:</strong> Number of units (for stocks/funds)
          </div>
          <div>
            <strong>buyPrice:</strong> Price per unit
          </div>
          <div>
            <strong>totalValue:</strong> Total investment value
          </div>
          <div>
            <strong>buyDate*:</strong> Purchase date
          </div>
          <div>
            <strong>goalName:</strong> Goal name (optional)
          </div>
          <div>
            <strong>accountName*:</strong> Account name
          </div>
          <div>
            <strong>notes:</strong> Additional notes (optional)
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <QuickActions
          actions={[
            {
              id: 'back-to-upload',
              label: 'Back',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              ),
              onClick: onBack,
              variant: 'secondary'
            },
            {
              id: 'preview-import',
              label: 'Preview Import',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
              onClick: handleSubmit,
              disabled: !canProceed || isLoading,
              variant: 'primary'
            }
          ]}
          size="md"
          layout="horizontal"
        />
      </div>
    </div>
  );
}