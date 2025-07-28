'use client'

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import CompactCard from '../ui/CompactCard';

const InvestmentListDebug: React.FC = () => {
  const [investments, setInvestments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Starting data fetch...');

      // Test each API endpoint individually
      const investmentsRes = await fetch('/api/investments');
      console.log('📊 Investments API response status:', investmentsRes.status);
      console.log('📊 Investments API response headers:', Object.fromEntries(investmentsRes.headers.entries()));
      
      if (!investmentsRes.ok) {
        const errorText = await investmentsRes.text();
        console.error('❌ Investments API error:', errorText);
        throw new Error(`Failed to fetch investments: ${investmentsRes.status} - ${errorText}`);
      }

      const investmentsData = await investmentsRes.json();
      console.log('📊 Investments data received:', investmentsData);

      const goalsRes = await fetch('/api/goals');
      console.log('🎯 Goals API response status:', goalsRes.status);
      
      if (!goalsRes.ok) {
        const errorText = await goalsRes.text();
        console.error('❌ Goals API error:', errorText);
        throw new Error(`Failed to fetch goals: ${goalsRes.status} - ${errorText}`);
      }

      const goalsData = await goalsRes.json();
      console.log('🎯 Goals data received:', goalsData);

      const accountsRes = await fetch('/api/accounts');
      console.log('🏦 Accounts API response status:', accountsRes.status);
      
      if (!accountsRes.ok) {
        const errorText = await accountsRes.text();
        console.error('❌ Accounts API error:', errorText);
        throw new Error(`Failed to fetch accounts: ${accountsRes.status} - ${accountsRes.statusText}`);
      }

      const accountsData = await accountsRes.json();
      console.log('🏦 Accounts data received:', accountsData);

      // Extract data from paginated responses
      const investmentsArray = investmentsData?.data || investmentsData || [];
      const goalsArray = goalsData?.data || goalsData || [];
      const accountsArray = accountsData?.data || accountsData || [];

      // Set the data
      setInvestments(investmentsArray);
      setGoals(goalsArray);
      setAccounts(accountsArray);

      // Set debug info
      setDebugInfo({
        investmentsCount: investmentsArray?.length || 0,
        goalsCount: goalsArray?.length || 0,
        accountsCount: accountsArray?.length || 0,
        investmentsType: typeof investmentsData,
        investmentsIsArray: Array.isArray(investmentsData),
        investmentsDataIsArray: Array.isArray(investmentsArray),
        hasPaginationStructure: investmentsData?.data !== undefined,
        rawInvestmentsData: investmentsData,
        firstInvestment: investmentsArray?.[0] || null,
        timestamp: new Date().toISOString()
      });

      console.log('✅ All data fetched successfully');
    } catch (err) {
      console.error('💥 Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading investments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ErrorState
          title="Failed to load investments"
          message={error}
          onRetry={fetchData}
        />
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Debug Information:</h3>
          <pre className="text-sm text-red-700 whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">🔍 Debug Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Investments:</span>
            <span className="ml-2">{debugInfo.investmentsCount}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Goals:</span>
            <span className="ml-2">{debugInfo.goalsCount}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Accounts:</span>
            <span className="ml-2">{debugInfo.accountsCount}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Is Array:</span>
            <span className="ml-2">{debugInfo.investmentsIsArray ? '✅' : '❌'}</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-blue-600 font-medium">Last Updated:</span>
          <span className="ml-2 text-xs">{debugInfo.timestamp}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchData}
          className="mt-3"
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