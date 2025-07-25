import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getAccounts, POST as createAccount } from '../../app/api/accounts/route'
import { GET as getAccount, PUT as updateAccount, DELETE as deleteAccount } from '../../app/api/accounts/[id]/route'
import { prisma } from '../../lib/prisma'
import { InvestmentType, AccountType } from '@prisma/client'

describe('/api/accounts', () => {
  let testAccount: any
  let testGoal: any

  beforeEach(async () => {
    // Create test goal for investments
    testGoal = await prisma.goal.create({
      data: {
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
      },
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.investment.deleteMany()
    await prisma.goal.deleteMany()
    await prisma.account.deleteMany()
  })

  describe('GET /api/accounts', () => {
    it('should return empty array when no accounts exist', async () => {
      const response = await getAccounts()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return all accounts with investments', async () => {
      // Create test account
      const account = await prisma.account.create({
        data: {
          name: 'Zerodha',
          type: AccountType.BROKER,
          notes: 'Primary trading account',
        },
      })

      // Create investment linked to account
      await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: account.id,
        },
      })

      const response = await getAccounts()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        name: 'Zerodha',
        type: 'BROKER',
        notes: 'Primary trading account',
      })
      expect(data[0].investments).toHaveLength(1)
    })
  })

  describe('POST /api/accounts', () => {
    it('should create a new broker account', async () => {
      const accountData = {
        name: 'Upstox',
        type: AccountType.BROKER,
        notes: 'Secondary trading account',
      }

      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createAccount(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        name: 'Upstox',
        type: 'BROKER',
        notes: 'Secondary trading account',
      })
    })

    it('should create a bank account', async () => {
      const accountData = {
        name: 'HDFC Bank',
        type: AccountType.BANK,
      }

      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createAccount(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        name: 'HDFC Bank',
        type: 'BANK',
      })
      expect(data.notes).toBeNull()
    })

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: '',
        type: 'INVALID_TYPE',
      }

      const request = new NextRequest('http://localhost/api/accounts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createAccount(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toBeDefined()
    })
  })

  describe('GET /api/accounts/[id]', () => {
    beforeEach(async () => {
      testAccount = await prisma.account.create({
        data: {
          name: 'Test Account',
          type: AccountType.BROKER,
          notes: 'Test notes',
        },
      })
    })

    it('should return account by id', async () => {
      const request = new NextRequest(`http://localhost/api/accounts/${testAccount.id}`)
      const params = Promise.resolve({ id: testAccount.id })

      const response = await getAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(testAccount.id)
      expect(data.name).toBe('Test Account')
      expect(data.type).toBe('BROKER')
    })

    it('should return 404 for non-existent account', async () => {
      const request = new NextRequest('http://localhost/api/accounts/non-existent')
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await getAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })
  })

  describe('PUT /api/accounts/[id]', () => {
    beforeEach(async () => {
      testAccount = await prisma.account.create({
        data: {
          name: 'Test Account',
          type: AccountType.BROKER,
          notes: 'Original notes',
        },
      })
    })

    it('should update account', async () => {
      const updateData = {
        name: 'Updated Account',
        type: AccountType.DEMAT,
        notes: 'Updated notes',
      }

      const request = new NextRequest(`http://localhost/api/accounts/${testAccount.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = Promise.resolve({ id: testAccount.id })

      const response = await updateAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Account')
      expect(data.type).toBe('DEMAT')
      expect(data.notes).toBe('Updated notes')
    })

    it('should return 404 for non-existent account', async () => {
      const updateData = { name: 'Updated Account' }

      const request = new NextRequest('http://localhost/api/accounts/non-existent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await updateAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })
  })

  describe('DELETE /api/accounts/[id]', () => {
    beforeEach(async () => {
      testAccount = await prisma.account.create({
        data: {
          name: 'Test Account',
          type: AccountType.BROKER,
        },
      })
    })

    it('should delete account without investments', async () => {
      const request = new NextRequest(`http://localhost/api/accounts/${testAccount.id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: testAccount.id })

      const response = await deleteAccount(request, { params })

      expect(response.status).toBe(204)

      // Verify account is deleted
      const deletedAccount = await prisma.account.findUnique({
        where: { id: testAccount.id },
      })
      expect(deletedAccount).toBeNull()
    })

    it('should not delete account with linked investments', async () => {
      // Create investment linked to account
      await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      })

      const request = new NextRequest(`http://localhost/api/accounts/${testAccount.id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: testAccount.id })

      const response = await deleteAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Cannot delete account with linked investments')

      // Verify account still exists
      const existingAccount = await prisma.account.findUnique({
        where: { id: testAccount.id },
      })
      expect(existingAccount).not.toBeNull()
    })

    it('should return 404 for non-existent account', async () => {
      const request = new NextRequest('http://localhost/api/accounts/non-existent', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await deleteAccount(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })
  })
})