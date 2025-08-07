import { NextRequest, NextResponse } from 'next/server';
import { 
  parseCSV, 
  validateCSVData, 
  importInvestments, 
  generateDemoCSV,
  DEFAULT_COLUMN_MAPPINGS 
} from '@/lib/csv-import';

// GET - Generate demo CSV template
export async function GET() {
  try {
    const csvContent = generateDemoCSV();
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="investment_import_template.csv"'
      }
    });
  } catch (error) {
    console.error('Error generating demo CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo CSV' },
      { status: 500 }
    );
  }
}

// POST - Upload and preview CSV data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const columnMappingJson = formData.get('columnMapping') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const csvRows = parseCSV(csvContent);

    // Use provided column mapping or default
    let columnMapping: Record<string, string> = {};
    if (columnMappingJson) {
      try {
        columnMapping = JSON.parse(columnMappingJson);
      } catch {
        return NextResponse.json(
          { error: 'Invalid column mapping JSON' },
          { status: 400 }
        );
      }
    } else {
      // Auto-detect column mapping based on headers
      const headers = Object.keys(csvRows[0] || {});
      const mappings = DEFAULT_COLUMN_MAPPINGS.reduce((acc, mapping) => {
        const matchingHeader = headers.find(header => 
          header.toLowerCase().includes(mapping.csvColumn.toLowerCase()) ||
          mapping.csvColumn.toLowerCase().includes(header.toLowerCase())
        );
        if (matchingHeader) {
          acc[matchingHeader] = mapping.investmentField;
        }
        return acc;
      }, {} as Record<string, string>);
      columnMapping = mappings;
    }

    const preview = await validateCSVData(csvRows, columnMapping);

    return NextResponse.json({
      preview,
      availableColumns: Object.keys(csvRows[0] || {}),
      defaultMappings: DEFAULT_COLUMN_MAPPINGS
    });

  } catch (error: any) {
    console.error('CSV preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}