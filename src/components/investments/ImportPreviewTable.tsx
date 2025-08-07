'use client';

import { ImportPreview, ImportPreviewRow } from '@/types';
import { InvestmentType } from '@prisma/client';

interface ImportPreviewTableProps {
  preview: ImportPreview;
}

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return '';
    
    if (field === 'buyDate' && value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    if (field === 'type') {
      return value.replace('_', ' ');
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return String(value);
  };

  const getRowClassName = (row: ImportPreviewRow): string => {
    return row.isValid 
      ? 'bg-green-50 border-green-200' 
      : 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Units
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Buy Price
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Buy Date
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Errors
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {preview.rows.map((row) => (
              <tr key={row.row} className={`border ${getRowClassName(row)}`}>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {row.row}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  {row.isValid ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Invalid
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.type, 'type')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.name, 'name')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.symbol, 'symbol')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.units, 'units')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.buyPrice, 'buyPrice')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.totalValue, 'totalValue')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.data.buyDate, 'buyDate')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  {row.data.accountId ? 'Found' : 'Not Found'}
                </td>
                <td className="px-3 py-2 text-sm text-red-600">
                  {row.errors.length > 0 && (
                    <div className="space-y-1">
                      {row.errors.map((error, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-medium">{error.field}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview.invalidRows > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 className="font-medium text-yellow-900">Validation Issues</h4>
          <p className="text-sm text-yellow-700 mt-1">
            {preview.invalidRows} rows have validation errors and will be skipped during import.
            Please review the errors above and fix them in your CSV file if needed.
          </p>
        </div>
      )}
    </div>
  );
}