import { NextRequest, NextResponse } from 'next/server';
import { importInvestments } from '@/lib/csv-import';
import { ImportPreviewRow } from '@/types';

// POST - Confirm and execute import
export async function POST(request: NextRequest) {
  try {
    const { validRows, filename } = await request.json();

    if (!Array.isArray(validRows) || validRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows to import' },
        { status: 400 }
      );
    }

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate that all rows are marked as valid
    const invalidRows = validRows.filter((row: ImportPreviewRow) => !row.isValid);
    if (invalidRows.length > 0) {
      return NextResponse.json(
        { error: `Cannot import ${invalidRows.length} invalid rows` },
        { status: 400 }
      );
    }

    const result = await importInvestments(validRows, filename);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Import confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import investments' },
      { status: 500 }
    );
  }
}