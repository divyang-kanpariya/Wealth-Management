# Vercel Migration Implementation Guide

## Required API Route Implementations

This document provides the exact code implementations needed to migrate background functions to Vercel-compatible API routes.

### 1. Price Refresh Cron API Route

**File:** `src/app/api/cron/price-refresh/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { backgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { getAllTrackedSymbols } from '@/lib/price-fetcher'

// Webhook authentication
const WEBHOOK_SECRET = process.env.EXTERNAL_SCHEDULER_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Authenticate webhook request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[CronPriceRefresh] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CronPriceRefresh] Starting scheduled price refresh...')
    const startTime = Date.now()

    // Get all tracked symbols
    const symbols = await getAllTrackedSymbols()
    
    if (symbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No symbols to refresh',
        duration: Date.now() - startTime
      })
    }

    // Perform batch refresh
    const result = await backgroundPriceRefreshService.batchRefreshPrices(symbols)
    const duration = Date.now() - startTime

    console.log(`[CronPriceRefresh] Completed: ${result.success} success, ${result.failed} failed, ${duration}ms`)

    return NextResponse.json({
      success: true,
      summary: {
        total: symbols.length,
        successful: result.success,
        failed: result.failed,
        duration
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CronPriceRefresh] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/price-refresh',
    description: 'Scheduled price refresh for all tracked symbols',
    method: 'POST',
    authentication: 'Bearer token required',
    schedule: 'Every hour (0 * * * *)'
  })
}
```

### 2. SIP Processing Cron API Route

**File:** `src/app/api/cron/sip-processing/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processSIPBatch } from '@/lib/sip-processor'

const WEBHOOK_SECRET = process.env.EXTERNAL_SCHEDULER_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Authenticate webhook request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[CronSIPProcessing] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CronSIPProcessing] Starting scheduled SIP processing...')
    const startTime = Date.now()

    // Process SIPs for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await processSIPBatch(today)
    const duration = Date.now() - startTime

    console.log(`[CronSIPProcessing] Completed: ${result.successful} success, ${result.failed} failed, ${duration}ms`)

    // Log failures for monitoring
    if (result.failed > 0) {
      const failedSIPs = result.results.filter(r => !r.success)
      console.warn(`[CronSIPProcessing] Failed SIPs:`, 
        failedSIPs.map(r => ({ sipId: r.sipId, error: r.error }))
      )
    }

    return NextResponse.json({
      success: true,
      summary: {
        date: today.toISOString().split('T')[0],
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        duration
      },
      failedSIPs: result.results.filter(r => !r.success).map(r => ({
        sipId: r.sipId,
        error: r.error
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CronSIPProcessing] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/sip-processing',
    description: 'Process SIP transactions scheduled for today',
    method: 'POST',
    authentication: 'Bearer token required',
    schedule: 'Daily at 9 AM (0 9 * * *)'
  })
}
```

### 3. SIP Retry Cron API Route

**File:** `src/app/api/cron/sip-retry/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { retryFailedSIPTransactions } from '@/lib/sip-processor'

const WEBHOOK_SECRET = process.env.EXTERNAL_SCHEDULER_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Authenticate webhook request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[CronSIPRetry] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CronSIPRetry] Starting SIP retry processing...')
    const startTime = Date.now()

    const result = await retryFailedSIPTransactions()
    const duration = Date.now() - startTime

    console.log(`[CronSIPRetry] Completed: ${result.successful} success, ${result.failed} failed, ${duration}ms`)

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        duration
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CronSIPRetry] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/sip-retry',
    description: 'Retry failed SIP transactions',
    method: 'POST',
    authentication: 'Bearer token required',
    schedule: 'Every 4 hours (0 */4 * * *)'
  })
}
```

### 4. SIP Cleanup Cron API Route

**File:** `src/app/api/cron/sip-cleanup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldFailedTransactions } from '@/lib/sip-processor'

const WEBHOOK_SECRET = process.env.EXTERNAL_SCHEDULER_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Authenticate webhook request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[CronSIPCleanup] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CronSIPCleanup] Starting SIP cleanup...')
    const startTime = Date.now()

    const deletedCount = await cleanupOldFailedTransactions()
    const duration = Date.now() - startTime

    console.log(`[CronSIPCleanup] Completed: ${deletedCount} old failed transactions removed, ${duration}ms`)

    return NextResponse.json({
      success: true,
      summary: {
        deletedCount,
        duration
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CronSIPCleanup] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/sip-cleanup',
    description: 'Clean up old failed SIP transactions',
    method: 'POST',
    authentication: 'Bearer token required',
    schedule: 'Weekly on Sunday at 2 AM (0 2 * * 0)'
  })
}
```

### 5. Health Check API Route

**File:** `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { backgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connectivity
    const dbCheck = await prisma.$queryRaw`SELECT 1 as test`
    
    // Get price refresh statistics
    const priceStats = await backgroundPriceRefreshService.getRefreshStatistics()
    
    // Check external API availability (sample check)
    const apiCheck = await fetch('https://www.nseindia.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    }).then(() => true).catch(() => false)

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        database: {
          status: 'healthy',
          connected: !!dbCheck
        },
        priceCache: {
          status: priceStats.totalCachedPrices > 0 ? 'healthy' : 'warning',
          totalCachedPrices: priceStats.totalCachedPrices,
          freshPrices: priceStats.freshPrices,
          stalePrices: priceStats.stalePrices,
          lastRefreshTime: priceStats.lastRefreshTime
        },
        externalAPI: {
          status: apiCheck ? 'healthy' : 'warning',
          reachable: apiCheck
        }
      }
    })

  } catch (error) {
    console.error('[HealthCheck] Error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

## Code Changes Required

### 1. Update Layout File

**File:** `src/app/layout.tsx`

```typescript
// REMOVE this block completely:
// if (typeof window === 'undefined') {
//   import('../lib/server/background-price-refresh').then(({ backgroundPriceRefresh }) => {
//     backgroundPriceRefresh.start()
//   })
// }
```

### 2. Update Environment Variables

**File:** `.env.example`

```bash
# Add these new variables
EXTERNAL_SCHEDULER_WEBHOOK_SECRET="your-secure-webhook-secret-here"

