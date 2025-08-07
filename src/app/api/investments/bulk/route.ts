import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BulkOperationResult } from '@/types';

export async function DELETE(request: NextRequest) {
  try {
    const { investmentIds } = await request.json();

    if (!Array.isArray(investmentIds) || investmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Investment IDs array is required' },
        { status: 400 }
      );
    }

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process deletions one by one to handle individual failures
    for (const investmentId of investmentIds) {
      try {
        await prisma.investment.delete({
          where: { id: investmentId }
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to delete investment ${investmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}