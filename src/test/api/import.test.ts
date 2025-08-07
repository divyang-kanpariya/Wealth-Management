import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/investments/import/route';
import { POST as ConfirmPOST } from '@/app/api/investments/import/confirm/route';
import { GET as HistoryGET } from '@/app/api/investments/import/history/route';

// Mock the csv-import module
vi.mock('@/lib/csv-import', () => ({
  generateDemoCSV: vi.fn(() => 'type,name,symbol\nSTOCK,Test,TEST'),
  parseCSV: vi.fn(() => [{ type: 'STOCK', name: 'Test', symbol: 'TEST' }]),
  validateCSVData: vi.fn(() => Promise.resolve({
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    rows: [{
      row: 1,
      data: { type: 'STOCK', name: 'Test', symbol: 'TEST' },
      errors: [],
      isValid: true
    }],
    columnMapping: { type: 'type', name: 'name', symbol: 'symbol' }
  })),
  importInvestments: vi.fn(() => Promise.resolve({
    success: 1,
    failed: 0,
    errors: [],
    importId: 'test-import-id'
  })),
  getImportHistory: vi.fn(() => Promise.resolve([
    {
      id: 'test-import-id',
      filename: 'test.csv',
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
      status: 'COMPLETED',
      createdAt: new Date(),
      errors: []
    }
  ])),
  DEFAULT_COLUMN_MAPPINGS: [
    { csvColumn: 'type', investmentField: 'type', required: true, dataType: 'enum' },
    { csvColumn: 'name', investmentField: 'name', required: true, dataType: 'string' }
  ]
}));

describe('Import API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/investments/import', () => {
    it('should return demo CSV template', async () => {
      const response = await GET();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      
      const csvContent = await response.text();
      expect(csvContent).toContain('type,name,symbol');
    });
  });

  describe('POST /api/investments/import', () => {
    it('should process CSV file and return preview', async () => {
      const formData = new FormData();
      const csvFile = new File(['type,name,symbol\nSTOCK,Test,TEST'], 'test.csv', {
        type: 'text/csv'
      });
      formData.append('file', csvFile);

      const request = new NextRequest('http://localhost:3000/api/investments/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.preview).toBeDefined();
      expect(data.preview.totalRows).toBe(1);
      expect(data.preview.validRows).toBe(1);
      expect(data.availableColumns).toBeDefined();
      expect(data.defaultMappings).toBeDefined();
    });

    it('should return error for non-CSV file', async () => {
      const formData = new FormData();
      const textFile = new File(['not a csv'], 'test.txt', {
        type: 'text/plain'
      });
      formData.append('file', textFile);

      const request = new NextRequest('http://localhost:3000/api/investments/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('CSV');
    });

    it('should return error when no file is uploaded', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/investments/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('No file uploaded');
    });
  });

  describe('POST /api/investments/import/confirm', () => {
    it('should import valid rows successfully', async () => {
      const validRows = [{
        row: 1,
        data: { type: 'STOCK', name: 'Test', symbol: 'TEST' },
        errors: [],
        isValid: true
      }];

      const request = new NextRequest('http://localhost:3000/api/investments/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validRows,
          filename: 'test.csv'
        })
      });

      const response = await ConfirmPOST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(1);
      expect(data.failed).toBe(0);
      expect(data.importId).toBe('test-import-id');
    });

    it('should return error for empty valid rows', async () => {
      const request = new NextRequest('http://localhost:3000/api/investments/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validRows: [],
          filename: 'test.csv'
        })
      });

      const response = await ConfirmPOST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('No valid rows to import');
    });

    it('should return error for missing filename', async () => {
      const validRows = [{
        row: 1,
        data: { type: 'STOCK', name: 'Test', symbol: 'TEST' },
        errors: [],
        isValid: true
      }];

      const request = new NextRequest('http://localhost:3000/api/investments/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validRows
        })
      });

      const response = await ConfirmPOST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Filename is required');
    });
  });

  describe('GET /api/investments/import/history', () => {
    it('should return import history', async () => {
      const response = await HistoryGET();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('test-import-id');
      expect(data[0].filename).toBe('test.csv');
      expect(data[0].status).toBe('COMPLETED');
    });
  });
});