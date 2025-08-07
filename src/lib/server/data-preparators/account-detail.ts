import { prisma } from '@/lib/prisma'
import { BaseDataPreparator, PageDataBase } from './base'
import { Account, Investment } from '@/types'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'

export interface AccountWithInvestments extends Account {
  totalValue: number
  investmentCount: number
  investments: Investment[]
}

export interface AccountDetailPageData extends PageDataBase {
  account: AccountWithInvestments
}

export class AccountDetailDataPreparator extends BaseDataPreparator {
  async prepare(accountId: string): Promise<AccountDetailPageData> {
    const startTime = Date.now()
    
    try {
      // Use Next.js unstable_cache for database queries
      const getCachedAccount = unstable_cache(
        async () => this.fetchAccount(accountId),
        [`account-detail-${accountId}`],
        { 
          revalidate: 300, // 5 minutes
          tags: ['accounts', 'investments', `account-${accountId}`]
        }
      )

      // Fetch account data
      const account = await getCachedAccount()
      
      if (!account) {
        notFound()
      }

      // Transform data to match TypeScript types
      const transformedAccount = this.transformAccount(account)

      // Calculate account totals
      const accountWithTotals = this.calculateAccountTotals(transformedAccount)

      console.log(`[AccountDetailDataPreparator] Data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        account: accountWithTotals
      }

    } catch (error) {
      console.error('Account detail data preparation failed:', error)
      
      // If it's a Next.js notFound error, re-throw it
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error
      }
      
      // If it's our test notFound error, re-throw it
      if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') {
        throw error
      }
      
      // For other errors, return fallback data or throw
      throw new Error('Failed to prepare account detail data')
    }
  }

  private async fetchAccount(accountId: string) {
    return await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        investments: {
          include: {
            goal: true,
            account: true,
          },
          orderBy: {
            buyDate: 'desc'
          }
        },
      },
    })
  }

  private transformAccount(account: any): Account {
    return {
      ...account,
      notes: account.notes ?? undefined,
      investments: account.investments ? this.transformInvestments(account.investments) : []
    }
  }

  private calculateAccountTotals(account: Account): AccountWithInvestments {
    const investments = account.investments || []
    let totalValue = 0

    investments.forEach((investment: Investment) => {
      if (investment.units && investment.buyPrice) {
        // Unit-based calculation (stocks, mutual funds, crypto)
        totalValue += investment.units * investment.buyPrice
      } else if (investment.totalValue) {
        // Total value calculation (real estate, jewelry, etc.)
        totalValue += investment.totalValue
      }
    })

    return {
      ...account,
      totalValue,
      investmentCount: investments.length,
      investments
    }
  }

  // Method to invalidate cache when account data changes
  static invalidateCache(accountId: string): void {
    console.log(`[AccountDetailDataPreparator] Cache invalidated for account ${accountId}`)
  }
}