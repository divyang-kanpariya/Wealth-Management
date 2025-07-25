import { z } from 'zod'
import { InvestmentType, AccountType } from '@prisma/client'

export const investmentSchema = z.object({
  type: z.nativeEnum(InvestmentType),
  name: z.string().min(1, 'Investment name is required'),
  symbol: z.string().optional(),
  units: z.number().positive().optional(),
  buyPrice: z.number().positive().optional(),
  totalValue: z.number().positive().optional(),
  buyDate: z.coerce.date(),
  goalId: z.string().optional().nullable(),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
}).refine((data) => {
  // For unit-based investments, require units and buyPrice
  if (['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(data.type)) {
    return data.units && data.buyPrice
  }
  // For total value investments, require totalValue
  if (['REAL_ESTATE', 'JEWELRY', 'GOLD', 'FD', 'OTHER'].includes(data.type)) {
    return data.totalValue
  }
  return true
}, {
  message: 'Invalid investment data for the selected type',
})

export const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.coerce.date(),
  priority: z.number().int().min(1).max(5).optional().default(1),
  description: z.string().optional(),
})

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.nativeEnum(AccountType),
  notes: z.string().optional(),
})

export const updateInvestmentSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(InvestmentType).optional(),
  name: z.string().min(1).optional(),
  symbol: z.string().optional(),
  units: z.number().positive().optional(),
  buyPrice: z.number().positive().optional(),
  totalValue: z.number().positive().optional(),
  buyDate: z.coerce.date().optional(),
  goalId: z.string().optional().nullable(),
  accountId: z.string().min(1).optional(),
  notes: z.string().optional(),
})

export const updateGoalSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.coerce.date().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  description: z.string().optional(),
})

export const updateAccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AccountType).optional(),
  notes: z.string().optional(),
})

// Validation helper functions
export function validateInvestment(data: unknown) {
  return investmentSchema.parse(data)
}

export function validateGoal(data: unknown) {
  return goalSchema.parse(data)
}

export function validateAccount(data: unknown) {
  return accountSchema.parse(data)
}

export function validateUpdateInvestment(data: unknown) {
  return updateInvestmentSchema.parse(data)
}

export function validateUpdateGoal(data: unknown) {
  return updateGoalSchema.parse(data)
}

export function validateUpdateAccount(data: unknown) {
  return updateAccountSchema.parse(data)
}