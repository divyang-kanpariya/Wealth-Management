'use client'

import React from 'react';
import { 
  Button, 
  Alert, 
  CompactCard, 
  DataGrid 
} from '../ui';
import { InvestmentsPageData } from '@/lib/server/data-preparators';

interface InvestmentListDebugProps {
  data: InvestmentsPageData;
}

const InvestmentListDebug: React.FC<InvestmentListDebugProps> = ({ data }) => {
  const { investments, goals, accounts, timestamp } = data;

  const debugInfo = {
    investmentsCount: investments?.length || 0,
    goalsCount: goals?.length || 0,
    accountsCount: accounts?.length || 0,
    investmentsType: typeof investments,
    investmentsIsArray: Array.isArray(investments),
    firstInvestment: investments?.[0] || null,
    timestamp: timestamp.toISOString()
  };



  return (
    <div className="space-y-6">
      {/* Debug Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">🔍 Debug Information</h3>
        <DataGrid
          items={[
            {
              label: 'Investments',
              value: debugInfo.investmentsCount || 0
            },
            {
              label: 'Goals',
              value: debugInfo.goalsCount || 0
            },
            {
              label: 'Accounts',
              value: debugInfo.accountsCount || 0
            },
            {
              label: 'Is Array',
              value: debugInfo.investmentsIsArray ? '✅' : '❌',
              color: debugInfo.investmentsIsArray ? 'success' : 'danger'
            }
          ]}
          columns={4}
          variant="compact"
          className="mb-3"
        />
        <div className="mb-3">
          <span className="text-blue-600 font-medium text-sm">Last Updated:</span>
          <span className="ml-2 text-xs text-gray-600">{debugInfo.timestamp}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
        >
          🔄 Refresh Data
        </Button>
      </div>

      {/* Raw Data Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-gray-800 font-medium mb-2">📊 Raw Investments Data</h3>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
          {JSON.stringify(investments, null, 2)}
        </pre>
      </div>

      {/* Simple Investment List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Investments</h2>
        
        {investments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No investments found</h3>
            <p className="text-gray-600 mb-6">
              The API returned {debugInfo.investmentsCount} investments.
              {debugInfo.investmentsIsArray ? ' Data is an array.' : ' Data is not an array!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((investment, index) => (
              <CompactCard 
                key={investment.id || index}
                title={investment.name || 'Unnamed Investment'}
              >
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">{investment.type}</span>
                  </div>
                  {investment.symbol && (
                    <div>
                      <span className="text-gray-600">Symbol:</span>
                      <span className="ml-2 font-medium">{investment.symbol}</span>
                    </div>
                  )}
                  {investment.units && (
                    <div>
                      <span className="text-gray-600">Units:</span>
                      <span className="ml-2 font-medium">{investment.units}</span>
                    </div>
                  )}
                  {investment.buyPrice && (
                    <div>
                      <span className="text-gray-600">Buy Price:</span>
                      <span className="ml-2 font-medium">₹{investment.buyPrice}</span>
                    </div>
                  )}
                  {investment.totalValue && (
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <span className="ml-2 font-medium">₹{investment.totalValue}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Buy Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(investment.buyDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {investment.goal && (
                    <div>
                      <span className="text-gray-600">Goal:</span>
                      <span className="ml-2 font-medium">{investment.goal.name}</span>
                    </div>
                  )}
                  {investment.account && (
                    <div>
                      <span className="text-gray-600">Account:</span>
                      <span className="ml-2 font-medium">{investment.account.name}</span>
                    </div>
                  )}
                </div>
              </CompactCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentListDebug;