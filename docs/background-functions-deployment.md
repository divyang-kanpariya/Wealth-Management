# Background Functions and Deployment Guide

## Overview

This document provides comprehensive information about all background functions, scheduled tasks, and deployment considerations for the Personal Wealth Management application, with specific focus on Vercel deployment where traditional cron jobs don't run.

## Background Functions Inventory

### 1. Background Price Refresh Service

**Location:** `src/lib/background-price-refresh-service.ts`

**Purpose:** Automatically refreshes pricing data for all tracked investments and SIPs every hour to ensure users have up-to-date portfolio values without waiting for slow external API calls.

**Why Implemented:** 
- External APIs (Google Script API, AMFI) are slow and have rate limits
- Users need fast portfolio loading without API delays
- Reduces API calls during user interactions

**Current Implementation:**
- Uses `setInterval()` to run every 60 minutes
- Processes symbols in batches to respect API rate limits
- Stores results in database `PriceCache` table
- Includes retry logic and error handling

**Vercel Compatibility:** ❌ **INCOMPATIBLE**
- `setInterval()` doesn't work in Vercel's serverless environment
- Functions timeout after 10 seconds (Hobby) or 60 seconds (Pro)
- No persistent processes between requests

**Required Action:** 
- **CRITICAL:** Must be converted to external cron service or API route + external scheduler
- See [Deployment Alternatives](#deployment-alternatives) section

**Configuration:**
```typescript
// Default settings
const DEFAULT_INTERVAL = 60 * 60 * 1000 // 1 hour
const config = {
  batchSize: 10,
  rateLimitDelay: 2000, // 2 seconds between batches
  maxRetries: 3,
  retryDelay: 1000
}
```

**Environment Variables:**
- `DATABASE_URL` - MySQL database connection
- `NSE_API_BASE_URL` - Stock price API endpoint
- `AMFI_API_BASE_URL` - Mutual fund price API endpoint

---

### 2. Legacy Background Price Refresh

**Location:** `src/lib/server/background-price-refresh.ts`

**Purpose:** Older implementation of background price refresh, initialized in app layout.

**Current Implementation:**
- Auto-starts in production via `src/app/layout.tsx`
- Uses `setInterval()` for hourly refresh
- Simpler implementation than the main service

**Vercel Compatibility:** ❌ **INCOMPATIBLE**
- Same issues as main background service
- Currently initialized in layout but won't work on Vercel

**Required Action:**
- **CRITICAL:** Remove or migrate to external service
- Currently conflicts with main background service

---

### 3. SIP Scheduler Service

**Location:** `src/lib/sip-scheduler.ts`

**Purpose:** Processes SIP (Systematic Investment Plan) transactions on scheduled dates, handles retries for failed transactions, and cleans up old failed records.

**Why Implemented:**
- SIPs need to be processed automatically on specific dates
- Failed transactions need retry logic
- Old failed records need cleanup to prevent database bloat

**Current Implementation:**
- Three separate schedulers:
  - **Processing:** Every 24 hours (processes due SIPs)
  - **Retry:** Every 4 hours (retries failed transactions)
  - **Cleanup:** Every 7 days (removes old failed records)
- Uses `setInterval()` for all schedulers
- Includes manual trigger API endpoints

**Vercel Compatibility:** ❌ **INCOMPATIBLE**
- Multiple `setInterval()` calls won't work in serverless
- Long-running processes not supported

**Required Action:**
- **CRITICAL:** Convert to external cron jobs or API routes + scheduler
- Consider using database triggers for some functionality

**Configuration:**
```typescript
const DEFAULT_PROCESSING_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const DEFAULT_RETRY_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours  
const DEFAULT_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days
```

**API Endpoints:**
- `GET /api/sips/scheduler` - Get scheduler status
- `POST /api/sips/scheduler` - Control scheduler (start/stop/restart)
- `PUT /api/sips/scheduler` - Update configuration

---

### 4. Price Refresh Service Manager

**Location:** `src/lib/services/price-refresh-service-manager.ts`

**Purpose:** Manages initialization and lifecycle of the background price refresh service.

**Current Implementation:**
- Singleton pattern for service management
- Graceful shutdown handling for SIGTERM/SIGINT
- Health monitoring and statistics

**Vercel Compatibility:** ⚠️ **PARTIALLY COMPATIBLE**
- Initialization logic can work
- Graceful shutdown won't work (no persistent processes)
- Health monitoring can be adapted to API routes

**Required Action:**
- Adapt for serverless architecture
- Move health monitoring to API endpoints

---

## API Routes (Compatible with Vercel)

### 1. Manual Price Refresh API

**Location:** `src/app/api/pricing/refresh/route.ts`

**Purpose:** Allows manual refresh of specific symbols via API call.

**Vercel Compatibility:** ✅ **COMPATIBLE**
- Works as serverless function
- Can be triggered by external schedulers
- Includes proper error handling and rate limiting

**Usage:**
```bash
POST /api/pricing/refresh
{
  "symbols": ["RELIANCE", "INFY", "120716"],
  "forceRefresh": false
}
```

### 2. SIP Scheduler Control API

**Location:** `src/app/api/sips/scheduler/route.ts`

**Purpose:** Provides API endpoints to control SIP processing manually.

**Vercel Compatibility:** ✅ **COMPATIBLE**
- Manual operations work as serverless functions
- Can be triggered by external schedulers
- Includes actions: start, stop, restart, manual-process, manual-retry, manual-cleanup

## Environment Variables Required

### Core Application
```bash
# Database
DATABASE_URL="mysql://username:password@host:port/database"

# Next.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# External APIs
NSE_API_BASE_URL="https://www.nseindia.com/api"
AMFI_API_BASE_URL="https://www.amfiindia.com/spages"
```

### Additional for Background Services
```bash
# Service Configuration (if using external scheduler)
PRICE_REFRESH_INTERVAL="3600000"  # 1 hour in milliseconds
SIP_PROCESSING_INTERVAL="86400000"  # 24 hours in milliseconds
SIP_RETRY_INTERVAL="14400000"  # 4 hours in milliseconds
SIP_CLEANUP_INTERVAL="604800000"  # 7 days in milliseconds

# External Scheduler URLs (if using webhook-based scheduling)
EXTERNAL_SCHEDULER_WEBHOOK_SECRET="your-webhook-secret"
```

## Deployment Alternatives for Vercel

### Option 1: External Cron Service + API Routes (Recommended)

**Implementation:**
1. Use external cron service (cron-job.org, EasyCron, GitHub Actions)
2. Convert background functions to API endpoints
3. Schedule HTTP requests to trigger functions

**Steps:**
1. Create new API routes:
   ```
   /api/cron/price-refresh
   /api/cron/sip-processing
   /api/cron/sip-retry
   /api/cron/sip-cleanup
   ```

2. Set up external cron jobs:
   ```bash
   # Price refresh every hour
   0 * * * * curl -X POST https://your-app.vercel.app/api/cron/price-refresh
   
   # SIP processing daily at 9 AM
   0 9 * * * curl -X POST https://your-app.vercel.app/api/cron/sip-processing
   
   # SIP retry every 4 hours
   0 */4 * * * curl -X POST https://your-app.vercel.app/api/cron/sip-retry
   
   # SIP cleanup weekly on Sunday at 2 AM
   0 2 * * 0 curl -X POST https://your-app.vercel.app/api/cron/sip-cleanup
   ```

**Pros:**
- Simple to implement
- Works with Vercel's serverless model
- External cron services are reliable

**Cons:**
- Dependency on external service
- Need to secure webhook endpoints
- Additional service to manage

### Option 2: Vercel Cron Jobs (Pro Plan Required)

**Implementation:**
1. Use Vercel's built-in cron functionality
2. Create `vercel.json` configuration
3. Convert functions to API routes

**Configuration:**
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
  ]
}
```

**Pros:**
- Native Vercel integration
- No external dependencies
- Automatic scaling

**Cons:**
- Requires Vercel Pro plan ($20/month)
- Limited to 100 cron jobs per month on Pro
- Still subject to function timeout limits

### Option 3: Separate Worker Service

**Implementation:**
1. Deploy background services to separate platform (Railway, Render, DigitalOcean)
2. Keep main app on Vercel
3. Use shared database

**Architecture:**
```
Vercel (Main App) ←→ Shared Database ←→ Worker Service (Railway/Render)
```

**Pros:**
- Full control over background processes
- No timeout limitations
- Can use traditional cron jobs

**Cons:**
- More complex deployment
- Additional hosting costs
- Need to manage two services

### Option 4: Database-Triggered Functions

**Implementation:**
1. Use database triggers or events
2. Implement queue-based processing
3. Process tasks on user requests

**Example:**
```sql
-- MySQL Event Scheduler
CREATE EVENT price_refresh_event
ON SCHEDULE EVERY 1 HOUR
DO
  INSERT INTO task_queue (task_type, scheduled_at) 
  VALUES ('price_refresh', NOW());
