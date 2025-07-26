import React, { useState } from 'react'
import { InvestmentWithCurrentValue, ExportOptions } from '@/types'
import { exportToCSV, exportToJSON, generateExportFilename, downloadFile } from '@/lib/portfolio-utils'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import Input from '../ui/Input'

interface ExportPortfolioProps {
  investments: InvestmentWithCurrentValue[]
  isOpen: boolean
  onClose: () => void
}

const ExportPortfolio: React.FC<ExportPortfolioProps> = ({
  investments,
  isOpen,
  onClose
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeCurrentPrices: true,
    dateRange: undefined
  })
  const [isExporting, setIsExporting] = useState(false)

  const formatOptions = [
    { value: 'csv', label: 'CSV (Excel Compatible)' },
    { value: 'json', label: 'JSON (Data Format)' }
  ]

  const handleExport = async () => {
    try {
      setIsExporting(true)

      // Filter investments by date range if specified
      let filteredInvestments = investments
      if (exportOptions.dateRange) {
        filteredInvestments = investments.filter(({ investment }) => {
          const buyDate = new Date(investment.buyDate)
          
          if (exportOptions.dateRange!.start && buyDate < exportOptions.dateRange!.start) {
            return false
          }
          
          if (exportOptions.dateRange!.end && buyDate > exportOptions.dateRange!.end) {
            return false
          }
          
          return true
        })
      }

      let content: string
      let mimeType: string

      if (exportOptions.format === 'csv') {
        content = exportToCSV(filteredInvestments, exportOptions)
        mimeType = 'text/csv'
      } else {
        content = exportToJSON(filteredInvestments, exportOptions)
        mimeType = 'application/json'
      }

      const filename = generateExportFilename(exportOptions.format)
      downloadFile(content, filename, mimeType)

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      // You might want to show an error message here
    } finally {
      setIsExporting(false)
    }
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const dateRange = exportOptions.dateRange || {}
    const newDateRange = {
      ...dateRange,
      [field]: value ? new Date(value) : undefined
    }
    
    // Remove empty date range
    if (!newDateRange.start && !newDateRange.end) {
      setExportOptions({
        ...exportOptions,
        dateRange: undefined
      })
    } else {
      setExportOptions({
        ...exportOptions,
        dateRange: newDateRange
      })
    }
  }

  const filteredCount = exportOptions.dateRange ? 
    investments.filter(({ investment }) => {
      const buyDate = new Date(investment.buyDate)
      
      if (exportOptions.dateRange!.start && buyDate < exportOptions.dateRange!.start) {
        return false
      }
      
      if (exportOptions.dateRange!.end && buyDate > exportOptions.dateRange!.end) {
        return false
      }
      
      return true
    }).length : investments.length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Portfolio"
      size="md"
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-600 mb-4">
            Export your investment portfolio data for analysis or backup purposes.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {filteredCount} of {investments.length} investments will be exported
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Select
            label="Export Format"
            value={exportOptions.format}
            onChange={(e) => setExportOptions({
              ...exportOptions,
              format: e.target.value as 'csv' | 'json'
            })}
            options={formatOptions}
          />

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exportOptions.includeCurrentPrices}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  includeCurrentPrices: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Include current prices and calculations
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Includes current value, gain/loss amounts and percentages
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range Filter (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="From date"
                value={exportOptions.dateRange?.start ? 
                  exportOptions.dateRange.start.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
              <Input
                type="date"
                placeholder="To date"
                value={exportOptions.dateRange?.end ? 
                  exportOptions.dateRange.end.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Filter investments by purchase date
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredCount === 0}
          >
            {isExporting ? 'Exporting...' : `Export ${filteredCount} Investments`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ExportPortfolio