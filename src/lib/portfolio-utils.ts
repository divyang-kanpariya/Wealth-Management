import { 
  Investment, 
  InvestmentWithCurrentValue, 
  InvestmentFilters, 
  InvestmentSortOptions,
  ExportOptions 
} from '@/types'

/**
 * Filter investments based on provided criteria
 */
export function filterInvestments(
  investments: InvestmentWithCurrentValue[],
  filters: InvestmentFilters
): InvestmentWithCurrentValue[] {
  return investments.filter(({ investment }) => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesName = investment.name.toLowerCase().includes(searchTerm)
      const matchesSymbol = investment.symbol?.toLowerCase().includes(searchTerm)
      const matchesNotes = investment.notes?.toLowerCase().includes(searchTerm)
      
      if (!matchesName && !matchesSymbol && !matchesNotes) {
        return false
      }
    }

    // Type filter
    if (filters.type && filters.type !== 'ALL') {
      if (investment.type !== filters.type) {
        return false
      }
    }

    // Goal filter
    if (filters.goalId && filters.goalId !== 'ALL') {
      if (investment.goalId !== filters.goalId) {
        return false
      }
    }

    // Account filter
    if (filters.accountId && filters.accountId !== 'ALL') {
      if (investment.accountId !== filters.accountId) {
        return false
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const buyDate = new Date(investment.buyDate)
      
      if (filters.dateRange.start && buyDate < filters.dateRange.start) {
        return false
      }
      
      if (filters.dateRange.end && buyDate > filters.dateRange.end) {
        return false
      }
    }

    return true
  }).filter(({ currentValue }) => {
    // Value range filter (applied separately as it uses calculated values)
    if (filters.valueRange) {
      if (filters.valueRange.min && currentValue < filters.valueRange.min) {
        return false
      }
      
      if (filters.valueRange.max && currentValue > filters.valueRange.max) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort investments based on provided options
 */
export function sortInvestments(
  investments: InvestmentWithCurrentValue[],
  sortOptions: InvestmentSortOptions
): InvestmentWithCurrentValue[] {
  return [...investments].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortOptions.field) {
      case 'name':
        aValue = a.investment.name.toLowerCase()
        bValue = b.investment.name.toLowerCase()
        break
      case 'currentValue':
        aValue = a.currentValue
        bValue = b.currentValue
        break
      case 'gainLoss':
        aValue = a.gainLoss
        bValue = b.gainLoss
        break
      case 'gainLossPercentage':
        aValue = a.gainLossPercentage
        bValue = b.gainLossPercentage
        break
      case 'buyDate':
        aValue = new Date(a.investment.buyDate).getTime()
        bValue = new Date(b.investment.buyDate).getTime()
        break
      case 'type':
        aValue = a.investment.type
        bValue = b.investment.type
        break
      default:
        return 0
    }

    let comparison = 0
    if (aValue < bValue) {
      comparison = -1
    } else if (aValue > bValue) {
      comparison = 1
    }

    return sortOptions.direction === 'desc' ? -comparison : comparison
  })
}

/**
 * Export investments to CSV format
 */
export function exportToCSV(
  investments: InvestmentWithCurrentValue[],
  options: ExportOptions
): string {
  const headers = [
    'Name',
    'Type',
    'Symbol',
    'Units',
    'Buy Price',
    'Total Value',
    'Buy Date',
    'Goal',
    'Account',
    'Notes'
  ]

  if (options.includeCurrentPrices) {
    headers.push('Current Price', 'Current Value', 'Gain/Loss', 'Gain/Loss %')
  }

  const csvRows = [headers.join(',')]

  investments.forEach(({ investment, currentPrice, currentValue, gainLoss, gainLossPercentage }) => {
    const row = [
      `"${investment.name}"`,
      investment.type,
      investment.symbol || '',
      investment.units || '',
      investment.buyPrice || '',
      investment.totalValue || '',
      new Date(investment.buyDate).toLocaleDateString(),
      `"${investment.goal?.name || ''}"`,
      `"${investment.account?.name || ''}"`,
      `"${investment.notes || ''}"`
    ]

    if (options.includeCurrentPrices) {
      row.push(
        currentPrice?.toString() || '',
        currentValue.toString(),
        gainLoss.toString(),
        `${gainLossPercentage.toFixed(2)}%`
      )
    }

    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}

/**
 * Export investments to JSON format
 */
export function exportToJSON(
  investments: InvestmentWithCurrentValue[],
  options: ExportOptions
): string {
  const exportData = investments.map(({ investment, currentPrice, currentValue, gainLoss, gainLossPercentage }) => {
    const data: any = {
      id: investment.id,
      name: investment.name,
      type: investment.type,
      symbol: investment.symbol,
      units: investment.units,
      buyPrice: investment.buyPrice,
      totalValue: investment.totalValue,
      buyDate: investment.buyDate,
      goal: investment.goal?.name,
      account: investment.account?.name,
      notes: investment.notes
    }

    if (options.includeCurrentPrices) {
      data.currentPrice = currentPrice
      data.currentValue = currentValue
      data.gainLoss = gainLoss
      data.gainLossPercentage = gainLossPercentage
    }

    return data
  })

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    totalInvestments: investments.length,
    investments: exportData
  }, null, 2)
}

/**
 * Generate filename for export
 */
export function generateExportFilename(format: 'csv' | 'json'): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return `portfolio-export-${timestamp}.${format}`
}

/**
 * Download file in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}