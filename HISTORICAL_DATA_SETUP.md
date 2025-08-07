# Historical Data System Setup Guide

This guide explains how to set up and use the real historical data system instead of fake/simulated data for your investment analytics.

## 🎯 What This Fixes

**Before (Fake Data):**
- Portfolio trends used random variations
- Investment growth used hardcoded percentages (80%, 85%, 90%, etc.)
- Goal progress used fake historical dates
- Portfolio performance used current prices for all historical points
- SIP projections used simple 12% annual return assumptions

**After (Real Data):**
- Portfolio trends from actual daily snapshots
- Investment growth from real historical invested amounts
- Goal progress from actual historical goal values
- Portfolio performance from real historical prices
- All charts show genuine historical performance

## 📋 Prerequisites

1. **Database Setup**: Ensure your MySQL database is running and accessible
2. **Existing Data**: Have some investments, goals, and accounts in your system
3. **TSX Runtime**: Install `tsx` for running TypeScript scripts:
   ```bash
   npm install -g tsx
   # or use npx tsx (already configured in package.json)
   ```

## 🚀 Quick Setup (Automated)

### Step 1: Run the Setup Script
```bash
npm run setup-historical-data
```

This script will:
- ✅ Check database connection
- ✅ Collect all symbols from your investments
- ✅ Determine optimal date range for historical data
- ✅ Collect historical prices for all symbols
- ✅ Backfill portfolio snapshots
- ✅ Create today's snapshot
- ✅ Show setup summary

### Step 2: Verify Setup
Visit `/charts` in your application to see real historical data instead of fake trends.

## 🔧 Manual Setup (Advanced)

### Step 1: Update Database Schema
```bash
npm run db:push
# or
npm run db:migrate
```

### Step 2: Collect Historical Prices
```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/analytics/collect-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "action": "prices",
    "symbols": ["RELIANCE", "TCS", "INFY"],
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

### Step 3: Backfill Portfolio Data
```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/analytics/collect-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "action": "backfill",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

### Step 4: Create Daily Snapshot
```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/analytics/collect-snapshot \
  -H "Content-Type: application/json" \
  -d '{"action": "daily"}'

# Or via script
npm run daily-snapshot
```

## 📊 New Database Tables

The system creates these new tables for historical data:

### `historical_prices`
Stores daily OHLCV data for stocks/mutual funds
```sql
- symbol: Stock/MF symbol
- date: Trading date
- open, high, low, close: Price data
- volume: Trading volume
- source: Data source (API, MOCK_API, etc.)
```

### `portfolio_snapshots`
Daily portfolio value snapshots
```sql
- date: Snapshot date
- totalValue: Total portfolio value
- totalInvested: Total amount invested
- totalGainLoss: Total gain/loss amount
- totalGainLossPercentage: Total return percentage
- assetAllocation: JSON of asset type distribution
- accountDistribution: JSON of account distribution
```

### `goal_progress_history`
Historical goal progress tracking
```sql
- goalId: Reference to goal
- date: Progress date
- currentValue: Goal's current value
- progress: Progress percentage
- remainingAmount: Amount remaining to reach goal
```

### `investment_value_history`
Individual investment value tracking
```sql
- investmentId: Reference to investment
- date: Value date
- price: Asset price on that date
- currentValue: Investment's total value
- gainLoss: Gain/loss amount
- gainLossPercentage: Return percentage
```

## 🔄 Daily Data Collection

### Automated (Recommended)
Set up a cron job to run daily:
```bash
# Add to your crontab (crontab -e)
0 18 * * 1-5 cd /path/to/your/app && npm run daily-snapshot

# This runs at 6 PM on weekdays (after market hours)
```

### Manual
```bash
npm run daily-snapshot
```

### Via API (for serverless/webhooks)
```bash
curl -X POST http://localhost:3000/api/analytics/collect-snapshot \
  -H "Content-Type: application/json" \
  -d '{"action": "daily"}'
```

## 📈 New API Endpoints

### Portfolio History
```bash
GET /api/analytics/portfolio-history?timeRange=6M
GET /api/analytics/portfolio-history?startDate=2024-01-01&endDate=2024-12-31
```

