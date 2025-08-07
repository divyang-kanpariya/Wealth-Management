import { 
  withErrorHandling, 
  withGracefulDegradation,
  ServerErrorContext,
  DataPreparationError,
  ServerErrorLogger
} from '../error-handling'
import { errorMonitor } from '../error-monitoring'

export interface DataPreparationResult<T> {
  data: T
  hasErrors: boolean
  errorMessages: string[]
  degradedData: boolean
  timestamp: Date
  cacheKey?: string
}

export interface FallbackDataOptions<T> {
  fallbackData: T
  errorMessage: string
  retryable?: boolean
}

export class DataPreparatorErrorHandler {
  private readonly logger = ServerErrorLogger.getInstance()
  private readonly monitor = errorMonitor

  constructor(private readonly preparatorName: string) {}

  // Execute operation with comprehensive error handling
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string,
    metadata?: Record<string, any>
  ): Promise<DataPreparationResult<T>> {
    const context = this.createContext(operationName, metadata)
    const startTime = performance.now()

    try {
      const data = await withErrorHandling(
        primaryOperation,
        context,
        fallbackOperation
      )

      const duration = performance.now() - startTime
      this.monitor.trackResponseTime(`${this.preparatorName}.${operationName}`, duration)

      return {
        data,
        hasErrors: false,
        errorMessages: [],
        degradedData: false,
        timestamp: new Date()
      }
    } catch (error) {
      const duration = performance.now() - startTime
      this.monitor.trackResponseTime(`${this.preparatorName}.${operationName}`, duration)

      // Log the error
      this.logger.logError(
        error instanceof Error ? error : new Error('Unknown error'),
        { ...context, metadata: { ...context.metadata, duration, failed: true } }
      )

      // Try to provide fallback data
      try {
        const fallbackData = await fallbackOperation()
        return {
          data: fallbackData,
          hasErrors: true,
          errorMessages: [this.getErrorMessage(error)],
          degradedData: true,
          timestamp: new Date()
        }
      } catch (fallbackError) {
        // Both primary and fallback failed
        this.logger.logError(
          fallbackError instanceof Error ? fallbackError : new Error('Fallback failed'),
          { ...context, metadata: { ...context.metadata, fallbackFailed: true } }
        )

        throw new DataPreparationError(
          `${operationName} failed and fallback unavailable`,
          context,
          { cause: error instanceof Error ? error : new Error('Unknown error') }
        )
      }
    }
  }

  // Execute multiple operations with partial failure tolerance
  async executeParallel<T extends Record<string, any>>(
    operations: Record<keyof T, () => Promise<T[keyof T]>>,
    operationName: string,
    fallbacks?: Partial<Record<keyof T, () => Promise<T[keyof T]>>>
  ): Promise<DataPreparationResult<T>> {
    const context = this.createContext(operationName)
    const startTime = performance.now()
    const results: Partial<T> = {}
    const errors: string[] = []
    let hasErrors = false

    // Execute all operations in parallel
    const operationPromises = Object.entries(operations).map(async ([key, operation]) => {
      try {
        const result = await operation()
        results[key as keyof T] = result
      } catch (error) {
        hasErrors = true
        const errorMessage = this.getErrorMessage(error)
        errors.push(`${key}: ${errorMessage}`)

        this.logger.logError(
          error instanceof Error ? error : new Error(`${key} operation failed`),
          { ...context, metadata: { ...context.metadata, operationKey: key } }
        )

        // Try fallback if available
        const fallback = fallbacks?.[key as keyof T]
        if (fallback) {
          try {
            const fallbackResult = await fallback()
            results[key as keyof T] = fallbackResult
            console.log(`[${this.preparatorName}] Using fallback for ${key}`)
          } catch (fallbackError) {
            this.logger.logError(
              fallbackError instanceof Error ? fallbackError : new Error(`${key} fallback failed`),
              { ...context, metadata: { ...context.metadata, operationKey: key, fallbackFailed: true } }
            )
          }
        }
      }
    })

    await Promise.all(operationPromises)

    const duration = performance.now() - startTime
    this.monitor.trackResponseTime(`${this.preparatorName}.${operationName}`, duration)

    // Check if we have enough data to proceed
    const requiredKeys = Object.keys(operations)
    const availableKeys = Object.keys(results)
    const missingKeys = requiredKeys.filter(key => !availableKeys.includes(key))

    if (missingKeys.length === requiredKeys.length) {
      // All operations failed
      throw new DataPreparationError(
        `All ${operationName} operations failed`,
        context
      )
    }

    return {
      data: results as T,
      hasErrors,
      errorMessages: errors,
      degradedData: hasErrors,
      timestamp: new Date()
    }
  }

  // Safe calculation with fallback
  async safeCalculation<T>(
    calculation: () => T | Promise<T>,
    calculationName: string,
    fallback: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const context = this.createContext(`calculation.${calculationName}`, metadata)

    try {
      return await calculation()
    } catch (error) {
      this.logger.logError(
        error instanceof Error ? error : new Error('Calculation failed'),
        context
      )

      console.warn(`[${this.preparatorName}] Calculation ${calculationName} failed, using fallback`)
      
      try {
        return await fallback()
      } catch (fallbackError) {
        this.logger.logError(
          fallbackError instanceof Error ? fallbackError : new Error('Fallback calculation failed'),
          { ...context, metadata: { ...context.metadata, fallbackFailed: true } }
        )
        throw error // Throw original error
      }
    }
  }

  // Create standardized error context
  private createContext(operationName: string, metadata?: Record<string, any>): ServerErrorContext {
    return {
      operation: `${this.preparatorName}.${operationName}`,
      timestamp: new Date(),
      metadata: {
        preparator: this.preparatorName,
        ...metadata
      }
    }
  }

  // Get user-friendly error message
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('database')) {
        return 'Database connection failed'
      }
      if (error.message.includes('fetch') || error.message.includes('timeout')) {
        return 'External service request failed'
      }
      if (error.message.includes('price') || error.message.includes('API')) {
        return 'Price data unavailable'
      }
      if (error.message.includes('calculation')) {
        return 'Calculation failed'
      }
      return error.message
    }
    return 'Unknown error occurred'
  }

  // Create fallback page data with error indicators
  createFallbackPageData<T extends { timestamp: Date }>(
    baseData: Omit<T, 'timestamp' | 'hasErrors' | 'errorMessages' | 'degradedData'>,
    errorMessages: string[] = ['Some data could not be loaded']
  ): T & { hasErrors: boolean; errorMessages: string[]; degradedData: boolean } {
    return {
      ...baseData,
      timestamp: new Date(),
      hasErrors: true,
      errorMessages,
      degradedData: true
    } as T & { hasErrors: boolean; errorMessages: string[]; degradedData: boolean }
  }
}

// Factory function to create error handler for specific preparator
export function createDataPreparatorErrorHandler(preparatorName: string): DataPreparatorErrorHandler {
  return new DataPreparatorErrorHandler(preparatorName)
}

// Utility function for graceful degradation with user-friendly messages
export async function withGracefulDataDegradation<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  operationName: string,
  preparatorName: string
): Promise<{ data: T | F; degraded: boolean; errorMessage?: string }> {
  const context: ServerErrorContext = {
    operation: `${preparatorName}.${operationName}`,
    timestamp: new Date()
  }

  try {
    const data = await primaryOperation()
    return { data, degraded: false }
  } catch (error) {
    const logger = ServerErrorLogger.getInstance()
    logger.logError(
      error instanceof Error ? error : new Error('Operation failed'),
      context
    )

    console.log(`[${preparatorName}] ${operationName} failed, using graceful degradation`)
    
    try {
      const fallbackData = await fallbackOperation()
      return { 
        data: fallbackData, 
        degraded: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    } catch (fallbackError) {
      logger.logError(
        fallbackError instanceof Error ? fallbackError : new Error('Fallback failed'),
        { ...context, metadata: { ...context.metadata, fallbackFailed: true } }
      )
      throw error // Throw original error
    }
  }
}