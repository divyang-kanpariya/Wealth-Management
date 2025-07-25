import { InvestmentType, AccountType } from '@prisma/client'

export { InvestmentType, AccountType }

export interface Investment {
  id: string
  type: InvestmentType
  name: string
  symbol?: string
  units?: number
  buyPrice?: number
  quantity?: number
  totalValue?: number
  buyDate: Date
  goalId?: string
  accountId: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  goal?: Goal
  account?: Account
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  targetDate: Date
  priority?: number
  description?: string
  createdAt: Date
  updatedAt: Date
  investments?: Investment[]
}

export interface Account {
  id: string
  name: string
  type: AccountType
  notes?: string
  createdAt: Date
  updatedAt: Date
  investments?: Investment[]
}

export interface PriceCache {
  id: string
  symbol: string
  price: number
  lastUpdated: Date
  source: string
}

export interface InvestmentWithCurrentValue {
  investment: Investment
  currentPrice?: number
  currentValue: number
  gainLoss: number
  gainLossPercentage: number
}

export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercentage: number
  assetAllocation: Record<string, { value: number; percentage: number }>
  accountDistribution: Record<string, { value: number; percentage: number }>
}

export interface GoalProgress {
  id: string
  name: string
  targetAmount: number
  currentValue: number
  progress: number
  remainingAmount: number
  targetDate: Date
}

export interface DashboardSummary {
  portfolioSummary: PortfolioSummary
  goalProgress: GoalProgress[]
  totalInvestments: number
  totalGoals: number
}

export interface PriceResponse {
  symbol: string
  price: number
  source: string
  cached: boolean
  lastUpdated: Date
  warning?: string
}