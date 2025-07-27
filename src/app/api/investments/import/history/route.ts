import { NextRequest, NextResponse } from 'next/server';
import { getImportHistory, rollbackImport } from '@/lib/csv-import';

// GET - Get import history
export async function GET() {
  try {
    const history = await getImportHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}

// DELETE - Rollback import
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');

    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required' },
        { status: 400 }
      );
    }

    const result = await rollbackImport(importId);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error rolling back import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback import' },
      { status: 500 }
    );
  }
}