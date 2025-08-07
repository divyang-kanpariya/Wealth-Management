'use client'

import React, { useState } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { GoalProgress } from '@/types'
import ChartContainer from './ChartContainer'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface GoalProgressChartProps {
  goals: GoalProgress[]
  className?: string
  height?: string
}

export default function GoalProgressChart({
  goals,
  className,
  height = '400px'
}: GoalProgressChartProps) {
  const [chartType, setChartType] = useState<'timeline' | 'progress'>('timeline')

  // Ensure goals is always an array
  const safeGoals = Array.isArray(goals) ? goals : []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDaysRemaining = (targetDate: Date) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Generate timeline data showing goal progress over time
  const generateTimelineData = () => {
    if (safeGoals.length === 0) return { labels: [], datasets: [] }

    // Sort goals by target date
    const sortedGoals = [...safeGoals].sort((a, b) => 
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    )

    // Generate timeline for next 24 months
    const months: string[] = []
    const datasets: any[] = []
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
    ]

    for (let i = 0; i < 24; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)
      months.push(date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }))
    }

    sortedGoals.slice(0, 5).forEach((goal, index) => {
      const targetDate = new Date(goal.targetDate)
      const monthsToTarget = Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))
      
      // Generate projected progress data
      const progressData = months.map((_, monthIndex) => {
        if (monthIndex === 0) return goal.currentValue
        
        // Simple linear projection
        const progressRate = goal.currentValue / Math.max(1, monthsToTarget)
        const projectedValue = goal.currentValue + (progressRate * monthIndex)
        
        return Math.min(projectedValue, goal.targetAmount)
      })

      datasets.push({
        label: goal.name.length > 20 ? goal.name.substring(0, 20) + '...' : goal.name,
        data: progressData,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      })
    })

    return { labels: months, datasets }
  }

  // Generate progress doughnut data
  const generateProgressData = () => {
    if (safeGoals.length === 0) return { labels: [], datasets: [] }

    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
    ]

    return {
      labels: safeGoals.map(goal => goal.name.length > 15 
        ? goal.name.substring(0, 15) + '...' 
        : goal.name
      ),
      datasets: [
        {
          data: safeGoals.map(goal => Math.min(goal.progress, 100)),
          backgroundColor: colors.slice(0, safeGoals.length),
          borderColor: colors.slice(0, safeGoals.length).map(color => color + '80'),
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 4
        }
      ]
    }
  }

  const timelineData = generateTimelineData()
  const progressData = generateProgressData()

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value as number)
          },
          font: {
            size: 10
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  }

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 11
          },
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels && data.datasets.length > 0) {
              return data.labels.map((label, i) => {
                const progress = data.datasets[0].data[i] as number
                const goal = safeGoals[i]
                const backgroundColor = Array.isArray(data.datasets[0].backgroundColor) 
                  ? data.datasets[0].backgroundColor[i] as string
                  : data.datasets[0].backgroundColor as string
                const borderColor = Array.isArray(data.datasets[0].borderColor)
                  ? data.datasets[0].borderColor[i] as string
                  : data.datasets[0].borderColor as string
                return {
                  text: `${label} (${progress.toFixed(1)}%)`,
                  fillStyle: backgroundColor,
                  strokeStyle: borderColor,
                  lineWidth: 2,
                  hidden: false,
                  index: i
                }
              })
            }
            return []
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const goal = safeGoals[context.dataIndex]
            const progress = context.parsed
            return [
              `Progress: ${progress.toFixed(1)}%`,
              `Current: ${formatCurrency(goal.currentValue)}`,
              `Target: ${formatCurrency(goal.targetAmount)}`,
              `Remaining: ${formatCurrency(goal.remainingAmount)}`
            ]
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    cutout: '60%'
  }

  const actions = (
    <div className="flex space-x-1">
      <button
        onClick={() => setChartType('timeline')}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          chartType === 'timeline'
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Timeline
      </button>
      <button
        onClick={() => setChartType('progress')}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          chartType === 'progress'
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Progress
      </button>
    </div>
  )

  if (safeGoals.length === 0) {
    return (
      <ChartContainer
        title="Goal Progress Timeline"
        className={className}
        height={height}
        actions={actions}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-sm">No goals available</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title="Goal Progress Timeline"
      className={className}
      height={height}
      actions={actions}
    >
      {chartType === 'timeline' ? (
        <Line data={timelineData} options={lineOptions} />
      ) : (
        <Doughnut data={progressData} options={doughnutOptions} />
      )}
    </ChartContainer>
  )
}