```

**Pros:**
- No external dependencies
- Database-native scheduling
- Works with existing infrastructure

**Cons:**
- Database-specific implementation
- Limited scheduling flexibility
- Requires database event scheduler

## Step-by-Step Vercel Deployment Guide

### Phase 1: Prepare for Deployment

1. **Audit Background Functions**
   ```bash
   # Search for all setInterval/setTimeout usage
   grep -r "setInterval\|setTimeout" src/ --exclude-dir=node_modules
   ```

2. **Create API Route Replacements**
   ```bash
   mkdir -p src/app/api/cron
   ```

3. **Convert Background Services to API Routes**
   - Create `src/app/api/cron/price-refresh/route.ts`
   - Create `src/app/api/cron/sip-processing/route.ts`
   - Create `src/app/api/cron/sip-retry/route.ts`
   - Create `src/app/api/cron/sip-cleanup/route.ts`

### Phase 2: Remove Incompatible Code

1. **Remove Background Service Initialization**
   ```typescript
   // Remove from src/app/layout.tsx
   // if (typeof window === 'undefined') {
   //   import('../lib/server/background-price-refresh').then(({ backgroundPriceRefresh }) => {
   //     backgroundPriceRefresh.start()
   //   })
   // }
   ```

2. **Update Service Managers**
   - Modify `src/lib/services/price-refresh-service-manager.ts`
   - Remove `setInterval` calls
   - Keep health monitoring functions

### Phase 3: Set Up External Scheduling

1. **Choose Scheduling Service**
   - **Free Options:** cron-job.org, GitHub Actions
   - **Paid Options:** EasyCron, Zapier, AWS EventBridge

2. **Configure Webhooks**
   ```typescript
   // Add webhook authentication
   const WEBHOOK_SECRET = process.env.EXTERNAL_SCHEDULER_WEBHOOK_SECRET
   
   export async function POST(request: Request) {
     const authHeader = request.headers.get('authorization')
     if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
       return new Response('Unauthorized', { status: 401 })
     }
     // Process background task
   }
   ```

3. **Set Up Cron Jobs**
   ```bash
   # Example using cron-job.org
   # Price refresh: https://your-app.vercel.app/api/cron/price-refresh
   # Schedule: Every hour
   # Method: POST
   # Headers: Authorization: Bearer your-webhook-secret
   ```

### Phase 4: Deploy and Test

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Test API Endpoints**
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/price-refresh \
     -H "Authorization: Bearer your-webhook-secret"
   ```

