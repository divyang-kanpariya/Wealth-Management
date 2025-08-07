import { SIP, SIPTransaction } from '@/types'
import { getMutualFundNAVWithFallback } from '@/lib/price-fetcher'
import { calculateNextSipDate, getSipsDueForProcessing, calculateSipTransactionUnits } from '@/lib/calculations'
import { prisma } from '@/lib/prisma'

// Configuration constants
const PROCESSING_BATCH_SIZE = 10
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 5000 // 5 seconds

// Types for processing results
export interface SIPProcessingResult {
  sipId: string
  success: boolean
  transactionId?: string
  amount?: number
  nav?: number
  units?: number
  error?: string
  retryCount?: number
}

export interface SIPBatchProcessingResult {
  totalProcessed: number
  successful: number
  failed: number
  results: SIPProcessingResult[]
  processingTime: number
}

/**
 * Process a single SIP transaction
 */
export async function processSIPTransaction(
  sip: SIP,
  transactionDate: Date = new Date(),
  retryCount: number = 0
): Promise<SIPProcessingResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Processing SIP transaction for ${sip.name} (${sip.id}) - Amount: ${sip.amount}`)
    
    // Validate SIP is active and due for processing
    if (sip.status !== 'ACTIVE') {
      throw new Error(`SIP is not active. Current status: ${sip.status}`)
    }
    
    // Check if SIP has ended
    if (sip.endDate && transactionDate > sip.endDate) {
      // Update SIP status to completed
      await prisma.sIP.update({
        where: { id: sip.id },
        data: { status: 'COMPLETED' }
      })
      throw new Error('SIP has reached its end date and has been marked as completed')
    }
    
    // Fetch current NAV for the mutual fund
    console.log(`Fetching NAV for scheme code: ${sip.symbol}`)
    const navResult = await getMutualFundNAVWithFallback(sip.symbol, false)
    const nav = navResult.nav
    
    if (!nav || nav <= 0) {
      throw new Error(`Invalid NAV received: ${nav}`)
    }
    
    console.log(`NAV fetched: ${nav} (Source: ${navResult.source})`)
    
    // Calculate units to be purchased
    const units = calculateSipTransactionUnits(sip.amount, nav)
    console.log(`Units to be purchased: ${units}`)
    
    // Create SIP transaction record
    const transaction = await prisma.sIPTransaction.create({
      data: {
        sipId: sip.id,
        amount: sip.amount,
        nav: nav,
        units: units,
        transactionDate: transactionDate,
        status: 'COMPLETED'
      }
    })
    
    console.log(`SIP transaction created successfully: ${transaction.id}`)
    
    // Log processing time
    const processingTime = Date.now() - startTime
    console.log(`SIP transaction processed in ${processingTime}ms`)
    
    return {
      sipId: sip.id,
      success: true,
      transactionId: transaction.id,
      amount: sip.amount,
      nav: nav,
      units: units,
      retryCount
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`Error processing SIP transaction for ${sip.id}:`, errorMessage)
    
    // Create failed transaction record for audit trail
    try {
      await prisma.sIPTransaction.create({
        data: {
          sipId: sip.id,
          amount: sip.amount,
          nav: 0, // Set to 0 for failed transactions
          units: 0, // Set to 0 for failed transactions
          transactionDate: transactionDate,
          status: 'FAILED',
          errorMessage: errorMessage
        }
      })
    } catch (dbError) {
      console.error(`Failed to create failed transaction record:`, dbError)
    }
    
    return {
      sipId: sip.id,
      success: false,
      error: errorMessage,
      retryCount
    }
  }
}

/**
 * Process SIP transaction with retry mechanism
 */
export async function processSIPTransactionWithRetry(
  sip: SIP,
  transactionDate: Date = new Date()
): Promise<SIPProcessingResult> {
  let lastResult: SIPProcessingResult | null = null
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const result = await processSIPTransaction(sip, transactionDate, attempt)
    
    if (result.success) {
      return result
    }
    
    lastResult = result
    
    // If this is not the last attempt, wait before retrying
    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`Retrying SIP transaction for ${sip.id} in ${RETRY_DELAY_MS}ms (attempt ${attempt + 2}/${MAX_RETRY_ATTEMPTS})`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  
  // All retries failed
  console.error(`All retry attempts failed for SIP ${sip.id}`)
  return lastResult!
}

/**
 * Get all SIPs due for processing on a specific date
 */
export async function getSIPsDueForProcessing(targetDate: Date = new Date()): Promise<SIP[]> {
  try {
    // Get all active SIPs with their transactions
    const activeSIPs = await prisma.sIP.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        },
        account: true,
        goal: true
      }
    })
    
    // Transform to match our TypeScript types and filter for due SIPs
    const transformedSIPs: SIP[] = activeSIPs.map(sip => ({
      ...sip,
      endDate: sip.endDate ?? undefined,
      goalId: sip.goalId ?? undefined,
      notes: sip.notes ?? undefined,
      goal: sip.goal ? {
        ...sip.goal,
        priority: sip.goal.priority ?? undefined,
        description: sip.goal.description ?? undefined,
      } : undefined,
      account: sip.account ? {
        ...sip.account,
        notes: sip.account.notes ?? undefined,
      } : sip.account,
      transactions: sip.transactions.map(txn => ({
        ...txn,
        errorMessage: txn.errorMessage ?? undefined
      }))
    }))
    
    // Transform transactions for the calculation function
    const transformedTransactions: SIPTransaction[] = activeSIPs.flatMap(sip =>
      sip.transactions.map(txn => ({
        ...txn,
        errorMessage: txn.errorMessage ?? undefined
      }))
    )
    
    // Use the existing calculation function to determine which SIPs are due
    const sipsDue = getSipsDueForProcessing(transformedSIPs, transformedTransactions, targetDate)
    
    console.log(`Found ${sipsDue.length} SIPs due for processing on ${targetDate.toISOString().split('T')[0]}`)
    
    return sipsDue
    
  } catch (error) {
    console.error('Error getting SIPs due for processing:', error)
    throw new Error('Failed to retrieve SIPs due for processing')
  }
}

/**
 * Process all SIPs due for processing in batches
 */
export async function processSIPBatch(
  targetDate: Date = new Date(),
  batchSize: number = PROCESSING_BATCH_SIZE
): Promise<SIPBatchProcessingResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Starting SIP batch processing for ${targetDate.toISOString().split('T')[0]}`)
    
    // Get all SIPs due for processing
    const sipsDue = await getSIPsDueForProcessing(targetDate)
    
    if (sipsDue.length === 0) {
      console.log('No SIPs due for processing')
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
        processingTime: Date.now() - startTime
      }
    }
    
    console.log(`Processing ${sipsDue.length} SIPs in batches of ${batchSize}`)
    
    const allResults: SIPProcessingResult[] = []
    
    // Process SIPs in batches to avoid overwhelming the system
    for (let i = 0; i < sipsDue.length; i += batchSize) {
      const batch = sipsDue.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sipsDue.length / batchSize)} (${batch.length} SIPs)`)
      
      // Process batch in parallel
      const batchPromises = batch.map(sip => 
        processSIPTransactionWithRetry(sip, targetDate)
      )
      
      const batchResults = await Promise.all(batchPromises)
      allResults.push(...batchResults)
      
      // Small delay between batches to avoid overwhelming external APIs
      if (i + batchSize < sipsDue.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Calculate summary statistics
    const successful = allResults.filter(r => r.success).length
    const failed = allResults.filter(r => !r.success).length
    const processingTime = Date.now() - startTime
    
    console.log(`SIP batch processing completed: ${successful} successful, ${failed} failed in ${processingTime}ms`)
    
    return {
      totalProcessed: allResults.length,
      successful,
      failed,
      results: allResults,
      processingTime
    }
    
  } catch (error) {
    console.error('Error in SIP batch processing:', error)
    throw new Error('SIP batch processing failed')
  }
}

/**
 * Calculate average NAV for a SIP based on all its transactions
 */
export async function calculateSIPAverageNAV(sipId: string): Promise<{
  averageNAV: number
  totalInvested: number
  totalUnits: number
  transactionCount: number
}> {
  try {
    const transactions = await prisma.sIPTransaction.findMany({
      where: {
        sipId: sipId,
        status: 'COMPLETED' // Only consider successful transactions
      },
      orderBy: {
        transactionDate: 'asc'
      }
    })
    
    if (transactions.length === 0) {
      return {
        averageNAV: 0,
        totalInvested: 0,
        totalUnits: 0,
        transactionCount: 0
      }
    }
    
    const totalInvested = transactions.reduce((sum, txn) => sum + txn.amount, 0)
    const totalUnits = transactions.reduce((sum, txn) => sum + txn.units, 0)
    const averageNAV = totalUnits > 0 ? totalInvested / totalUnits : 0
    
    return {
      averageNAV,
      totalInvested,
      totalUnits,
      transactionCount: transactions.length
    }
    
  } catch (error) {
    console.error(`Error calculating average NAV for SIP ${sipId}:`, error)
    throw new Error('Failed to calculate average NAV')
  }
}

/**
 * Get SIP transaction audit trail
 */
export async function getSIPTransactionAuditTrail(
  sipId?: string,
  startDate?: Date,
  endDate?: Date,
  status?: string
): Promise<Array<{
  id: string
  sipId: string
  sipName: string
  amount: number
  nav: number
  units: number
  transactionDate: Date
  status: string
  errorMessage?: string
  createdAt: Date
}>> {
  try {
    const whereClause: any = {}
    
    if (sipId) {
      whereClause.sipId = sipId
    }
    
    if (startDate || endDate) {
      whereClause.transactionDate = {}
      if (startDate) whereClause.transactionDate.gte = startDate
      if (endDate) whereClause.transactionDate.lte = endDate
    }
    
    if (status) {
      whereClause.status = status
    }
    
    const transactions = await prisma.sIPTransaction.findMany({
      where: whereClause,
      include: {
        sip: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    })
    
    return transactions.map(txn => ({
      id: txn.id,
      sipId: txn.sipId,
      sipName: txn.sip.name,
      amount: txn.amount,
      nav: txn.nav,
      units: txn.units,
      transactionDate: txn.transactionDate,
      status: txn.status,
      errorMessage: txn.errorMessage ?? undefined,
      createdAt: txn.createdAt
    }))
    
  } catch (error) {
    console.error('Error getting SIP transaction audit trail:', error)
    throw new Error('Failed to retrieve SIP transaction audit trail')
  }
}

/**
 * Get SIP processing statistics
 */
export async function getSIPProcessingStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  totalAmount: number
  totalUnits: number
  averageNAV: number
  uniqueSIPs: number
  processingSuccessRate: number
}> {
  try {
    const whereClause: any = {}
    
    if (startDate || endDate) {
      whereClause.transactionDate = {}
      if (startDate) whereClause.transactionDate.gte = startDate
      if (endDate) whereClause.transactionDate.lte = endDate
    }
    
    const allTransactions = await prisma.sIPTransaction.findMany({
      where: whereClause,
      select: {
        status: true,
        amount: true,
        units: true,
        nav: true,
        sipId: true
      }
    })
    
    const totalTransactions = allTransactions.length
    const successfulTransactions = allTransactions.filter(t => t.status === 'COMPLETED').length
    const failedTransactions = allTransactions.filter(t => t.status === 'FAILED').length
    
    const successfulTxns = allTransactions.filter(t => t.status === 'COMPLETED')
    const totalAmount = successfulTxns.reduce((sum, t) => sum + t.amount, 0)
    const totalUnits = successfulTxns.reduce((sum, t) => sum + t.units, 0)
    const averageNAV = totalUnits > 0 ? totalAmount / totalUnits : 0
    
    const uniqueSIPs = new Set(allTransactions.map(t => t.sipId)).size
    const processingSuccessRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
    
    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalAmount,
      totalUnits,
      averageNAV,
      uniqueSIPs,
      processingSuccessRate
    }
    
  } catch (error) {
    console.error('Error getting SIP processing statistics:', error)
    throw new Error('Failed to retrieve SIP processing statistics')
  }
}

/**
 * Retry failed SIP transactions
 */
export async function retryFailedSIPTransactions(
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<SIPBatchProcessingResult> {
  const startTime = Date.now()
  
  try {
    console.log('Starting retry of failed SIP transactions')
    
    // Get failed transactions within the specified age
    const cutoffDate = new Date(Date.now() - maxAge)
    
    const failedTransactions = await prisma.sIPTransaction.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: cutoffDate
        }
      },
      include: {
        sip: {
          include: {
            account: true,
            goal: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (failedTransactions.length === 0) {
      console.log('No failed transactions to retry')
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
        processingTime: Date.now() - startTime
      }
    }
    
    console.log(`Found ${failedTransactions.length} failed transactions to retry`)
    
    const results: SIPProcessingResult[] = []
    
    // Process each failed transaction
    for (const failedTxn of failedTransactions) {
      // Transform SIP to match our TypeScript types
      const sip: SIP = {
        ...failedTxn.sip,
        endDate: failedTxn.sip.endDate ?? undefined,
        goalId: failedTxn.sip.goalId ?? undefined,
        notes: failedTxn.sip.notes ?? undefined,
        goal: failedTxn.sip.goal ? {
          ...failedTxn.sip.goal,
          priority: failedTxn.sip.goal.priority ?? undefined,
          description: failedTxn.sip.goal.description ?? undefined,
        } : undefined,
        account: failedTxn.sip.account ? {
          ...failedTxn.sip.account,
          notes: failedTxn.sip.account.notes ?? undefined,
        } : failedTxn.sip.account,
      }
      
      // Only retry if SIP is still active
      if (sip.status === 'ACTIVE') {
        const result = await processSIPTransactionWithRetry(sip, failedTxn.transactionDate)
        
        // If successful, delete the old failed transaction
        if (result.success) {
          try {
            await prisma.sIPTransaction.delete({
              where: { id: failedTxn.id }
            })
            console.log(`Deleted old failed transaction ${failedTxn.id}`)
          } catch (deleteError) {
            console.error(`Failed to delete old failed transaction ${failedTxn.id}:`, deleteError)
          }
        }
        
        results.push(result)
      } else {
        console.log(`Skipping retry for inactive SIP ${sip.id}`)
      }
    }
    
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const processingTime = Date.now() - startTime
    
    console.log(`Failed transaction retry completed: ${successful} successful, ${failed} failed in ${processingTime}ms`)
    
    return {
      totalProcessed: results.length,
      successful,
      failed,
      results,
      processingTime
    }
    
  } catch (error) {
    console.error('Error retrying failed SIP transactions:', error)
    throw new Error('Failed to retry failed SIP transactions')
  }
}

/**
 * Clean up old failed transactions
 */
export async function cleanupOldFailedTransactions(
  maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - maxAge)
    
    const result = await prisma.sIPTransaction.deleteMany({
      where: {
        status: 'FAILED',
        createdAt: {
          lt: cutoffDate
        }
      }
    })
    
    console.log(`Cleaned up ${result.count} old failed SIP transactions`)
    return result.count
    
  } catch (error) {
    console.error('Error cleaning up old failed transactions:', error)
    return 0
  }
}