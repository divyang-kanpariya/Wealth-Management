import { notFound } from 'next/navigation'

export interface ServerErrorContext {
  operation: string
  userId?: string
  requestId?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export class ServerError extends Error {
  public readonly code: string
  public readonly context: ServerErrorContext
  public readonly isRetryable: boolean
  public readonly statusCode: number
  public readonly cause?: Error

  constructor(
    message: string,
    code: string,
    context: ServerErrorContext,
    options: {
      isRetryable?: boolean
      statusCode?: number
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'ServerError'
    this.code = code
    this.context = context
    this.isRetryable = options.isRetryable ?? false
    this.statusCode = options.statusCode ?? 500
    this.cause = options.cause
  }
}

export class DataPreparationError extends ServerError {
  constructor(
    message: string,
    context: ServerErrorContext,
    options: { cause?: Error; isRetryable?: boolean } = {}
  ) {
    super(message, 'DATA_PREPARATION_ERROR', context, {
      ...options,
      statusCode: 500
    })
  }
}

export class DatabaseError extends ServerError {
  constructor(
    message: string,
    context: ServerErrorContext,
    options: { cause?: Error; isRetryable?: boolean } = {}
  ) {
    super(message, 'DATABASE_ERROR', context, {
      ...options,
      statusCode: 503,
      isRetryable: true
    })
  }
}

export class ExternalServiceError extends ServerError {
  constructor(
    message: string,
    context: ServerErrorContext,
    options: { cause?: Error; isRetryable?: boolean } = {}
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', context, {
      ...options,
      statusCode: 502,
      isRetryable: true
    })
  }
}

export class ValidationError extends ServerError {
  constructor(
    message: string,
    context: ServerErrorContext,
    options: { cause?: Error } = {}
  ) {
    super(message, 'VALIDATION_ERROR', context, {
      ...options,
      statusCode: 400,
      isRetryable: false
    })
  }
}

// Error logging utility
export class ServerErrorLogger {
  private static instance: ServerErrorLogger
  private errorBuffer: any[] = []
  private readonly MAX_BUFFER_SIZE = 100
  
  static getInstance(): ServerErrorLogger {
    if (!ServerErrorLogger.instance) {
      ServerErrorLogger.instance = new ServerErrorLogger()
    }
    return ServerErrorLogger.instance
  }

  logError(error: Error | ServerError, context?: Partial<ServerErrorContext>): void {
    const timestamp = new Date()
    const errorData = {
      timestamp: timestamp.toISOString(),
      message: error.message,
      stack: error.stack,
      ...(error instanceof ServerError && {
        code: error.code,
        context: error.context,
        isRetryable: error.isRetryable,
        statusCode: error.statusCode
      }),
      ...context,
      // Additional context for better debugging
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }

    // Add to error buffer for monitoring
    this.addToBuffer(errorData)

    // Log to console (in development) or external service (in production)
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.error('[ServerError]', errorData)
    } else {
      // Enhanced production logging
      console.error('[ServerError]', JSON.stringify(errorData, null, 2))
      
      // Send to external monitoring service
      this.sendToMonitoringService(errorData)
    }

    // Store critical errors for immediate attention
    if (error instanceof ServerError && error.statusCode >= 500) {
      this.storeCriticalError(errorData)
    }

    // Track error patterns
    this.trackErrorPattern(errorData)
  }

  private addToBuffer(errorData: any): void {
    this.errorBuffer.push(errorData)
    if (this.errorBuffer.length > this.MAX_BUFFER_SIZE) {
      this.errorBuffer.shift() // Remove oldest error
    }
  }

  private sendToMonitoringService(errorData: any): void {
    // TODO: Implement actual monitoring service integration
    // Examples: Sentry, DataDog, New Relic, CloudWatch, etc.
    try {
      // Placeholder for monitoring service call
      if (process.env.MONITORING_WEBHOOK_URL) {
        // Could send to webhook, Slack, etc.
        console.log('[MONITORING] Would send error to monitoring service:', errorData.code || 'UNKNOWN_ERROR')
      }
    } catch (monitoringError) {
      console.error('[MONITORING ERROR] Failed to send error to monitoring service:', monitoringError)
    }
  }

  private storeCriticalError(errorData: any): void {
    // Store critical errors for immediate attention
    console.error('[CRITICAL ERROR]', JSON.stringify(errorData, null, 2))
    
    // TODO: Store in database for persistence
    // TODO: Send immediate alerts (email, Slack, PagerDuty, etc.)
    
    // For now, create a structured log entry
    const criticalLog = {
      level: 'CRITICAL',
      timestamp: errorData.timestamp,
      error: errorData,
      requiresImmediateAttention: true,
      alertSent: false // TODO: Set to true when alert is sent
    }
    
    console.error('[ALERT REQUIRED]', JSON.stringify(criticalLog, null, 2))
  }

  private trackErrorPattern(errorData: any): void {
    // Track error patterns for proactive monitoring
    const pattern = {
      operation: errorData.context?.operation || 'unknown',
      errorType: errorData.code || 'UNKNOWN_ERROR',
      timestamp: errorData.timestamp,
      isRetryable: errorData.isRetryable || false
    }
    
    // TODO: Implement pattern analysis
    // - Detect error spikes
    // - Identify recurring issues
    // - Track error rates by operation
    console.log('[ERROR PATTERN]', pattern)
  }

  logPerformanceIssue(operation: string, duration: number, threshold: number = 5000): void {
    if (duration > threshold) {
      const performanceData = {
        timestamp: new Date().toISOString(),
        operation,
        duration,
        threshold,
        type: 'PERFORMANCE_ISSUE',
        severity: duration > threshold * 2 ? 'HIGH' : 'MEDIUM',
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }

      console.warn('[PERFORMANCE WARNING]', performanceData)
      
      // Send performance alerts for severe issues
      if (duration > threshold * 3) {
        console.error('[PERFORMANCE CRITICAL]', performanceData)
        this.sendToMonitoringService({
          ...performanceData,
          level: 'CRITICAL',
          requiresAttention: true
        })
      }
    }
  }

  // Get error statistics for monitoring dashboard
  getErrorStats(): {
    totalErrors: number
    criticalErrors: number
    recentErrors: any[]
    errorsByType: Record<string, number>
    errorsByOperation: Record<string, number>
  } {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const recentErrors = this.errorBuffer.filter(error => 
      new Date(error.timestamp).getTime() > oneHourAgo
    )
    
    const errorsByType: Record<string, number> = {}
    const errorsByOperation: Record<string, number> = {}
    
    recentErrors.forEach(error => {
      const type = error.code || 'UNKNOWN_ERROR'
      const operation = error.context?.operation || 'unknown'
      
      errorsByType[type] = (errorsByType[type] || 0) + 1
      errorsByOperation[operation] = (errorsByOperation[operation] || 0) + 1
    })
    
    return {
      totalErrors: this.errorBuffer.length,
      criticalErrors: this.errorBuffer.filter(e => e.statusCode >= 500).length,
      recentErrors: recentErrors.slice(-10), // Last 10 recent errors
      errorsByType,
      errorsByOperation
    }
  }

  // Clear error buffer (useful for testing or maintenance)
  clearBuffer(): void {
    this.errorBuffer = []
    console.log('[ERROR LOGGER] Buffer cleared')
  }
}

