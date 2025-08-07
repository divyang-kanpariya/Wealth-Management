import { prisma } from '@/lib/prisma'

export interface QueryMetrics {
  query: string
  duration: number
  timestamp: Date
  resultCount?: number
  error?: string
}

export class DatabaseQueryOptimizer {
  private queryMetrics: QueryMetrics[] = []
  private readonly maxMetricsHistory = 1000

  // Optimized queries with proper indexing hints and selective fields
  async getOptimizedInvestments(options: {
    includeGoal?: boolean
    includeAccount?: boolean
    goalId?: string
    accountId?: string
    limit?: number
  } = {}) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.investment.findMany({
        where: {
          ...(options.goalId && { goalId: options.goalId }),
          ...(options.accountId && { accountId: options.accountId })
        },
        select: {
          id: true,
          name: true,
          type: true,
          symbol: true,
          units: true,
          buyPrice: true,
          totalValue: true,
          buyDate: true,
          goalId: true,
          accountId: true,
          notes: true,
          ...(options.includeGoal && {
            goal: {
              select: {
                id: true,
                name: true,
                targetAmount: true,
                targetDate: true,
                priority: true,
                description: true
              }
            }
          }),
          ...(options.includeAccount && {
            account: {
              select: {
                id: true,
                name: true,
                type: true,
                notes: true
              }
            }
          })
        },
        ...(options.limit && { take: options.limit }),
        orderBy: {
          buyDate: 'desc'
        }
      })

