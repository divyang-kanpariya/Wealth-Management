import { Goal, Investment, InvestmentWithCurrentValue } from '@/types';
import { calculateInvestmentValue } from './calculations';

/**
 * Calculate the current value of investments linked to a specific goal
 */
export function calculateGoalCurrentValue(
  goal: Goal,
  investmentsWithValues: InvestmentWithCurrentValue[]
): number {
  const goalInvestments = investmentsWithValues.filter(
    item => item.investment.goalId === goal.id
  );
  
  return goalInvestments.reduce((sum, item) => sum + item.currentValue, 0);
}

/**
 * Get investments that are not linked to any goal
 */
export function getUnlinkedInvestments(
  investments: Investment[]
): Investment[] {
  return investments.filter(investment => !investment.goalId);
}

/**
 * Get investments linked to a specific goal
 */
export function getInvestmentsByGoal(
  investments: Investment[],
  goalId: string
): Investment[] {
  return investments.filter(investment => investment.goalId === goalId);
}

/**
 * Calculate goal progress with detailed metrics
 */
export function calculateDetailedGoalProgress(
  goal: Goal,
  investmentsWithValues: InvestmentWithCurrentValue[]
) {
  const goalInvestments = investmentsWithValues.filter(
    item => item.investment.goalId === goal.id
  );
  
  const currentValue = goalInvestments.reduce((sum, item) => sum + item.currentValue, 0);
  const investedValue = goalInvestments.reduce((sum, item) => {
    const invested = item.investment.units && item.investment.buyPrice 
      ? item.investment.units * item.investment.buyPrice
      : item.investment.totalValue || 0;
    return sum + invested;
  }, 0);
  
  const progress = goal.targetAmount > 0 ? (currentValue / goal.targetAmount) * 100 : 0;
  const remainingAmount = Math.max(0, goal.targetAmount - currentValue);
  const gainLoss = currentValue - investedValue;
  const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
  
  // Calculate time-related metrics
  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  
  // Calculate required monthly savings to reach goal
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
  const requiredMonthlySavings = remainingAmount / monthsRemaining;
  
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentValue,
    investedValue,
    progress: Math.min(100, Math.max(0, progress)),
    remainingAmount,
    gainLoss,
    gainLossPercentage,
    targetDate: goal.targetDate,
    daysRemaining,
    monthsRemaining,
    isOverdue,
    requiredMonthlySavings,
    investmentCount: goalInvestments.length,
    investments: goalInvestments,
  };
}

/**
 * Sort goals by priority and target date
 */
export function sortGoalsByPriority(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    // First sort by priority (1 = highest priority)
    const priorityDiff = (a.priority || 3) - (b.priority || 3);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by target date (earlier dates first)
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });
}

/**
 * Get goals that are approaching their target date
 */
export function getUpcomingGoals(
  goals: Goal[],
  daysThreshold: number = 365
): Goal[] {
  const today = new Date();
  const thresholdDate = new Date(today.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));
  
  return goals.filter(goal => {
    const targetDate = new Date(goal.targetDate);
    return targetDate <= thresholdDate && targetDate >= today;
  });
}

/**
 * Get overdue goals
 */
export function getOverdueGoals(goals: Goal[]): Goal[] {
  const today = new Date();
  
  return goals.filter(goal => {
    const targetDate = new Date(goal.targetDate);
    return targetDate < today;
  });
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(targetDate: string | Date): {
  text: string;
  isOverdue: boolean;
  daysRemaining: number;
} {
  const target = new Date(targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      text: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
      isOverdue: true,
      daysRemaining,
    };
  }
  
  if (daysRemaining === 0) {
    return {
      text: 'Due today',
      isOverdue: false,
      daysRemaining,
    };
  }
  
  const years = Math.floor(daysRemaining / 365);
  const months = Math.floor((daysRemaining % 365) / 30);
  const days = daysRemaining % 30;
  
  let text = '';
  if (years > 0) {
    text += `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (text) text += ', ';
    text += `${months} month${months > 1 ? 's' : ''}`;
  }
  if (days > 0 && years === 0) {
    if (text) text += ', ';
    text += `${days} day${days > 1 ? 's' : ''}`;
  }
  
  return {
    text: text || '0 days',
    isOverdue: false,
    daysRemaining,
  };
}

/**
 * Validate goal data before saving
 */
export function validateGoalData(goalData: {
  name: string;
  targetAmount: number;
  targetDate: string | Date;
  priority?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!goalData.name.trim()) {
    errors.push('Goal name is required');
  }
  
  if (goalData.targetAmount <= 0) {
    errors.push('Target amount must be greater than 0');
  }
  
  const targetDate = new Date(goalData.targetDate);
  const today = new Date();
  
  if (isNaN(targetDate.getTime())) {
    errors.push('Invalid target date');
  } else if (targetDate <= today) {
    errors.push('Target date must be in the future');
  }
  
  if (goalData.priority && (goalData.priority < 1 || goalData.priority > 5)) {
    errors.push('Priority must be between 1 and 5');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}