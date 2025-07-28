'use client'

import React from 'react'
import { GoalProgress as GoalProgressType } from '@/types'
import { CompactCard, CompactTable, CompactTableColumn, StatusIndicator, QuickActions, QuickAction } from '@/components/ui'
import Link from 'next/link'

interface CompactGoalProgressProps {
  goals: GoalProgressType[]
}

export default function CompactGoalProgress({ goals }: CompactGoalProgressProps) {
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressStatus = (progress: number, daysRemaining: number) => {
    if (progress >= 100) return 'success'
    if (daysRemaining < 0) return 'danger'
    if (daysRemaining < 30 && progress < 80) return 'warning'
    if (progress >= 75) return 'info'
    return 'neutral'
  }

  const getTimeStatus = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'Overdue'
    if (daysRemaining === 0) return 'Due today'
    if (daysRemaining < 30) return `${daysRemaining}d left`
    if (daysRemaining < 365) return `${Math.ceil(daysRemaining / 30)}m left`
    return `${Math.ceil(daysRemaining / 365)}y left`
  }

  const columns: CompactTableColumn<GoalProgressType>[] = [
    {
      key: 'name',
      title: 'Goal',
      width: '35%',
      render: (_, goal) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {goal.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            Target: {formatCurrency(goal.targetAmount)}
          </div>
        </div>
      )
    },
    {
      key: 'progress',
      title: 'Progress',
      width: '30%',
      render: (_, goal) => {
        const progress = Math.min(goal.progress, 100)
        const daysRemaining = getDaysRemaining(goal.targetDate)
        
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {progress.toFixed(1)}%
              </span>
              <StatusIndicator
                status={getProgressStatus(progress, daysRemaining)}
                variant="dot"
                size="sm"
              />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  progress >= 100 ? 'bg-green-500' :
                  progress >= 75 ? 'bg-blue-500' :
                  progress >= 50 ? 'bg-yellow-500' :
                  progress >= 25 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'current',
      title: 'Current',
      align: 'right',
      width: '20%',
      render: (_, goal) => (
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency(goal.currentValue)}
          </div>
          <div className="text-xs text-gray-500">
            {goal.remainingAmount > 0 && `${formatCurrency(goal.remainingAmount)} left`}
          </div>
        </div>
      )
    },
    {
      key: 'timeline',
      title: 'Timeline',
      align: 'center',
      width: '15%',
      render: (_, goal) => {
        const daysRemaining = getDaysRemaining(goal.targetDate)
        const status = daysRemaining < 0 ? 'danger' : 
                      daysRemaining < 30 ? 'warning' : 'neutral'
        
        return (
          <StatusIndicator
            status={status}
            label={getTimeStatus(daysRemaining)}
            variant="badge"
            size="sm"
          />
        )
      }
    }
  ]

  const quickActions: QuickAction[] = [
    {
      id: 'view-all',
      label: 'View All',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => window.location.href = '/goals',
      variant: 'secondary'
    },
    {
      id: 'add-goal',
      label: 'Add Goal',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => window.location.href = '/goals',
      variant: 'primary'
    }
  ]

  if (goals.length === 0) {
    return (
      <CompactCard
        title="Goal Progress"
        badge={0}
        variant="default"
        className="mb-4"
        actions={
          <QuickActions
            actions={quickActions}
            size="sm"
            layout="horizontal"
          />
        }
      >
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-3">No financial goals set</p>
          <Link 
            href="/goals" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Create your first goal →
          </Link>
        </div>
      </CompactCard>
    )
  }

  return (
    <CompactCard
      title="Goal Progress"
      badge={goals.length}
      variant="default"
      className="mb-4"
      collapsible
      actions={
        <QuickActions
          actions={quickActions}
          size="sm"
          layout="horizontal"
        />
      }
    >
      <CompactTable
        data={goals.slice(0, 5)}
        columns={columns}
        rowKey={(goal) => goal.id}
        variant="minimal"
        showHeader={false}
        maxHeight="300px"
        emptyMessage="No goals found"
      />
      
      {goals.length > 5 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
          <Link 
            href="/goals" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View {goals.length - 5} more goals →
          </Link>
        </div>
      )}
    </CompactCard>
  )
}