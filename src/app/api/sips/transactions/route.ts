import { NextRequest, NextResponse } from 'next/server'
import { 
  getSIPTransactionAuditTrail,
  calculateSIPAverageNAV
} from '@/lib/sip-processor'

/**
 * GET /api/sips/transactions - Get SIP transaction audit trail
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sipId = searchParams.get('sipId')
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const status = searchParams.get('status') || undefined
    const action = searchParams.get('action')
    
    if (action === 'average-nav' && sipId) {
      // Get average NAV for a specific SIP
      const averageData = await calculateSIPAverageNAV(sipId)
      return NextResponse.json(averageData)
    }
    
    // Get transaction audit trail
    const transactions = await getSIPTransactionAuditTrail(
      sipId || undefined,
      startDate,
      endDate,
      status
    )
    
    // Group transactions by SIP if no specific SIP is requested
    if (!sipId) {
      const groupedBySIP = transactions.reduce((acc, txn) => {
        if (!acc[txn.sipId]) {
          acc[txn.sipId] = {
            sipId: txn.sipId,
            sipName: txn.sipName,
            transactions: [],
            totalAmount: 0,
            totalUnits: 0,
            successfulTransactions: 0,
            failedTransactions: 0
          }
        }
        
        acc[txn.sipId].transactions.push(txn)
        
        if (txn.status === 'COMPLETED') {
          acc[txn.sipId].totalAmount += txn.amount
          acc[txn.sipId].totalUnits += txn.units
          acc[txn.sipId].successfulTransactions += 1
        } else if (txn.status === 'FAILED') {
          acc[txn.sipId].failedTransactions += 1
        }
        
        return acc
      }, {} as Record<string, any>)
      
      return NextResponse.json({
        summary: {
          totalTransactions: transactions.length,
          uniqueSIPs: Object.keys(groupedBySIP).length,
          successfulTransactions: transactions.filter(t => t.status === 'COMPLETED').length,
          failedTransactions: transactions.filter(t => t.status === 'FAILED').length
        },
        groupedBySIP: Object.values(groupedBySIP)
      })
    }
    
    // Return transactions for specific SIP
    const successfulTransactions = transactions.filter(t => t.status === 'COMPLETED')
    const totalAmount = successfulTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalUnits = successfulTransactions.reduce((sum, t) => sum + t.units, 0)
    const averageNAV = totalUnits > 0 ? totalAmount / totalUnits : 0
    
    return NextResponse.json({
      sipId,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        successfulTransactions: successfulTransactions.length,
        failedTransactions: transactions.filter(t => t.status === 'FAILED').length,
        totalAmount,
        totalUnits,
        averageNAV
      }
    })
    
  } catch (error) {
    console.error('Error fetching SIP transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SIP transactions' },
      { status: 500 }
    )
  }
}