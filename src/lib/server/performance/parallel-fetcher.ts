import { prisma } from '@/lib/prisma'

export interface FetchResult<T> {
  data: T
  duration: number
  error?: Error
}

export interface ParallelFetchOptions {
  timeout?: number
  retries?: number
  concurrency?: number
}

export class ParallelDataFetcher {
  private readonly defaultTimeout = 10000 // 10 seconds
  private readonly defaultRetries = 2
  private readonly defaultConcurrency = 5

  async fetchInParallel<T extends Record<string, any>>(
    fetchFunctions: Record<keyof T, () => Promise<T[keyof T]>>,
    options: ParallelFetchOptions = {}
  ): Promise<Record<keyof T, FetchResult<T[keyof T]>>> {
    const { timeout = this.defaultTimeout, retries = this.defaultRetries } = options
    
    const results: Record<keyof T, FetchResult<T[keyof T]>> = {} as any
    
    // Create promises for all fetch operations
    const fetchPromises = Object.entries(fetchFunctions).map(async ([key, fetchFn]) => {
      const startTime = performance.now()
      let lastError: Error | undefined
      
      // Retry logic
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
          })
          
          const data = await Promise.race([
            (fetchFn as () => Promise<any>)(),
            timeoutPromise
          ])
          
          const duration = performance.now() - startTime
          results[key as keyof T] = { data, duration }
          return
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          
          if (attempt < retries) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
      
      // All retries failed
      const duration = performance.now() - startTime
      results[key as keyof T] = { 
        data: null as any, 
        duration, 
        error: lastError || new Error('Unknown error')
      }
    })
    
    // Wait for all operations to complete
    await Promise.all(fetchPromises)
    
    return results
  }

  // Optimized database queries with parallel execution
  async fetchDashboardData() {
    return this.fetchInParallel({
      investments: () => prisma.investment.findMany({
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
      }),
      
      goals: () => prisma.goal.findMany({
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
              buyDate: true
            }
          }
        }
      }),
      
      sips: () => prisma.sIP.findMany({
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
            }
          }
        }
      }),
      
      accounts: () => prisma.account.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          notes: true,
          _count: {
            select: {
              investments: true,
              sips: true
            }
          }
        }
      })
    })
  }

  async fetchChartsData() {
    return this.fetchInParallel({
      portfolioHistory: () => this.fetchPortfolioHistory(),
      goalHistory: () => this.fetchGoalHistory(),
      priceHistory: () => this.fetchPriceHistory()
    })
  }

  private async fetchPortfolioHistory() {
    try {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()) // 12 months
      
      return await prisma.portfolioSnapshot.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: now
          }
        },
        select: {
          date: true,
          totalValue: true,
          totalInvested: true,
          totalGainLoss: true
        },
        orderBy: {
          date: 'asc'
        }
      })
    } catch (error) {
      console.warn('Portfolio snapshots table not found:', error)
      return []
    }
  }

  private async fetchGoalHistory() {
    try {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()) // 12 months
      
      return await prisma.goalProgressHistory.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: now
          }
        },
        select: {
          date: true,
          progress: true,
          goalId: true,
          goal: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      })
    } catch (error) {
      console.warn('Goal progress history table not found:', error)
      return []
    }
  }

  private async fetchPriceHistory() {
    try {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()) // 3 months
      
      return await prisma.priceHistory.findMany({
        where: {
          timestamp: {
            gte: fromDate,
            lte: now
          }
        },
        select: {
          symbol: true,
          price: true,
          timestamp: true
        },
        orderBy: [
          { symbol: 'asc' },
          { timestamp: 'asc' }
        ]
      })
    } catch (error) {
      console.warn('Price history table not found:', error)
      return []
    }
  }

  // Batch operations for better performance
  async batchFetchInvestmentDetails(investmentIds: string[]) {
    if (investmentIds.length === 0) return []
    
    return prisma.investment.findMany({
      where: {
        id: {
          in: investmentIds
        }
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
  }

  async batchFetchSIPTransactions(sipIds: string[]) {
    if (sipIds.length === 0) return []
    
    return prisma.sIPTransaction.findMany({
      where: {
        sipId: {
          in: sipIds
        }
      },
      select: {
        id: true,
        sipId: true,
        amount: true,
        transactionDate: true,
        status: true,
        errorMessage: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    })
  }
}

// Global instance
export const parallelFetcher = new ParallelDataFetcher()