'use server'

import { prisma } from '@/lib/prisma'
import { validateCsvImportRow } from '@/lib/validations'

export type ImportActionResult = {
  success: boolean
  error?: string
  data?: {
    importedCount: number
    failedCount: number
    errors?: string[]
  }
}

export type ImportPreviewResult = {
  success: boolean
  error?: string
  data?: {
    rows: Array<{
      rowIndex: number
      data: any
      isValid: boolean
      errors?: string[]
    }>
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

/**
 * Process CSV import file and return preview
 */
export async function previewCsvImport(formData: FormData): Promise<ImportPreviewResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      }
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'File is empty'
      }
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const dataLines = lines.slice(1)

    const rows = []
    let validRows = 0
    let invalidRows = 0

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      
      // Create object from headers and values
      const rowData: any = {}
      headers.forEach((header, index) => {
        rowData[header] = values[index] || ''
      })

      try {
        // Validate the row data
        validateCsvImportRow(rowData)
        rows.push({
          rowIndex: i + 2, // +2 because we skip header and arrays are 0-indexed
          data: rowData,
          isValid: true
        })
        validRows++
      } catch (error) {
        rows.push({
          rowIndex: i + 2,
          data: rowData,
          isValid: false,
          errors: error instanceof Error ? [error.message] : ['Validation failed']
        })
        invalidRows++
      }
    }

    return {
      success: true,
      data: {
        rows,
        totalRows: dataLines.length,
        validRows,
        invalidRows
      }
    }
  } catch (error) {
    console.error('Error previewing CSV import:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview CSV import'
    }
  }
}

/**
 * Confirm and process CSV import
 */
export async function confirmCsvImport(validRows: any[]): Promise<ImportActionResult> {
  try {
    let importedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const rowData of validRows) {
      try {
        // Find or create account
        let account = await prisma.account.findFirst({
          where: { name: rowData.accountName }
        })

        if (!account) {
          // Create account if it doesn't exist
          account = await prisma.account.create({
            data: {
              name: rowData.accountName,
              type: 'BROKER' // Default type, could be made configurable
            }
          })
        }

        // Find or create goal if specified
        let goalId = null
        if (rowData.goalName) {
          let goal = await prisma.goal.findFirst({
            where: { name: rowData.goalName }
          })

          if (!goal) {
            // Create goal if it doesn't exist
            goal = await prisma.goal.create({
              data: {
                name: rowData.goalName,
                targetAmount: 100000, // Default target, could be made configurable
                targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
              }
            })
          }
          goalId = goal.id
        }

        // Create investment
        await prisma.investment.create({
          data: {
            type: rowData.type,
            name: rowData.name,
            symbol: rowData.symbol,
            units: rowData.units,
            buyPrice: rowData.buyPrice,
            totalValue: rowData.totalValue,
            buyDate: rowData.buyDate,
            goalId,
            accountId: account.id,
            notes: rowData.notes
          }
        })

        importedCount++
      } catch (error) {
        failedCount++
        errors.push(`Row ${rowData.rowIndex || 'unknown'}: ${error instanceof Error ? error.message : 'Import failed'}`)
      }
    }

    // No cache invalidation needed - user data is always fetched fresh

    return {
      success: true,
      data: {
        importedCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  } catch (error) {
    console.error('Error confirming CSV import:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import CSV data'
    }
  }
}

/**
 * Get import history
 */
export async function getImportHistory(): Promise<ImportActionResult> {
  try {
    // This would typically fetch from an import_history table
    // For now, we'll return a placeholder
    return {
      success: true,
      data: {
        importedCount: 0,
        failedCount: 0
      }
    }
  } catch (error) {
    console.error('Error fetching import history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch import history'
    }
  }
}

/**
 * Delete import record
 */
export async function deleteImportRecord(importId: string): Promise<ImportActionResult> {
  try {
    // This would typically delete from an import_history table
    // For now, we'll return a placeholder
    return {
      success: true,
      data: {
        importedCount: 0,
        failedCount: 0
      }
    }
  } catch (error) {
    console.error('Error deleting import record:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete import record'
    }
  }
}