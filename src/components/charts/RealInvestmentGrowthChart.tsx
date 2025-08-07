import React from 'react'
import { TrendChart } from '@/components/charts'

interface TrendDataPoint {
  date: string
  value: number
  label: string
}

interface RealInvestmentGrowthChartProps {
  data: TrendDataPoint[]
  className?: string
  height?: string
}

export default function RealInvestmentGrowthChart({
  data,
  className,
  height = '300px'
}: RealInvestmentGrowthChartProps) {
  return (
    <TrendChart
      data={data}
      title="Investment Growth"
      height={height}
      color="#10B981"
      fillArea={false}
      className={className}
    />
  )
}