3. **Monitor Logs**
   ```bash
   vercel logs --follow
   ```

### Phase 5: Monitoring and Maintenance

1. **Set Up Health Checks**
   - Create `/api/health` endpoint
   - Monitor database connectivity
   - Check external API availability

2. **Error Monitoring**
   - Use Vercel Analytics
   - Set up error alerting
   - Monitor function execution times

3. **Performance Monitoring**
   - Track API response times
   - Monitor database query performance
   - Watch for timeout issues

## Critical Actions Required

### Immediate Actions (Before Vercel Deployment)

1. **🚨 CRITICAL: Remove Background Service Auto-Start**
   - Remove initialization from `src/app/layout.tsx`
   - This will cause errors on Vercel

2. **🚨 CRITICAL: Create Cron API Routes**
   - Convert all background functions to API routes
   - Add proper authentication and error handling

3. **🚨 CRITICAL: Set Up External Scheduler**
   - Choose and configure external cron service
   - Test webhook endpoints before going live

### Post-Deployment Actions

1. **Monitor Function Performance**
   - Watch for timeout issues (10s Hobby, 60s Pro)
   - Optimize slow database queries
   - Consider function splitting for large operations

2. **Database Connection Management**
   - Ensure proper connection pooling
   - Monitor connection limits
   - Consider connection caching

3. **Error Handling and Fallbacks**
   - Implement retry logic for failed cron jobs
   - Set up alerting for critical failures
   - Create manual trigger endpoints for emergencies

## Maintenance Considerations

### Regular Monitoring

1. **Check Cron Job Execution**
   - Verify external scheduler is working
   - Monitor success/failure rates
   - Check execution timing

2. **Database Health**
   - Monitor price cache freshness
   - Check for failed SIP transactions
   - Verify cleanup operations

3. **API Performance**
   - Track external API response times
   - Monitor rate limit usage
   - Check error rates

### Troubleshooting Common Issues

1. **Functions Timing Out**
   - Split large operations into smaller chunks
   - Use database pagination
   - Consider async processing

2. **External API Failures**
   - Implement circuit breaker pattern
   - Use cached data as fallback
   - Set up retry with exponential backoff

3. **Database Connection Issues**
   - Check connection pool settings
   - Monitor concurrent connections
   - Implement connection retry logic

## Conclusion

The current background functions are **incompatible with Vercel's serverless architecture** and require significant refactoring before deployment. The recommended approach is to:

1. Convert all background functions to API routes
2. Use external cron service for scheduling
3. Implement proper authentication and monitoring
4. Test thoroughly before production deployment

This migration is **critical** and must be completed before deploying to Vercel, as the current implementation will fail in production.