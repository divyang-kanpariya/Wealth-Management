'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { ImportHistory } from '@/types';

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportHistoryModal({ isOpen, onClose }: ImportHistoryModalProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/investments/import/history');
      if (!response.ok) {
        throw new Error('Failed to fetch import history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (importId: string) => {
    if (!confirm('Are you sure you want to rollback this import? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/investments/import/history?importId=${importId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to rollback import');
      }

      // Refresh history
      fetchHistory();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'PARTIAL':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import History">
      <div className="space-y-4">
        {error && (
          <ErrorState
            title="Failed to load import history"
            message={error}
            onRetry={fetchHistory}
          />
        )}

        {isLoading ? (
          <LoadingState message="Loading import history..." className="py-8" />
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No import history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(item.status)}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>Total: {item.totalRows}</div>
                        <div>Success: {item.successRows}</div>
                        <div>Failed: {item.failedRows}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Rollback
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}