# Optional: Configure intervals (in milliseconds)
PRICE_REFRESH_INTERVAL="3600000"  # 1 hour
SIP_PROCESSING_INTERVAL="86400000"  # 24 hours
SIP_RETRY_INTERVAL="14400000"  # 4 hours
SIP_CLEANUP_INTERVAL="604800000"  # 7 days
```

### 3. Create Vercel Configuration (Optional)

**File:** `vercel.json` (if using Vercel Cron - Pro plan required)

```json
{
  "crons": [
    {
      "path": "/api/cron/price-refresh",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sip-processing",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/sip-retry",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/cron/sip-cleanup",
      "schedule": "0 2 * * 0"
    }
  ],
  "functions": {
    "src/app/api/cron/*/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## External Cron Service Setup

### Using cron-job.org (Free)

1. **Sign up** at https://cron-job.org
2. **Create jobs** with these settings:

**Price Refresh Job:**
- URL: `https://your-app.vercel.app/api/cron/price-refresh`
- Schedule: `0 * * * *` (every hour)
- Method: POST
- Headers: `Authorization: Bearer your-webhook-secret`

**SIP Processing Job:**
- URL: `https://your-app.vercel.app/api/cron/sip-processing`
- Schedule: `0 9 * * *` (daily at 9 AM)
- Method: POST
- Headers: `Authorization: Bearer your-webhook-secret`

**SIP Retry Job:**
- URL: `https://your-app.vercel.app/api/cron/sip-retry`
- Schedule: `0 */4 * * *` (every 4 hours)
- Method: POST
- Headers: `Authorization: Bearer your-webhook-secret`

**SIP Cleanup Job:**
- URL: `https://your-app.vercel.app/api/cron/sip-cleanup`
- Schedule: `0 2 * * 0` (Sunday at 2 AM)
- Method: POST
- Headers: `Authorization: Bearer your-webhook-secret`

### Using GitHub Actions (Free)

**File:** `.github/workflows/cron-jobs.yml`

```yaml
name: Scheduled Background Tasks

on:
  schedule:
    # Price refresh every hour
    - cron: '0 * * * *'
    # SIP processing daily at 9 AM UTC
    - cron: '0 9 * * *'
    # SIP retry every 4 hours
    - cron: '0 */4 * * *'
    # SIP cleanup weekly on Sunday at 2 AM UTC
    - cron: '0 2 * * 0'

jobs:
  price-refresh:
    if: github.event.schedule == '0 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Price Refresh
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/price-refresh \
            -H "Authorization: Bearer ${{ secrets.WEBHOOK_SECRET }}"

  sip-processing:
    if: github.event.schedule == '0 9 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SIP Processing
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/sip-processing \
            -H "Authorization: Bearer ${{ secrets.WEBHOOK_SECRET }}"

  sip-retry:
    if: github.event.schedule == '0 */4 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SIP Retry
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/sip-retry \
            -H "Authorization: Bearer ${{ secrets.WEBHOOK_SECRET }}"

  sip-cleanup:
    if: github.event.schedule == '0 2 * * 0'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SIP Cleanup
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/sip-cleanup \
            -H "Authorization: Bearer ${{ secrets.WEBHOOK_SECRET }}"
```

**Required GitHub Secrets:**
- `APP_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- `WEBHOOK_SECRET`: Your webhook authentication secret

## Testing the Migration

### 1. Local Testing

```bash
# Test each endpoint locally
curl -X POST http://localhost:3000/api/cron/price-refresh \
  -H "Authorization: Bearer your-test-secret"

curl -X POST http://localhost:3000/api/cron/sip-processing \
  -H "Authorization: Bearer your-test-secret"

curl -X POST http://localhost:3000/api/cron/sip-retry \
  -H "Authorization: Bearer your-test-secret"

curl -X POST http://localhost:3000/api/cron/sip-cleanup \
  -H "Authorization: Bearer your-test-secret"

# Test health check
curl http://localhost:3000/api/health
```

### 2. Production Testing

```bash
# Test on Vercel deployment
curl -X POST https://your-app.vercel.app/api/cron/price-refresh \
  -H "Authorization: Bearer your-production-secret"

# Check health
curl https://your-app.vercel.app/api/health
```

### 3. Monitoring

```bash
# Check Vercel logs
vercel logs --follow

# Monitor function execution times
vercel analytics
```

## Deployment Checklist

- [ ] Remove background service initialization from layout.tsx
- [ ] Create all 4 cron API routes
- [ ] Create health check API route
- [ ] Add webhook secret to environment variables
- [ ] Set up external cron service or GitHub Actions
- [ ] Test all endpoints locally
- [ ] Deploy to Vercel
- [ ] Test all endpoints in production
- [ ] Verify cron jobs are triggering correctly
- [ ] Set up monitoring and alerting
- [ ] Document the new architecture for team

This implementation provides a complete migration path from the current background services to a Vercel-compatible architecture.