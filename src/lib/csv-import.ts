import { InvestmentType } from '@prisma/client';
import { prisma } from './prisma';
import { validateCsvImportRow } from './validations';
import { 
  ImportPreview, 
  ImportPreviewRow, 
  ImportValidationError, 
  ImportResult,
  ColumnMapping 
} from '@/types';

// Default column mappings for CSV import
export const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  { csvColumn: 'type', investmentField: 'type', required: true, dataType: 'enum', enumValues: Object.values(InvestmentType) },
  { csvColumn: 'name', investmentField: 'name', required: true, dataType: 'string' },
  { csvColumn: 'symbol', investmentField: 'symbol', required: false, dataType: 'string' },
  { csvColumn: 'units', investmentField: 'units', required: false, dataType: 'number' },
  { csvColumn: 'buyPrice', investmentField: 'buyPrice', required: false, dataType: 'number' },
  { csvColumn: 'totalValue', investmentField: 'totalValue', required: false, dataType: 'number' },
  { csvColumn: 'buyDate', investmentField: 'buyDate', required: true, dataType: 'date' },
  { csvColumn: 'goalName', investmentField: 'goalName', required: false, dataType: 'string' },
  { csvColumn: 'accountName', investmentField: 'accountName', required: true, dataType: 'string' },
  { csvColumn: 'notes', investmentField: 'notes', required: false, dataType: 'string' },
];

