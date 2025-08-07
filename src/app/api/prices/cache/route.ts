import { NextRequest, NextResponse } from 'next/server'
import { getCacheStats, clearAllCaches, getEnhancedCacheStats } from '@/lib/price-fetcher'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const enhanced = searchParams.get('enhanced') === 'true'
    
    const stats = enhanced ? await getEnhancedCacheStats() : await getCacheStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Cache stats API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get cache statistics', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await clearAllCaches()
    return NextResponse.json({ message: 'All caches cleared successfully' })
  } catch (error) {
    console.error('Clear cache API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clear caches', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}