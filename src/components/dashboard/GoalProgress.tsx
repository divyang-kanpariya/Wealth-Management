'use client'

import React from 'react'
import { GoalProgress as GoalProgressType } from '@/types'
import Link from 'next/link'

interface GoalProgressProps {
  goals: GoalProgressType[]
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getDaysRemaining = (targetDate: Date) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getProgressBgColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-100'
    if (progress >= 75) return 'bg-blue-100'
    if (progress >= 50) return 'bg-yellow-100'
    if (progress >= 25) return 'bg-orange-100'
    return 'bg-red-100'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Goal Progress</h3>
        <Link 
          href="/goals" 
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View All Goals
        </Link>
      </div>
      
      {goals.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          <p>No goals found</p>
          <Link 
            href="/goals" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block"
          >
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.slice(0, 5).map((goal) => {
            const daysRemaining = getDaysRemaining(goal.targetDate)
            const progress = Math.min(goal.progress, 100)
            
            return (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{goal.name}</h4>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {progress.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {daysRemaining > 0 ? `${daysRemaining} days left` : 
                       daysRemaining === 0 ? 'Due today' : 
                       `${Math.abs(daysRemaining)} days overdue`}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className={`w-full ${getProgressBgColor(progress)} rounded-full h-2 mb-3`}>
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(progress)} transition-all duration-300`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">{formatCurrency(goal.currentValue)}</span>
                    <span className="text-gray-400"> of </span>
                    <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="text-gray-500">
                    Due: {formatDate(goal.targetDate)}
                  </div>
                </div>
                
                {goal.remainingAmount > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {formatCurrency(goal.remainingAmount)} remaining to reach goal
                  </div>
                )}
              </div>
            )
          })}
          
          {goals.length > 5 && (
            <div className="text-center pt-2">
              <Link 
                href="/goals" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View {goals.length - 5} more goals
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}