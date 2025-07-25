import { describe, it, expect } from 'vitest'
import {
  calculateGoalCurrentValue,
  getUnlinkedInvestments,
  getInvestmentsByGoal,
  calculateDetailedGoalProgress,
  sortGoalsByPriority,
  getUpcomingGoals,
  getOverdueGoals,
  formatTimeRemaining,
  validateGoalData,
} from '../../lib/goal-utils';
import { Goal, Investment, InvestmentWithCurrentValue } from '../../types';

describe('Goal Utilities', () => {
  const mockGoal: Goal = {
    id: 'goal-1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2040-01-01'),
    priority: 1,
    description: 'Save for retirement',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvestments: Investment[] = [
    {
      id: 'inv-1',
      name: 'Stock A',
      type: 'STOCK',
      units: 100,
      buyPrice: 50,
      buyDate: new Date(),
      goalId: 'goal-1',
      accountId: 'account-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'inv-2',
      name: 'Stock B',
      type: 'STOCK',
      units: 200,
      buyPrice: 25,
      buyDate: new Date(),
      goalId: undefined, // Unlinked investment
      accountId: 'account-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'inv-3',
      name: 'Real Estate',
      type: 'REAL_ESTATE',
      totalValue: 500000,
      buyDate: new Date(),
      goalId: 'goal-1',
      accountId: 'account-2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockInvestmentsWithValues: InvestmentWithCurrentValue[] = [
    {
      investment: mockInvestments[0],
      currentPrice: 60,
      currentValue: 6000, // 100 * 60
      gainLoss: 1000, // 6000 - 5000
      gainLossPercentage: 20, // (1000 / 5000) * 100
    },
    {
      investment: mockInvestments[1],
      currentPrice: 30,
      currentValue: 6000, // 200 * 30
      gainLoss: 1000, // 6000 - 5000
      gainLossPercentage: 20,
    },
    {
      investment: mockInvestments[2],
      currentValue: 500000,
      gainLoss: 0,
      gainLossPercentage: 0,
    },
  ];

  describe('calculateGoalCurrentValue', () => {
    it('calculates current value for investments linked to a goal', () => {
      const result = calculateGoalCurrentValue(mockGoal, mockInvestmentsWithValues);
      expect(result).toBe(506000); // 6000 + 500000 (only goal-1 investments)
    });

    it('returns 0 for goal with no linked investments', () => {
      const emptyGoal = { ...mockGoal, id: 'goal-empty' };
      const result = calculateGoalCurrentValue(emptyGoal, mockInvestmentsWithValues);
      expect(result).toBe(0);
    });
  });

  describe('getUnlinkedInvestments', () => {
    it('returns investments not linked to any goal', () => {
      const result = getUnlinkedInvestments(mockInvestments);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inv-2');
    });

    it('returns empty array when all investments are linked', () => {
      const linkedInvestments = mockInvestments.map(inv => ({ ...inv, goalId: 'goal-1' }));
      const result = getUnlinkedInvestments(linkedInvestments);
      expect(result).toHaveLength(0);
    });
  });

  describe('getInvestmentsByGoal', () => {
    it('returns investments linked to a specific goal', () => {
      const result = getInvestmentsByGoal(mockInvestments, 'goal-1');
      expect(result).toHaveLength(2);
      expect(result.map(inv => inv.id)).toEqual(['inv-1', 'inv-3']);
    });

    it('returns empty array for goal with no investments', () => {
      const result = getInvestmentsByGoal(mockInvestments, 'non-existent-goal');
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateDetailedGoalProgress', () => {
    it('calculates detailed progress metrics', () => {
      const result = calculateDetailedGoalProgress(mockGoal, mockInvestmentsWithValues);
      
      expect(result.id).toBe('goal-1');
      expect(result.name).toBe('Retirement');
      expect(result.targetAmount).toBe(1000000);
      expect(result.currentValue).toBe(506000);
      expect(result.investedValue).toBe(505000); // 5000 + 500000
      expect(result.progress).toBe(50.6); // (506000 / 1000000) * 100
      expect(result.remainingAmount).toBe(494000);
      expect(result.gainLoss).toBe(1000);
      expect(result.investmentCount).toBe(2);
    });

    it('caps progress at 100%', () => {
      const overAchievedGoal = { ...mockGoal, targetAmount: 100000 };
      const result = calculateDetailedGoalProgress(overAchievedGoal, mockInvestmentsWithValues);
      
      expect(result.progress).toBe(100);
    });
  });

  describe('sortGoalsByPriority', () => {
    const goals: Goal[] = [
      { ...mockGoal, id: 'goal-1', priority: 3, targetDate: new Date('2030-01-01') },
      { ...mockGoal, id: 'goal-2', priority: 1, targetDate: new Date('2035-01-01') },
      { ...mockGoal, id: 'goal-3', priority: 1, targetDate: new Date('2025-01-01') },
    ];

    it('sorts by priority first, then by target date', () => {
      const result = sortGoalsByPriority(goals);
      
      expect(result[0].id).toBe('goal-3'); // Priority 1, earliest date
      expect(result[1].id).toBe('goal-2'); // Priority 1, later date
      expect(result[2].id).toBe('goal-1'); // Priority 3
    });

    it('does not mutate original array', () => {
      const originalOrder = goals.map(g => g.id);
      sortGoalsByPriority(goals);
      expect(goals.map(g => g.id)).toEqual(originalOrder);
    });
  });

  describe('getUpcomingGoals', () => {
    const today = new Date();
    const goals: Goal[] = [
      { ...mockGoal, id: 'goal-1', targetDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }, // 30 days
      { ...mockGoal, id: 'goal-2', targetDate: new Date(today.getTime() + 400 * 24 * 60 * 60 * 1000) }, // 400 days
      { ...mockGoal, id: 'goal-3', targetDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) }, // Past
    ];

    it('returns goals within the threshold', () => {
      const result = getUpcomingGoals(goals, 365);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('goal-1');
    });

    it('excludes past goals', () => {
      const result = getUpcomingGoals(goals, 365);
      expect(result.find(g => g.id === 'goal-3')).toBeUndefined();
    });
  });

  describe('getOverdueGoals', () => {
    const today = new Date();
    const goals: Goal[] = [
      { ...mockGoal, id: 'goal-1', targetDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) }, // Past
      { ...mockGoal, id: 'goal-2', targetDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }, // Future
    ];

    it('returns only overdue goals', () => {
      const result = getOverdueGoals(goals);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('goal-1');
    });
  });

  describe('formatTimeRemaining', () => {
    const today = new Date();

    it('formats future dates correctly', () => {
      const futureDate = new Date(today.getTime() + 400 * 24 * 60 * 60 * 1000); // ~400 days
      const result = formatTimeRemaining(futureDate);
      
      expect(result.isOverdue).toBe(false);
      expect(result.text).toContain('year');
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('formats overdue dates correctly', () => {
      const pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const result = formatTimeRemaining(pastDate);
      
      expect(result.isOverdue).toBe(true);
      expect(result.text).toContain('overdue');
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it('handles due today', () => {
      const result = formatTimeRemaining(today);
      
      expect(result.isOverdue).toBe(false);
      expect(result.text).toBe('Due today');
      expect(Math.abs(result.daysRemaining)).toBe(0);
    });
  });

  describe('validateGoalData', () => {
    const validGoalData = {
      name: 'Test Goal',
      targetAmount: 10000,
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      priority: 1,
    };

    it('validates correct goal data', () => {
      const result = validateGoalData(validGoalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty name', () => {
      const result = validateGoalData({ ...validGoalData, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Goal name is required');
    });

    it('rejects negative target amount', () => {
      const result = validateGoalData({ ...validGoalData, targetAmount: -100 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target amount must be greater than 0');
    });

    it('rejects past target date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const result = validateGoalData({ ...validGoalData, targetDate: pastDate });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target date must be in the future');
    });

    it('rejects invalid priority', () => {
      const result = validateGoalData({ ...validGoalData, priority: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority must be between 1 and 5');
    });
  });
});