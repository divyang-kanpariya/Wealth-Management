import React from 'react'
import { TrendChart } from '@/components/charts'

interface TrendDataPoint {
  date: string
  value: number
  label: string
}

interface RealGoalProgressTrendChartProps {
  data: TrendDataPoint[]
  className?: string
  height?: string
}

export default function RealGoalProgressTrendChart({
  data,
  className,
  height = '300px'
}: RealGoalProgressTrendChartProps) {
  return (
    <TrendChart
      data={data}
      title="Goal Progress Trend"
      height={height}
      color="#F59E0B"
      currency={false}
      fillArea={true}
      className={className}
    />
  )
}