// Error handling utilities for server components
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ServerErrorContext,
  fallback?: () => Promise<T>
): Promise<T> {
  const logger = ServerErrorLogger.getInstance()
  const startTime = performance.now()

  try {
    const result = await operation()
    const duration = performance.now() - startTime
    
    // Log slow operations
    logger.logPerformanceIssue(context.operation, duration)
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    
    // Create appropriate server error
    let serverError: ServerError
    
    if (error instanceof ServerError) {
      serverError = error
    } else if (error instanceof Error) {
      // Enhanced error classification
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('database') || 
          error.message.includes('ENOTFOUND') ||
          error.message.includes('connection')) {
        serverError = new DatabaseError(
          'Database connection failed',
          context,
          { cause: error, isRetryable: true }
        )
      } else if (error.message.includes('fetch') || 
                 error.message.includes('timeout') ||
                 error.message.includes('ETIMEDOUT') ||
                 error.message.includes('network') ||
                 error.message.includes('API')) {
        serverError = new ExternalServiceError(
          'External service request failed',
          context,
          { cause: error, isRetryable: true }
        )
      } else if (error.message.includes('validation') ||
                 error.message.includes('invalid') ||
                 error.message.includes('required')) {
        serverError = new ValidationError(
          'Data validation failed',
          context,
          { cause: error }
        )
      } else {
        serverError = new DataPreparationError(
          'Data preparation failed',
          context,
          { cause: error, isRetryable: false }
        )
      }
    } else {
      serverError = new DataPreparationError(
        'Unknown error occurred',
        context
      )
    }

    // Log the error with enhanced context
    logger.logError(serverError, { 
      ...context,
      metadata: { 
        ...context.metadata, 
        duration,
        operationName: context.operation
      }
    })

    // Try fallback if available
    if (fallback) {
      try {
        console.log(`[${context.operation}] Attempting fallback after ${serverError.code}`)
        const fallbackStartTime = performance.now()
        const fallbackResult = await fallback()
        const fallbackDuration = performance.now() - fallbackStartTime
        
        console.log(`[${context.operation}] Fallback succeeded in ${fallbackDuration.toFixed(2)}ms`)
        return fallbackResult
      } catch (fallbackError) {
        const fallbackServerError = fallbackError instanceof Error 
          ? new DataPreparationError('Fallback operation failed', context, { cause: fallbackError })
          : new DataPreparationError('Fallback operation failed with unknown error', context)
        
        logger.logError(fallbackServerError, { 
          ...context,
          metadata: {
            ...context.metadata,
            originalError: serverError.code,
            fallbackAttempted: true
          }
        })
        
        // Return original error, not fallback error
        throw serverError
      }
    }

    throw serverError
  }
}

// Utility for handling not found cases
export function handleNotFound(condition: boolean, message?: string): void {
  if (condition) {
    notFound()
  }
}

// Utility for retrying operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  context?: ServerErrorContext
): Promise<T> {
  const logger = ServerErrorLogger.getInstance()
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        if (context) {
          logger.logError(lastError, { 
            ...context, 
            metadata: { 
              ...context.metadata, 
              attempt, 
              maxRetries 
            } 
          })
        }
        throw lastError
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
      
      if (context) {
        console.log(`[${context.operation}] Retry attempt ${attempt}/${maxRetries}`)
      }
    }
  }

  throw lastError!
}

// Graceful degradation utility
export async function withGracefulDegradation<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  context: ServerErrorContext
): Promise<T | F> {
  const logger = ServerErrorLogger.getInstance()

  try {
    return await primaryOperation()
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error('Primary operation failed'),
      { ...context, metadata: { ...context.metadata, degraded: true } }
    )
    
    console.log(`[${context.operation}] Primary operation failed, using fallback`)
    return await fallbackOperation()
  }
}