import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { processSIPBatch, getSIPsDueForProcessing } from '@/lib/sip-processor'
import { startSIPScheduler, stopSIPScheduler, getSIPSchedulerStatus } from '@/lib/sip-scheduler'

describe('SIP Processing Integration', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.sIPTransaction.deleteMany({
      where: {
        sip: {
          name: {
            contains: 'TEST'
          }
        }
      }
    })
    
    await prisma.sIP.deleteMany({
      where: {
        name: {
          contains: 'TEST'
        }
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.sIPTransaction.deleteMany({
      where: {
        sip: {
          name: {
            contains: 'TEST'
          }
        }
      }
    })
    
    await prisma.sIP.deleteMany({
      where: {
        name: {
          contains: 'TEST'
        }
      }
    })
    
    // Stop scheduler if running
    stopSIPScheduler()
  })

  it('should get SIPs due for processing', async () => {
    const sipsDue = await getSIPsDueForProcessing()
    expect(Array.isArray(sipsDue)).toBe(true)
  })

  it('should process SIP batch without errors', async () => {
    const result = await processSIPBatch()
    
    expect(result).toHaveProperty('totalProcessed')
    expect(result).toHaveProperty('successful')
    expect(result).toHaveProperty('failed')
    expect(result).toHaveProperty('results')
    expect(result).toHaveProperty('processingTime')
    
    expect(typeof result.totalProcessed).toBe('number')
    expect(typeof result.successful).toBe('number')
    expect(typeof result.failed).toBe('number')
    expect(Array.isArray(result.results)).toBe(true)
    expect(typeof result.processingTime).toBe('number')
  })

  it('should start and stop SIP scheduler', () => {
    // Start scheduler
    startSIPScheduler({
      processingIntervalMs: 60000,
      enableProcessing: true,
      enableRetry: false,
      enableCleanup: false
    })
    
    let status = getSIPSchedulerStatus()
    expect(status.running).toBe(true)
    expect(status.schedulers.processing.running).toBe(true)
    expect(status.schedulers.retry.running).toBe(false)
    expect(status.schedulers.cleanup.running).toBe(false)
    
    // Stop scheduler
    stopSIPScheduler()
    
    status = getSIPSchedulerStatus()
    expect(status.running).toBe(false)
    expect(status.schedulers.processing.running).toBe(false)
    expect(status.schedulers.retry.running).toBe(false)
    expect(status.schedulers.cleanup.running).toBe(false)
  })

  it('should handle empty SIP processing gracefully', async () => {
    // Process for a future date where no SIPs should be due
    const futureDate = new Date('2030-01-01')
    const result = await processSIPBatch(futureDate)
    
    expect(result.totalProcessed).toBe(0)
    expect(result.successful).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(0)
  })
})