      this.recordMetrics('getOptimizedInvestments', startTime, result.length)
      return result
      
    } catch (error) {
      this.recordMetrics('getOptimizedInvestments', startTime, 0, error)
      throw error
    }
  }

  async getOptimizedGoals(options: {
    includeInvestments?: boolean
    includeProgress?: boolean
    limit?: number
  } = {}) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.goal.findMany({
        select: {
          id: true,
          name: true,
          targetAmount: true,
          targetDate: true,
          priority: true,
          description: true,
          ...(options.includeInvestments && {
            investments: {
              select: {
                id: true,
                name: true,
                type: true,
                symbol: true,
                units: true,
                buyPrice: true,
                totalValue: true,
                buyDate: true
              }
            }
          }),
          ...(options.includeProgress && {
            _count: {
              select: {
                investments: true
              }
            }
          })
        },
        ...(options.limit && { take: options.limit }),
        orderBy: {
          targetDate: 'asc'
        }
      })

      this.recordMetrics('getOptimizedGoals', startTime, result.length)
      return result
      
    } catch (error) {
      this.recordMetrics('getOptimizedGoals', startTime, 0, error)
      throw error
    }
  }

  async getOptimizedSIPs(options: {
    includeTransactions?: boolean
    includeGoal?: boolean
    includeAccount?: boolean
    status?: string
    limit?: number
    transactionLimit?: number
  } = {}) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.sIP.findMany({
        where: {
          ...(options.status && { status: options.status as any })
        },
        select: {
          id: true,
          name: true,
          symbol: true,
          amount: true,
          frequency: true,
          startDate: true,
          endDate: true,
          status: true,
          goalId: true,
          accountId: true,
          notes: true,
          ...(options.includeGoal && {
            goal: {
              select: {
                id: true,
                name: true,
                targetAmount: true,
                targetDate: true,
                priority: true,
                description: true
              }
            }
          }),
          ...(options.includeAccount && {
            account: {
              select: {
                id: true,
                name: true,
                type: true,
                notes: true
              }
            }
          }),
          ...(options.includeTransactions && {
            transactions: {
              select: {
                id: true,
                amount: true,
                transactionDate: true,
                status: true,
                errorMessage: true
              },
              orderBy: {
                transactionDate: 'desc'
              },
              ...(options.transactionLimit && { take: options.transactionLimit })
            }
          })
        },
        ...(options.limit && { take: options.limit }),
        orderBy: {
          startDate: 'desc'
        }
      })

      this.recordMetrics('getOptimizedSIPs', startTime, result.length)
      return result
      
    } catch (error) {
      this.recordMetrics('getOptimizedSIPs', startTime, 0, error)
      throw error
    }
  }

  async getOptimizedAccounts(options: {
    includeCounts?: boolean
    includeInvestments?: boolean
    includeSIPs?: boolean
    limit?: number
  } = {}) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.account.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          notes: true,
          ...(options.includeCounts && {
            _count: {
              select: {
                investments: true,
                sips: true
              }
            }
          }),
          ...(options.includeInvestments && {
            investments: {
              select: {
                id: true,
                name: true,
                type: true,
                totalValue: true,
                buyDate: true
              },
              orderBy: {
                buyDate: 'desc'
              }
            }
          }),
          ...(options.includeSIPs && {
            sips: {
              select: {
                id: true,
                name: true,
                amount: true,
                status: true,
                startDate: true
              },
              orderBy: {
                startDate: 'desc'
              }
            }
          })
        },
        ...(options.limit && { take: options.limit }),
        orderBy: {
          name: 'asc'
        }
      })

      this.recordMetrics('getOptimizedAccounts', startTime, result.length)
      return result
      
    } catch (error) {
      this.recordMetrics('getOptimizedAccounts', startTime, 0, error)
      throw error
    }
  }

  // Optimized single record queries
  async getInvestmentById(id: string) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.investment.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          type: true,
          symbol: true,
          units: true,
          buyPrice: true,
          totalValue: true,
          buyDate: true,
          goalId: true,
          accountId: true,
          notes: true,
          goal: {
            select: {
              id: true,
              name: true,
              targetAmount: true,
              targetDate: true,
              priority: true,
              description: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              notes: true
            }
          }
        }
      })

      this.recordMetrics('getInvestmentById', startTime, result ? 1 : 0)
      return result
      
    } catch (error) {
      this.recordMetrics('getInvestmentById', startTime, 0, error)
      throw error
    }
  }

  async getGoalById(id: string) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.goal.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          targetAmount: true,
          targetDate: true,
          priority: true,
          description: true,
          investments: {
            select: {
              id: true,
              name: true,
              type: true,
              symbol: true,
              units: true,
              buyPrice: true,
              totalValue: true,
              buyDate: true,
              notes: true,
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: {
              buyDate: 'desc'
            }
          }
        }
      })

      this.recordMetrics('getGoalById', startTime, result ? 1 : 0)
      return result
      
    } catch (error) {
      this.recordMetrics('getGoalById', startTime, 0, error)
      throw error
    }
  }

  async getSIPById(id: string) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.sIP.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          symbol: true,
          amount: true,
          frequency: true,
          startDate: true,
          endDate: true,
          status: true,
          goalId: true,
          accountId: true,
          notes: true,
          goal: {
            select: {
              id: true,
              name: true,
              targetAmount: true,
              targetDate: true,
              priority: true,
              description: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              notes: true
            }
          },
          transactions: {
            select: {
              id: true,
              amount: true,
              transactionDate: true,
              status: true,
              errorMessage: true
            },
            orderBy: {
              transactionDate: 'desc'
            },
            take: 50 // Limit recent transactions
          }
        }
      })

      this.recordMetrics('getSIPById', startTime, result ? 1 : 0)
      return result
      
    } catch (error) {
      this.recordMetrics('getSIPById', startTime, 0, error)
      throw error
    }
  }

  async getAccountById(id: string) {
    const startTime = performance.now()
    
    try {
      const result = await prisma.account.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          type: true,
          notes: true,
          investments: {
            select: {
              id: true,
              name: true,
              type: true,
              symbol: true,
              units: true,
              buyPrice: true,
              totalValue: true,
              buyDate: true,
              goal: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              buyDate: 'desc'
            }
          },
          sips: {
            select: {
              id: true,
              name: true,
              symbol: true,
              amount: true,
              frequency: true,
              status: true,
              startDate: true,
              goal: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              startDate: 'desc'
            }
          }
        }
      })

      this.recordMetrics('getAccountById', startTime, result ? 1 : 0)
      return result
      
    } catch (error) {
      this.recordMetrics('getAccountById', startTime, 0, error)
      throw error
    }
  }

  // Performance monitoring methods
  private recordMetrics(query: string, startTime: number, resultCount: number, error?: any) {
    const duration = performance.now() - startTime
    
    const metric: QueryMetrics = {
      query,
      duration,
      timestamp: new Date(),
      resultCount,
      ...(error && { error: error.message || String(error) })
    }

    this.queryMetrics.push(metric)
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Log slow queries
    if (duration > 1000) {
      console.warn(`[QueryOptimizer] Slow query: ${query} took ${duration.toFixed(2)}ms`)
    }

    // Log errors
    if (error) {
      console.error(`[QueryOptimizer] Query error: ${query} failed after ${duration.toFixed(2)}ms:`, error)
    }
  }

  getQueryMetrics(): QueryMetrics[] {
    return [...this.queryMetrics]
  }

  getSlowQueries(threshold: number = 1000): QueryMetrics[] {
    return this.queryMetrics.filter(metric => metric.duration > threshold)
  }

  getAverageQueryTime(query?: string): number {
    const relevantMetrics = query 
      ? this.queryMetrics.filter(m => m.query === query)
      : this.queryMetrics

    if (relevantMetrics.length === 0) return 0

    const totalTime = relevantMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return totalTime / relevantMetrics.length
  }

  clearMetrics(): void {
    this.queryMetrics = []
  }
}

// Global instance
export const queryOptimizer = new DatabaseQueryOptimizer()