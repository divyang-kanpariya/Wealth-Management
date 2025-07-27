'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ImportPreview, ImportResult, ColumnMapping } from '@/types';
import { ImportPreviewTable } from './ImportPreviewTable';
import { ColumnMappingForm } from './ColumnMappingForm';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [defaultMappings, setDefaultMappings] = useState<ColumnMapping[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/investments/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setPreview(data.preview);
      setAvailableColumns(data.availableColumns);
      setDefaultMappings(data.defaultMappings);
      setColumnMapping(data.preview.columnMapping);

      // If mapping looks good, go to preview, otherwise go to mapping
      const hasGoodMapping = Object.keys(data.preview.columnMapping).length > 0;
      setStep(hasGoodMapping ? 'preview' : 'mapping');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingComplete = async (mapping: Record<string, string>) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(mapping));

      const response = await fetch('/api/investments/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Mapping failed');
      }

      const data = await response.json();
      setPreview(data.preview);
      setColumnMapping(mapping);
      setStep('preview');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !file) return;

    setIsLoading(true);
    setError(null);
    setStep('importing');

    try {
      const validRows = preview.rows.filter(row => row.isValid);

      const response = await fetch('/api/investments/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validRows,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result: ImportResult = await response.json();
      setStep('complete');
      onImportComplete(result);

    } catch (error: any) {
      setError(error.message);
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/investments/import');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'investment_import_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setAvailableColumns([]);
    setDefaultMappings([]);
    setColumnMapping({});
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Investments">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with your investment data. You can download a template to see the expected format.
              </p>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="mb-4"
              >
                Download Template
              </Button>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isLoading}
                loading={isLoading}
              >
                Upload & Preview
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <ColumnMappingForm
            availableColumns={availableColumns}
            defaultMappings={defaultMappings}
            onComplete={handleMappingComplete}
            onBack={() => setStep('upload')}
            isLoading={isLoading}
          />
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-medium text-blue-900">Import Preview</h3>
              <p className="text-sm text-blue-700 mt-1">
                Found {preview.totalRows} rows: {preview.validRows} valid, {preview.invalidRows} invalid
              </p>
            </div>

            <ImportPreviewTable preview={preview} />

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Adjust Mapping
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview.validRows === 0 || isLoading}
                loading={isLoading}
              >
                Import {preview.validRows} Investments
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Importing investments...</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <h3 className="font-medium text-green-900">Import Complete!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your investments have been successfully imported.
              </p>
            </div>
            <Button onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}