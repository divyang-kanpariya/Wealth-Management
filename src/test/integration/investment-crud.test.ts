import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../lib/prisma';
import { InvestmentType, AccountType } from '@prisma/client';

describe('Investment CRUD Operations', () => {
  let testGoal: any;
  let testAccount: any;
  let testInvestment: any;

  beforeEach(async () => {
    // Create test goal
    testGoal = await prisma.goal.create({
      data: {
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
      },
    });

    // Create test account
    testAccount = await prisma.account.create({
      data: {
        name: 'Test Account',
        type: AccountType.BROKER,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.investment.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.account.deleteMany();
  });

  it('should create, read, update, and delete a stock investment', async () => {
    // CREATE
    const investmentData = {
      type: InvestmentType.STOCK,
      name: 'Test Stock',
      symbol: 'TEST',
      units: 100,
      buyPrice: 50,
      buyDate: new Date('2024-01-01'),
      goalId: testGoal.id,
      accountId: testAccount.id,
      notes: 'Test notes',
    };

    const createdInvestment = await prisma.investment.create({
      data: investmentData,
    });

    expect(createdInvestment).toBeDefined();
    expect(createdInvestment.id).toBeDefined();
    expect(createdInvestment.name).toBe('Test Stock');
    expect(createdInvestment.type).toBe(InvestmentType.STOCK);
    expect(createdInvestment.units).toBe(100);
    expect(createdInvestment.buyPrice).toBe(50);

    // READ
    const readInvestment = await prisma.investment.findUnique({
      where: { id: createdInvestment.id },
      include: {
        goal: true,
        account: true,
      },
    });

    expect(readInvestment).toBeDefined();
    expect(readInvestment?.name).toBe('Test Stock');
    expect(readInvestment?.goal.name).toBe('Test Goal');
    expect(readInvestment?.account.name).toBe('Test Account');

    // UPDATE
    const updatedInvestment = await prisma.investment.update({
      where: { id: createdInvestment.id },
      data: {
        name: 'Updated Stock',
        units: 200,
        notes: 'Updated notes',
      },
    });

    expect(updatedInvestment.name).toBe('Updated Stock');
    expect(updatedInvestment.units).toBe(200);
    expect(updatedInvestment.notes).toBe('Updated notes');

    // DELETE
    await prisma.investment.delete({
      where: { id: createdInvestment.id },
    });

    const deletedInvestment = await prisma.investment.findUnique({
      where: { id: createdInvestment.id },
    });

    expect(deletedInvestment).toBeNull();
  });

  it('should create, read, update, and delete a real estate investment', async () => {
    // CREATE
    const investmentData = {
      type: InvestmentType.REAL_ESTATE,
      name: 'Test Property',
      totalValue: 5000000,
      buyDate: new Date('2024-01-01'),
      goalId: testGoal.id,
      accountId: testAccount.id,
    };

    const createdInvestment = await prisma.investment.create({
      data: investmentData,
    });

    expect(createdInvestment).toBeDefined();
    expect(createdInvestment.id).toBeDefined();
    expect(createdInvestment.name).toBe('Test Property');
    expect(createdInvestment.type).toBe(InvestmentType.REAL_ESTATE);
    expect(createdInvestment.totalValue).toBe(5000000);

    // READ
    const readInvestment = await prisma.investment.findUnique({
      where: { id: createdInvestment.id },
    });

    expect(readInvestment).toBeDefined();
    expect(readInvestment?.name).toBe('Test Property');
    expect(readInvestment?.totalValue).toBe(5000000);

    // UPDATE
    const updatedInvestment = await prisma.investment.update({
      where: { id: createdInvestment.id },
      data: {
        name: 'Updated Property',
        totalValue: 5500000,
      },
    });

    expect(updatedInvestment.name).toBe('Updated Property');
    expect(updatedInvestment.totalValue).toBe(5500000);

    // DELETE
    await prisma.investment.delete({
      where: { id: createdInvestment.id },
    });

    const deletedInvestment = await prisma.investment.findUnique({
      where: { id: createdInvestment.id },
    });

    expect(deletedInvestment).toBeNull();
  });

  it('should fetch all investments with related data', async () => {
    // Create multiple investments
    await prisma.investment.createMany({
      data: [
        {
          type: InvestmentType.STOCK,
          name: 'Stock 1',
          symbol: 'STOCK1',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
        {
          type: InvestmentType.MUTUAL_FUND,
          name: 'Fund 1',
          symbol: 'FUND1',
          units: 200,
          buyPrice: 25,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
        {
          type: InvestmentType.REAL_ESTATE,
          name: 'Property 1',
          totalValue: 5000000,
          buyDate: new Date('2024-01-01'),
          goalId: testGoal.id,
          accountId: testAccount.id,
        },
      ],
    });

    // Fetch all investments
    const investments = await prisma.investment.findMany({
      include: {
        goal: true,
        account: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(investments).toHaveLength(3);
    
    // Check if all investment types are present
    const types = investments.map(inv => inv.type);
    expect(types).toContain(InvestmentType.STOCK);
    expect(types).toContain(InvestmentType.MUTUAL_FUND);
    expect(types).toContain(InvestmentType.REAL_ESTATE);
    
    // Check if related data is included
    investments.forEach(inv => {
      expect(inv.goal).toBeDefined();
      expect(inv.goal.name).toBe('Test Goal');
      expect(inv.account).toBeDefined();
      expect(inv.account.name).toBe('Test Account');
    });
  });
});