// Generate demo CSV template
export function generateDemoCSV(): string {
  const headers = DEFAULT_COLUMN_MAPPINGS.map(mapping => mapping.csvColumn);
  const sampleRows = [
    [
      'STOCK',
      'Reliance Industries Ltd',
      'RELIANCE',
      '10',
      '2500.50',
      '', // totalValue empty for unit-based
      '2024-01-15',
      'Long Term Growth',
      'Zerodha',
      'Blue chip stock investment'
    ],
    [
      'MUTUAL_FUND',
      'SBI Bluechip Fund',
      'SBI_BLUECHIP',
      '100',
      '85.25',
      '', // totalValue empty for unit-based
      '2024-02-01',
      'Retirement Fund',
      'SBI Bank',
      'Monthly SIP investment'
    ],
    [
      'REAL_ESTATE',
      'Apartment in Mumbai',
      '', // symbol empty for real estate
      '', // units empty for total-value based
      '', // buyPrice empty for total-value based
      '5000000', // totalValue for real estate
      '2023-12-01',
      'Real Estate Portfolio',
      'HDFC Bank',
      'Primary residence investment'
    ],
    [
      'GOLD',
      'Gold ETF',
      'GOLDBEES',
      '50',
      '4500',
      '', // totalValue empty for unit-based
      '2024-01-20',
      'Hedge Fund',
      'ICICI Direct',
      'Gold hedge against inflation'
    ]
  ];

  // Create properly formatted CSV with consistent structure
  const csvContent = [
    headers.join(','),
    ...sampleRows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = cell.replace(/"/g, '""');
        return cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${escaped}"` 
          : cell;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

// Parse CSV content
export function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split(/\r?\n/); // Handle both \n and \r\n line endings
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]).map(header => header.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns but expected ${headers.length}. Row content: "${line}"`);
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

// Validate and preview CSV data
export async function validateCSVData(
  csvRows: Record<string, string>[],
  columnMapping: Record<string, string>
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    totalRows: csvRows.length,
    validRows: 0,
    invalidRows: 0,
    rows: [],
    columnMapping
  };

  // Get existing accounts and goals for validation
  const [accounts, goals] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true } }),
    prisma.goal.findMany({ select: { id: true, name: true } })
  ]);

  // Create normalized maps for case-insensitive and whitespace-tolerant matching
  const accountMap = new Map();
  const goalMap = new Map();
  
  accounts.forEach(acc => {
    const normalizedName = acc.name.toLowerCase().trim().replace(/\s+/g, ' ');
    accountMap.set(normalizedName, acc.id);
  });
  
  goals.forEach(goal => {
    const normalizedName = goal.name.toLowerCase().trim().replace(/\s+/g, ' ');
    goalMap.set(normalizedName, goal.id);
  });

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const previewRow: ImportPreviewRow = {
      row: i + 1,
      data: {},
      errors: [],
      isValid: true
    };

    try {
      // Map CSV columns to investment fields
      const mappedData: Record<string, any> = {};
      for (const [csvCol, investmentField] of Object.entries(columnMapping)) {
        if (row[csvCol] !== undefined) {
          mappedData[investmentField] = row[csvCol];
        }
      }

      // Validate the mapped data
      const validatedData = validateCsvImportRow(mappedData);
      
      // Resolve account and goal IDs with normalized matching
      const normalizedAccountName = mappedData.accountName?.toLowerCase().trim().replace(/\s+/g, ' ');
      const accountId = accountMap.get(normalizedAccountName);
      if (!accountId) {
        // Create a helpful error message showing available accounts
        const availableAccounts = Array.from(accountMap.keys()).join(', ');
        previewRow.errors.push({
          row: i + 1,
          field: 'accountName',
          message: `Account '${mappedData.accountName}' not found. Available accounts: ${availableAccounts}`,
          value: mappedData.accountName
        });
        previewRow.isValid = false;
      }

      let goalId = null;
      if (mappedData.goalName && mappedData.goalName.trim()) {
        const normalizedGoalName = mappedData.goalName.toLowerCase().trim().replace(/\s+/g, ' ');
        goalId = goalMap.get(normalizedGoalName);
        if (!goalId) {
          // Create a helpful error message showing available goals
          const availableGoals = Array.from(goalMap.keys()).join(', ');
          previewRow.errors.push({
            row: i + 1,
            field: 'goalName',
            message: `Goal '${mappedData.goalName}' not found. Available goals: ${availableGoals}`,
            value: mappedData.goalName
          });
          previewRow.isValid = false;
        }
      }

      // Build the investment data
      previewRow.data = {
        type: validatedData.type as InvestmentType,
        name: validatedData.name,
        symbol: validatedData.symbol,
        units: validatedData.units,
        buyPrice: validatedData.buyPrice,
        totalValue: validatedData.totalValue,
        buyDate: validatedData.buyDate,
        goalId: goalId || undefined,
        accountId: accountId || '',
        notes: validatedData.notes
      };

    } catch (error: any) {
      previewRow.isValid = false;
      if (error.errors) {
        // Zod validation errors
        error.errors.forEach((err: any) => {
          previewRow.errors.push({
            row: i + 1,
            field: err.path.join('.'),
            message: err.message,
            value: err.input
          });
        });
      } else {
        previewRow.errors.push({
          row: i + 1,
          field: 'general',
          message: error.message || 'Validation failed',
        });
      }
    }

    preview.rows.push(previewRow);
    if (previewRow.isValid) {
      preview.validRows++;
    } else {
      preview.invalidRows++;
    }
  }

  return preview;
}

// Import validated data
export async function importInvestments(
  validRows: ImportPreviewRow[],
  filename: string
): Promise<ImportResult> {
  const importId = `import_${Date.now()}`;
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    importId
  };

  const importHistory = await prisma.importHistory.create({
    data: {
      id: importId,
      filename,
      totalRows: validRows.length,
      successRows: 0,
      failedRows: 0,
      status: 'COMPLETED',
      errors: []
    }
  });

  // Process each valid row
  for (const row of validRows) {
    try {
      if (!row.isValid || !row.data.accountId) {
        result.failed++;
        result.errors.push(...row.errors);
        continue;
      }

      await prisma.investment.create({
        data: {
          type: row.data.type!,
          name: row.data.name!,
          symbol: row.data.symbol,
          units: row.data.units,
          buyPrice: row.data.buyPrice,
          totalValue: row.data.totalValue,
          buyDate: row.data.buyDate!,
          goalId: row.data.goalId,
          accountId: row.data.accountId,
          notes: row.data.notes
        }
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        row: row.row,
        field: 'general',
        message: `Failed to create investment: ${error.message}`,
      });
    }
  }

  // Update import history
  await prisma.importHistory.update({
    where: { id: importId },
    data: {
      successRows: result.success,
      failedRows: result.failed,
      status: result.failed > 0 ? (result.success > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
      errors: JSON.stringify(result.errors)
    }
  });

  return result;
}

// Get import history
export async function getImportHistory() {
  return await prisma.importHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

// Rollback import (delete investments created in a specific import)
export async function rollbackImport(importId: string): Promise<{ deletedCount: number }> {
  // Note: This is a simplified rollback. In a production system, you'd want to track
  // which specific investments were created in each import for precise rollback.
  
  const importRecord = await prisma.importHistory.findUnique({
    where: { id: importId }
  });

  if (!importRecord) {
    throw new Error('Import record not found');
  }

  // For now, we'll mark the import as rolled back
  // In a full implementation, you'd track individual investment IDs per import
  await prisma.importHistory.update({
    where: { id: importId },
    data: {
      status: 'FAILED' // Using existing status values
    }
  });

  return { deletedCount: 0 }; // Placeholder - implement full rollback logic as needed
}