import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getInvestments, POST as createInvestment } from '../../app/api/investments/route'
import { GET as getInvestment, PUT as updateInvestment, DELETE as deleteInvestment } from '../../app/api/investments/[id]/route'
import { prisma } from '../../lib/prisma'
import { InvestmentType, AccountType } from '@prisma/client'

describe('/api/investments', () => {
  let testGoal: any
  let testAccount: any
  let testInvestment: any

  beforeEach(async () => {
    // Create test goal
    testGoal = await prisma.goal.create({
      data: {
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
      },
    })

    // Create test account
    testAccount = await prisma.account.create({
      data: {
        name: 'Test Account',
        type: AccountType.BROKER,
      },
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.investment.deleteMany()
    await prisma.goal.deleteMany()
    await prisma.account.deleteMany()
  })

  describe('GET /api/investments', () => {
    it('should return empty array when no investments exist', async () => {
      const response = await getInvestments()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return all investments with related data', async () => {
      // Create test investment
      await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      })

      const response = await getInvestments()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        name: 'Test Stock',
        type: 'STOCK',
        symbol: 'TEST',
        units: 100,
        buyPrice: 50,
      })
      expect(data[0].goal).toMatchObject({
        name: 'Test Goal',
      })
      expect(data[0].account).toMatchObject({
        name: 'Test Account',
      })
    })
  })

  describe('POST /api/investments', () => {
    it('should create a new stock investment', async () => {
      const investmentData = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150,
        buyDate: '2024-01-01',
        goalId: testGoal.id,
        accountId: testAccount.id,
        notes: 'Test investment',
      }

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        body: JSON.stringify(investmentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createInvestment(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        name: 'Apple Inc',
        type: 'STOCK',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150,
        notes: 'Test investment',
      })
    })

    it('should create a new real estate investment', async () => {
      const investmentData = {
        type: InvestmentType.REAL_ESTATE,
        name: 'Property Investment',
        totalValue: 500000,
        buyDate: '2024-01-01',
        goalId: testGoal.id,
        accountId: testAccount.id,
      }

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        body: JSON.stringify(investmentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createInvestment(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        name: 'Property Investment',
        type: 'REAL_ESTATE',
        totalValue: 500000,
      })
    })

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        type: InvestmentType.STOCK,
        name: '',
        goalId: testGoal.id,
        accountId: testAccount.id,
      }

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createInvestment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toBeDefined()
    })

    it('should return error for invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createInvestment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })
  })

  describe('GET /api/investments/[id]', () => {
    beforeEach(async () => {
      testInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      })
    })

    it('should return investment by id', async () => {
      const request = new NextRequest(`http://localhost/api/investments/${testInvestment.id}`)
      const params = Promise.resolve({ id: testInvestment.id })

      const response = await getInvestment(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(testInvestment.id)
      expect(data.name).toBe('Test Stock')
    })

    it('should return 404 for non-existent investment', async () => {
      const request = new NextRequest('http://localhost/api/investments/non-existent')
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await getInvestment(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Investment not found')
    })
  })

  describe('PUT /api/investments/[id]', () => {
    beforeEach(async () => {
      testInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      })
    })

    it('should update investment', async () => {
      const updateData = {
        name: 'Updated Stock',
        units: 200,
      }

      const request = new NextRequest(`http://localhost/api/investments/${testInvestment.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = Promise.resolve({ id: testInvestment.id })

      const response = await updateInvestment(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Stock')
      expect(data.units).toBe(200)
    })

    it('should return 404 for non-existent investment', async () => {
      const updateData = { name: 'Updated Stock' }

      const request = new NextRequest('http://localhost/api/investments/non-existent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await updateInvestment(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })
  })

  describe('DELETE /api/investments/[id]', () => {
    beforeEach(async () => {
      testInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      })
    })

    it('should delete investment', async () => {
      const request = new NextRequest(`http://localhost/api/investments/${testInvestment.id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: testInvestment.id })

      const response = await deleteInvestment(request, { params })

      expect(response.status).toBe(204)

      // Verify investment is deleted
      const deletedInvestment = await prisma.investment.findUnique({
        where: { id: testInvestment.id },
      })
      expect(deletedInvestment).toBeNull()
    })

    it('should return 404 for non-existent investment', async () => {
      const request = new NextRequest('http://localhost/api/investments/non-existent', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await deleteInvestment(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })
  })
})