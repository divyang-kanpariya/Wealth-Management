import { InvestmentType, AccountType, SIPStatus, SIPFrequency } from '@prisma/client'

export { InvestmentType, AccountType, SIPStatus, SIPFrequency }

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

// Advanced portfolio features types
export interface InvestmentFilters {
  search?: string
  type?: InvestmentType | 'ALL'
  goalId?: string | 'ALL'
  accountId?: string | 'ALL'
  dateRange?: {
    start?: Date
    end?: Date
  }
  valueRange?: {
    min?: number
    max?: number
  }
}

export interface InvestmentSortOptions {
  field: 'name' | 'currentValue' | 'gainLoss' | 'gainLossPercentage' | 'buyDate' | 'type'
  direction: 'asc' | 'desc'
}

export interface BulkOperationResult {
  success: number
  failed: number
  errors: string[]
}

export interface ExportOptions {
  format: 'csv' | 'json'
  includeCurrentPrices: boolean
  dateRange?: {
    start?: Date
    end?: Date
  }
}

// Import functionality types
export interface ImportValidationError {
  row: number
  field: string
  message: string
  value?: any
}

export interface ImportPreviewRow {
  row: number
  data: Partial<Investment>
  errors: ImportValidationError[]
  isValid: boolean
}

export interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  rows: ImportPreviewRow[]
  columnMapping: Record<string, string>
}

export interface ImportResult {
  success: number
  failed: number
  errors: ImportValidationError[]
  importId: string
}

export interface ImportHistory {
  id: string
  filename: string
  totalRows: number
  successRows: number
  failedRows: number
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL'
  createdAt: Date
  errors?: ImportValidationError[]
}

export interface ColumnMapping {
  csvColumn: string
  investmentField: string
  required: boolean
  dataType: 'string' | 'number' | 'date' | 'enum'
  enumValues?: string[]
}

// SIP (Systematic Investment Plan) types
export interface SIP {
  id: string
  name: string
  symbol: string
  amount: number
  frequency: SIPFrequency
  startDate: Date
  endDate?: Date
  status: SIPStatus
  goalId?: string
  accountId: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  goal?: Goal
  account?: Account
  transactions?: SIPTransaction[]
}

export interface SIPTransaction {
  id: string
  sipId: string
  amount: number
  nav: number
  units: number
  transactionDate: Date
  status: string
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
  sip?: SIP
}

export interface SIPWithCurrentValue {
  sip: SIP
  totalInvested: number
  totalUnits: number
  currentValue: number
  averageNAV: number
  gainLoss: number
  gainLossPercentage: number
  nextTransactionDate?: Date
}

export interface SIPSummary {
  totalSIPs: number
  activeSIPs: number
  totalMonthlyAmount: number
  totalInvested: number
  totalCurrentValue: number
  totalGainLoss: number
  totalGainLossPercentage: number
}