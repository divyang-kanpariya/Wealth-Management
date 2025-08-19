# Background Price Refresh Service

The Background Price Refresh Service provides automated, scheduled price updates for all tracked investment symbols in the application. It implements batch processing with API rate limiting to ensure reliable price data updates while respecting external API constraints.

## Features

- **Scheduled Updates**: Automatic price refresh every hour (configurable)
- **Batch Processing**: Processes symbols in batches to handle API rate limits
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Mixed Symbol Support**: Handles both stock symbols and mutual fund scheme codes
- **Database-Only Caching**: Stores all pricing data in the PriceCache table
- **Health Monitoring**: Comprehensive health checks and statistics
- **Manual Refresh**: On-demand refresh capability for specific symbols

## Architecture

### Core Components

1. **BackgroundPriceRefreshService**: Main service class handling scheduled refreshes
2. **PriceRefreshServiceManager**: Service lifecycle management and initialization
3. **API Endpoints**: REST API for service management and monitoring

### Data Flow

```
Scheduled Trigger → Get Tracked Symbols → Batch Processing → API Calls → Database Update → History Logging
```

## Usage

### Basic Service Management

```typescript
import { backgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { initializePriceRefreshService } from '@/lib/services/price-refresh-service-manager'

// Start the service (typically in app initialization)
await initializePriceRefreshService()

// Check service status
const status = backgroundPriceRefreshService.getServiceStatus()
console.log('Service running:', status.running)

// Manual refresh for specific symbols
const result = await backgroundPriceRefreshService.refreshSpecificSymbols(['RELIANCE', 'INFY'])
console.log(`Refreshed ${result.success} symbols successfully`)

// Get statistics
const stats = await backgroundPriceRefreshService.getRefreshStatistics()
console.log(`Total cached prices: ${stats.totalCachedPrices}`)
```

### API Endpoints

#### GET /api/price-refresh

Get service status and statistics:

```bash
# Get comprehensive status
curl http://localhost:3000/api/price-refresh

# Get specific information
curl http://localhost:3000/api/price-refresh?action=status
curl http://localhost:3000/api/price-refresh?action=health
curl http://localhost:3000/api/price-refresh?action=statistics
```

#### POST /api/price-refresh

Manage service and trigger refreshes:

```bash
# Start service
curl -X POST http://localhost:3000/api/price-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Stop service
curl -X POST http://localhost:3000/api/price-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

# Manual refresh all symbols
curl -X POST http://localhost:3000/api/price-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'

# Manual refresh specific symbols
curl -X POST http://localhost:3000/api/price-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh", "symbols": ["RELIANCE", "INFY", "120503"]}'
```

#### PUT /api/price-refresh

Update service configuration:

```bash
# Change refresh interval to 30 minutes
curl -X PUT http://localhost:3000/api/price-refresh \
  -H "Content-Type: application/json" \
  -d '{"intervalMs": 1800000}'
```

## Configuration

### Default Settings

```typescript
const config = {
  batchSize: 10,              // Symbols per batch
  rateLimitDelay: 2000,       // 2 seconds between batches
  maxRetries: 3,              // Retry attempts for failed requests
  retryDelay: 1000,           // 1 second between retries
  refreshInterval: 3600000    // 1 hour (60 * 60 * 1000 ms)
}
```

### Customization

You can customize the service behavior by modifying the configuration in the service constructor or by restarting with different parameters:

```typescript
// Restart with custom interval (30 minutes)
await backgroundPriceRefreshService.startScheduledRefresh(30 * 60 * 1000)
```

## Database Schema

The service uses two main database tables:

### PriceCache Table
```sql
CREATE TABLE price_cache (
  id VARCHAR(191) PRIMARY KEY,
  symbol VARCHAR(191) UNIQUE NOT NULL,
  price DOUBLE NOT NULL,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(191) NOT NULL,
  INDEX idx_lastUpdated (lastUpdated),
  INDEX idx_source (source)
);
```

### PriceHistory Table
```sql
CREATE TABLE price_history (
  id VARCHAR(191) PRIMARY KEY,
  symbol VARCHAR(191) NOT NULL,
  price DOUBLE NOT NULL,
  source VARCHAR(191) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_timestamp (symbol, timestamp),
  INDEX idx_symbol (symbol),
  INDEX idx_timestamp (timestamp)
);
```

## Monitoring and Health Checks

### Health Check Response

```json
{
  "status": "healthy",
  "running": true,
  "lastRefreshTime": "2024-01-01T12:00:00.000Z",
  "issues": []
}
```

### Statistics Response

```json
{
  "totalCachedPrices": 150,
  "freshPrices": 120,
  "stalePrices": 30,
  "lastRefreshTime": "2024-01-01T12:00:00.000Z",
  "priceHistoryCount": 5000,
  "uniqueSymbolsTracked": 150
}
```

## Error Handling

The service implements comprehensive error handling:

1. **API Failures**: Automatic retry with exponential backoff
2. **Database Errors**: Graceful degradation and error logging
3. **Network Issues**: Timeout handling and fallback mechanisms
4. **Invalid Data**: Data validation and sanitization

### Common Error Scenarios

- **API Rate Limiting**: Service automatically delays between batches
- **Network Timeouts**: Retry mechanism handles temporary network issues
- **Invalid Symbols**: Failed symbols are logged but don't stop the batch
- **Database Connectivity**: Service reports unhealthy status and retries

## Performance Considerations

### Batch Processing

- Default batch size: 10 symbols
- Rate limiting delay: 2 seconds between batches
- For 100 symbols: ~20 seconds total processing time

### Memory Usage

- Minimal memory footprint (database-only caching)
- No in-memory price storage
- Efficient batch processing reduces memory spikes

### Database Impact

- Optimized queries with proper indexing
- Batch updates for better performance
- Connection pooling for concurrent operations

## Integration with Existing Code

The service integrates seamlessly with the existing price-fetcher:

```typescript
// Legacy functions still work (with deprecation warnings)
import { startPriceRefreshScheduler } from '@/lib/price-fetcher'
startPriceRefreshScheduler() // Delegates to BackgroundPriceRefreshService

// New recommended approach
import { initializePriceRefreshService } from '@/lib/services/price-refresh-service-manager'
await initializePriceRefreshService()
```

## Testing

Run the comprehensive test suite:

```bash
# Unit tests
npm run test src/test/lib/background-price-refresh-service.test.ts

# Integration test
node test-background-service.js
```

## Troubleshooting

### Service Not Starting

1. Check database connectivity
2. Verify environment variables
3. Check for port conflicts
4. Review application logs

### Poor Performance

1. Adjust batch size and rate limiting
2. Check database query performance
3. Monitor API response times
4. Review network connectivity

### Data Inconsistencies

1. Check API response formats
2. Verify symbol mappings
3. Review error logs
4. Validate database constraints

## Future Enhancements

- **Dynamic Batch Sizing**: Adjust batch size based on API performance
- **Priority Symbols**: Refresh important symbols more frequently
- **Multiple Data Sources**: Support for additional price data providers
- **Real-time Updates**: WebSocket integration for live price feeds
- **Advanced Analytics**: Price trend analysis and alerts