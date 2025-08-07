import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { SIPStatus, SIPFrequency } from '@/types'

// Test data
const testAccount = {
  name: 'Test Broker',
  type: 'BROKER' as const,
  notes: 'Test account for SIP testing'
}

const testGoal = {
  name: 'Test Goal',
  targetAmount: 100000,
  targetDate: new Date('2025-12-31'),
  priority: 1,
  description: 'Test goal for SIP testing'
}

const testSip = {
  name: 'HDFC Top 100 SIP',
  symbol: '120716',
  amount: 5000,
  frequency: 'MONTHLY' as SIPFrequency,
  startDate: new Date('2024-01-01'),
  endDate: null,
  status: 'ACTIVE' as SIPStatus,
  notes: 'Test SIP'
}

describe('SIP API Endpoints', () => {
  let accountId: string
  let goalId: string
  let sipId: string

  beforeEach(async () => {
    // Create test account
    const account = await prisma.account.create({
      data: testAccount
    })
    accountId = account.id

    // Create test goal
    const goal = await prisma.goal.create({
      data: testGoal
    })
    goalId = goal.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.sIPTransaction.deleteMany()
    await prisma.sIP.deleteMany()
    await prisma.goal.deleteMany()
    await prisma.account.deleteMany()
  })

  describe('POST /api/sips', () => {
    it('should create a new SIP', async () => {
      const sipData = {
        ...testSip,
        accountId,
        goalId
      }

      const response = await fetch('http://localhost:3000/api/sips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sipData),
      })

      expect(response.status).toBe(201)
      
      const createdSip = await response.json()
      expect(createdSip.sip.name).toBe(testSip.name)
      expect(createdSip.sip.symbol).toBe(testSip.symbol)
      expect(createdSip.sip.amount).toBe(testSip.amount)
      expect(createdSip.sip.frequency).toBe(testSip.frequency)
      expect(createdSip.sip.status).toBe(testSip.status)
      expect(createdSip.sip.accountId).toBe(accountId)
      expect(createdSip.sip.goalId).toBe(goalId)

      sipId = createdSip.sip.id
    })

    it('should validate required fields', async () => {
      const invalidSipData = {
        name: '',
        symbol: '',
        amount: 0,
        accountId: ''
      }

      const response = await fetch('http://localhost:3000/api/sips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSipData),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/sips', () => {
    beforeEach(async () => {
      // Create a test SIP
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id
    })

    it('should fetch all SIPs', async () => {
      const response = await fetch('http://localhost:3000/api/sips')
      
      expect(response.status).toBe(200)
      
      const sips = await response.json()
      expect(Array.isArray(sips)).toBe(true)
      expect(sips.length).toBeGreaterThan(0)
      expect(sips[0].sip.name).toBe(testSip.name)
    })

    it('should filter SIPs by status', async () => {
      const response = await fetch('http://localhost:3000/api/sips?status=ACTIVE')
      
      expect(response.status).toBe(200)
      
      const sips = await response.json()
      expect(Array.isArray(sips)).toBe(true)
      sips.forEach((sipWithValue: any) => {
        expect(sipWithValue.sip.status).toBe('ACTIVE')
      })
    })
  })

  describe('GET /api/sips/:id', () => {
    beforeEach(async () => {
      // Create a test SIP
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id
    })

    it('should fetch a specific SIP', async () => {
      const response = await fetch(`http://localhost:3000/api/sips/${sipId}`)
      
      expect(response.status).toBe(200)
      
      const sipWithValue = await response.json()
      expect(sipWithValue.sip.id).toBe(sipId)
      expect(sipWithValue.sip.name).toBe(testSip.name)
    })

    it('should return 404 for non-existent SIP', async () => {
      const response = await fetch('http://localhost:3000/api/sips/non-existent-id')
      
      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/sips/:id', () => {
    beforeEach(async () => {
      // Create a test SIP
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id
    })

    it('should update a SIP', async () => {
      const updateData = {
        name: 'Updated SIP Name',
        amount: 7500,
        status: 'PAUSED' as SIPStatus
      }

      const response = await fetch(`http://localhost:3000/api/sips/${sipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(200)
      
      const updatedSip = await response.json()
      expect(updatedSip.sip.name).toBe(updateData.name)
      expect(updatedSip.sip.amount).toBe(updateData.amount)
      expect(updatedSip.sip.status).toBe(updateData.status)
    })

    it('should return 404 for non-existent SIP', async () => {
      const response = await fetch('http://localhost:3000/api/sips/non-existent-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/sips/:id', () => {
    beforeEach(async () => {
      // Create a test SIP
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id
    })

    it('should delete a SIP', async () => {
      const response = await fetch(`http://localhost:3000/api/sips/${sipId}`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
      
      // Verify SIP is deleted
      const deletedSip = await prisma.sIP.findUnique({
        where: { id: sipId }
      })
      expect(deletedSip).toBeNull()
    })

    it('should return 404 for non-existent SIP', async () => {
      const response = await fetch('http://localhost:3000/api/sips/non-existent-id', {
        method: 'DELETE'
      })

      expect(response.status).toBe(404)
    })
  })

  describe('SIP Transactions API', () => {
    beforeEach(async () => {
      // Create a test SIP
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id
    })

    describe('POST /api/sips/:id/transactions', () => {
      it('should create a SIP transaction', async () => {
        const transactionData = {
          amount: 5000,
          nav: 100,
          units: 50,
          transactionDate: new Date('2024-01-01'),
          status: 'COMPLETED'
        }

        const response = await fetch(`http://localhost:3000/api/sips/${sipId}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        })

        expect(response.status).toBe(201)
        
        const transaction = await response.json()
        expect(transaction.sipId).toBe(sipId)
        expect(transaction.amount).toBe(transactionData.amount)
        expect(transaction.nav).toBe(transactionData.nav)
        expect(transaction.units).toBe(transactionData.units)
        expect(transaction.status).toBe(transactionData.status)
      })

      it('should calculate units from amount and NAV', async () => {
        const transactionData = {
          amount: 5000,
          nav: 100,
          transactionDate: new Date('2024-01-01'),
          status: 'COMPLETED'
        }

        const response = await fetch(`http://localhost:3000/api/sips/${sipId}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        })

        expect(response.status).toBe(201)
        
        const transaction = await response.json()
        expect(transaction.units).toBe(50) // 5000 / 100
      })

      it('should return 404 for non-existent SIP', async () => {
        const transactionData = {
          amount: 5000,
          nav: 100,
          units: 50,
          transactionDate: new Date('2024-01-01')
        }

        const response = await fetch('http://localhost:3000/api/sips/non-existent-id/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        })

        expect(response.status).toBe(404)
      })
    })

    describe('GET /api/sips/:id/transactions', () => {
      it('should fetch SIP transactions', async () => {
        // Create a test transaction
        await prisma.sIPTransaction.create({
          data: {
            sipId,
            amount: 5000,
            nav: 100,
            units: 50,
            transactionDate: new Date('2024-01-01'),
            status: 'COMPLETED'
          }
        })

        const response = await fetch(`http://localhost:3000/api/sips/${sipId}/transactions`)
        
        expect(response.status).toBe(200)
        
        const transactions = await response.json()
        expect(Array.isArray(transactions)).toBe(true)
        expect(transactions.length).toBe(1)
        expect(transactions[0].sipId).toBe(sipId)
      })
    })
  })

  describe('GET /api/sips/summary', () => {
    beforeEach(async () => {
      // Create a test SIP with transactions
      const sip = await prisma.sIP.create({
        data: {
          ...testSip,
          accountId,
          goalId
        }
      })
      sipId = sip.id

      // Create test transactions
      await prisma.sIPTransaction.createMany({
        data: [
          {
            sipId,
            amount: 5000,
            nav: 100,
            units: 50,
            transactionDate: new Date('2024-01-01'),
            status: 'COMPLETED'
          },
          {
            sipId,
            amount: 5000,
            nav: 110,
            units: 45.45,
            transactionDate: new Date('2024-02-01'),
            status: 'COMPLETED'
          }
        ]
      })
    })

    it('should fetch SIP summary', async () => {
      const response = await fetch('http://localhost:3000/api/sips/summary')
      
      expect(response.status).toBe(200)
      
      const summary = await response.json()
      expect(summary.summary).toBeDefined()
      expect(summary.sipsByStatus).toBeDefined()
      expect(summary.sipsByFrequency).toBeDefined()
      expect(summary.topPerformers).toBeDefined()
      expect(summary.bottomPerformers).toBeDefined()
      expect(summary.recentTransactions).toBeDefined()
      
      expect(summary.summary.totalSIPs).toBeGreaterThan(0)
      expect(summary.summary.activeSIPs).toBeGreaterThan(0)
      expect(summary.summary.totalInvested).toBeGreaterThan(0)
    })
  })
})

// Note: These tests require a running server and database
// They should be run as integration tests with proper test setup