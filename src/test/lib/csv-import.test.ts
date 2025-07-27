import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateDemoCSV, 
  parseCSV, 
  validateCSVData,
  DEFAULT_COLUMN_MAPPINGS 
} from '@/lib/csv-import';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
    },
    importHistory: {
      create: vi.fn(),
      update: vi.fn(),
    },
    investment: {
      create: vi.fn(),
    },
  },
}));

describe('CSV Import Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDemoCSV', () => {
    it('should generate a valid CSV template', () => {
      const csv = generateDemoCSV();
      
      expect(csv).toContain('type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes');
      expect(csv).toContain('STOCK');
      expect(csv).toContain('MUTUAL_FUND');
      expect(csv).toContain('REAL_ESTATE');
      expect(csv).toContain('GOLD');
    });

    it('should include all required columns', () => {
      const csv = generateDemoCSV();
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      
      const requiredColumns = DEFAULT_COLUMN_MAPPINGS
        .filter(mapping => mapping.required)
        .map(mapping => mapping.csvColumn);
      
      requiredColumns.forEach(column => {
        expect(headers).toContain(column);
      });
    });
  });

  describe('parseCSV', () => {
    it('should parse a simple CSV correctly', () => {
      const csvContent = `type,name,symbol
STOCK,"Reliance Industries",RELIANCE
MUTUAL_FUND,"SBI Bluechip Fund",SBI_BLUECHIP`;

      const result = parseCSV(csvContent);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'STOCK',
        name: 'Reliance Industries',
        symbol: 'RELIANCE'
      });
      expect(result[1]).toEqual({
        type: 'MUTUAL_FUND',
        name: 'SBI Bluechip Fund',
        symbol: 'SBI_BLUECHIP'
      });
    });

    it('should handle quoted values with commas', () => {
      const csvContent = `name,notes
"Test Investment","This is a note, with comma"`;

      const result = parseCSV(csvContent);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Test Investment',
        notes: 'This is a note, with comma'
      });
    });

    it('should handle empty values', () => {
      const csvContent = `type,name,symbol
STOCK,"Reliance Industries",
MUTUAL_FUND,"SBI Bluechip Fund",SBI_BLUECHIP`;

      const result = parseCSV(csvContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('');
      expect(result[1].symbol).toBe('SBI_BLUECHIP');
    });

    it('should throw error for invalid CSV', () => {
      const csvContent = `type,name
STOCK`;

      expect(() => parseCSV(csvContent)).toThrow();
    });
  });

  describe('validateCSVData', () => {
    beforeEach(() => {
      // Mock Prisma responses
      (prisma.account.findMany as any).mockResolvedValue([
        { id: 'acc1', name: 'Zerodha' },
        { id: 'acc2', name: 'SBI Bank' }
      ]);
      
      (prisma.goal.findMany as any).mockResolvedValue([
        { id: 'goal1', name: 'Long Term Growth' },
        { id: 'goal2', name: 'Retirement Fund' }
      ]);
    });

    it('should validate correct stock investment data', async () => {
      const csvRows = [{
        type: 'STOCK',
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        units: '10',
        buyPrice: '2500.50',
        totalValue: '',
        buyDate: '2024-01-15',
        goalName: 'Long Term Growth',
        accountName: 'Zerodha',
        notes: 'Blue chip stock'
      }];

      const columnMapping = {
        type: 'type',
        name: 'name',
        symbol: 'symbol',
        units: 'units',
        buyPrice: 'buyPrice',
        totalValue: 'totalValue',
        buyDate: 'buyDate',
        goalName: 'goalName',
        accountName: 'accountName',
        notes: 'notes'
      };

      const result = await validateCSVData(csvRows, columnMapping);

      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
      expect(result.rows[0].isValid).toBe(true);
      expect(result.rows[0].data.type).toBe('STOCK');
      expect(result.rows[0].data.units).toBe(10);
      expect(result.rows[0].data.buyPrice).toBe(2500.50);
    });

    it('should validate correct real estate investment data', async () => {
      const csvRows = [{
        type: 'REAL_ESTATE',
        name: 'Apartment in Mumbai',
        symbol: '',
        units: '',
        buyPrice: '',
        totalValue: '5000000',
        buyDate: '2023-12-01',
        goalName: '',
        accountName: 'SBI Bank',
        notes: 'Primary residence'
      }];

      const columnMapping = {
        type: 'type',
        name: 'name',
        symbol: 'symbol',
        units: 'units',
        buyPrice: 'buyPrice',
        totalValue: 'totalValue',
        buyDate: 'buyDate',
        goalName: 'goalName',
        accountName: 'accountName',
        notes: 'notes'
      };

      const result = await validateCSVData(csvRows, columnMapping);

      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
      expect(result.rows[0].isValid).toBe(true);
      expect(result.rows[0].data.type).toBe('REAL_ESTATE');
      expect(result.rows[0].data.totalValue).toBe(5000000);
    });

    it('should detect validation errors', async () => {
      const csvRows = [{
        type: 'INVALID_TYPE',
        name: '',
        symbol: 'RELIANCE',
        units: 'invalid_number',
        buyPrice: '2500.50',
        totalValue: '',
        buyDate: 'invalid_date',
        goalName: 'Non-existent Goal',
        accountName: 'Non-existent Account',
        notes: ''
      }];

      const columnMapping = {
        type: 'type',
        name: 'name',
        symbol: 'symbol',
        units: 'units',
        buyPrice: 'buyPrice',
        totalValue: 'totalValue',
        buyDate: 'buyDate',
        goalName: 'goalName',
        accountName: 'accountName',
        notes: 'notes'
      };

      const result = await validateCSVData(csvRows, columnMapping);

      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(0);
      expect(result.invalidRows).toBe(1);
      expect(result.rows[0].isValid).toBe(false);
      expect(result.rows[0].errors.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields for unit-based investments', async () => {
      const csvRows = [{
        type: 'STOCK',
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        units: '', // Missing required field
        buyPrice: '', // Missing required field
        totalValue: '',
        buyDate: '2024-01-15',
        goalName: '',
        accountName: 'Zerodha',
        notes: ''
      }];

      const columnMapping = {
        type: 'type',
        name: 'name',
        symbol: 'symbol',
        units: 'units',
        buyPrice: 'buyPrice',
        totalValue: 'totalValue',
        buyDate: 'buyDate',
        goalName: 'goalName',
        accountName: 'accountName',
        notes: 'notes'
      };

      const result = await validateCSVData(csvRows, columnMapping);

      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(0);
      expect(result.invalidRows).toBe(1);
      expect(result.rows[0].isValid).toBe(false);
    });
  });
});