### Goal History
```bash
GET /api/analytics/goal-history?timeRange=6M
GET /api/analytics/goal-history?goalId=goal123&timeRange=1Y
```

### Investment History
```bash
GET /api/analytics/investment-history?timeRange=6M
GET /api/analytics/investment-history?investmentId=inv123
GET /api/analytics/investment-history?symbol=RELIANCE&timeRange=1Y
```

### Data Collection Status
```bash
GET /api/analytics/collect-snapshot
```

## 🧪 Testing the System

### 1. Check Data Collection Status
```bash
curl http://localhost:3000/api/analytics/collect-snapshot
```

Expected response:
```json
{
  "success": true,
  "data": {
    "portfolioSnapshots": 150,
    "historicalPrices": 2500,
    "goalHistory": 75,
    "investmentHistory": 300,
    "dateRange": {
      "oldest": "2024-01-01",
      "latest": "2024-12-31"
    }
  }
}
```

### 2. Test Portfolio History API
```bash
curl "http://localhost:3000/api/analytics/portfolio-history?timeRange=1M"
```

### 3. Verify Charts Show Real Data
1. Visit `/charts` in your browser
2. Check that trends are no longer random/fake
3. Verify time range filters work correctly
4. Confirm tooltips show real historical dates and values

### 4. Test Different Time Ranges
- 1M (1 Month)
- 3M (3 Months) 
- 6M (6 Months)
- 1Y (1 Year)
- ALL (All available data)

## 🔍 Troubleshooting

### No Historical Data Showing
1. **Check if setup script ran successfully:**
   ```bash
   npm run setup-historical-data
   ```

2. **Verify database tables exist:**
   ```bash
   npm run db:studio
   # Check for: historical_prices, portfolio_snapshots, etc.
   ```

3. **Check API responses:**
   ```bash
   curl http://localhost:3000/api/analytics/collect-snapshot
   ```

### Charts Still Show Fake Data
1. **Clear browser cache** and refresh `/charts`
2. **Check browser console** for API errors
3. **Verify API endpoints** return real data:
   ```bash
   curl "http://localhost:3000/api/analytics/portfolio-history?timeRange=6M"
   ```

### Historical Prices Missing
1. **Run price collection manually:**
   ```bash
   curl -X POST http://localhost:3000/api/analytics/collect-snapshot \
     -H "Content-Type: application/json" \
     -d '{
       "action": "prices",
       "symbols": ["RELIANCE", "TCS"],
       "startDate": "2024-01-01",
       "endDate": "2024-12-31"
     }'
   ```

2. **Check if symbols exist in investments:**
   - Ensure your investments have `symbol` field populated
   - Symbols should match standard stock/MF codes

### Performance Issues
1. **Limit date ranges** for large datasets
2. **Add database indexes** (already included in schema)
3. **Consider data archival** for very old data

## 🎉 Success Indicators

✅ **Setup Complete When:**
- Portfolio trends show realistic historical patterns
- Investment growth reflects actual investment timing
- Goal progress shows real historical progression
- Time range filters work with real data
- No more random variations or hardcoded percentages

✅ **Daily Collection Working When:**
- New snapshots appear daily in database
- Charts update with latest data
- API endpoints return current date data

## 📝 Next Steps

1. **Set up monitoring** for daily collection failures
2. **Add alerting** for data collection issues
3. **Consider external APIs** for more accurate price data
4. **Implement data validation** for price accuracy
5. **Add data export** functionality for analysis

## 🔗 Related Files

- `src/lib/historical-data-collector.ts` - Core data collection logic
- `src/scripts/setup-historical-data.ts` - Setup automation
- `src/scripts/daily-snapshot-cron.ts` - Daily collection
- `src/app/api/analytics/` - Historical data APIs
- `src/components/charts/` - Updated chart components
- `prisma/schema.prisma` - Database schema with historical tables

---

**🎯 Result:** Your investment analytics now show real historical performance instead of fake simulated data, providing genuine insights into your portfolio's actual performance over time.