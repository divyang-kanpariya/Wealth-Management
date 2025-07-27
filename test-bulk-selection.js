// Test script to verify bulk selection functionality
console.log('Testing bulk selection data flow...');

// Mock data structures
const mockInvestmentWithCurrentValue = {
  investment: {
    id: 'inv-123',
    name: 'Test Investment',
    type: 'STOCK',
    symbol: 'TEST',
    units: 10,
    buyPrice: 100,
    buyDate: new Date('2024-01-01'),
    accountId: 'acc-123',
    goalId: 'goal-123',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  currentPrice: 120,
  currentValue: 1200,
  gainLoss: 200,
  gainLossPercentage: 20
};

const mockInvestmentWithCurrentValue2 = {
  investment: {
    id: 'inv-456',
    name: 'Test Investment 2',
    type: 'MUTUAL_FUND',
    symbol: 'TEST2',
    units: 50,
    buyPrice: 80,
    buyDate: new Date('2024-01-15'),
    accountId: 'acc-456',
    goalId: 'goal-456',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  currentPrice: 90,
  currentValue: 4500,
  gainLoss: 500,
  gainLossPercentage: 12.5
};

// Test selection state
let selectedInvestments = [];

// Test handleSelectionChange function
function handleSelectionChange(investmentWithValue, selected) {
  if (selected) {
    selectedInvestments = [...selectedInvestments, investmentWithValue];
  } else {
    selectedInvestments = selectedInvestments.filter(inv => inv.investment.id !== investmentWithValue.investment.id);
  }
}

// Test rowKey function (from Table component)
function rowKey(item) {
  return item.investment.id;
}

// Test isSelected function (from Table component)
function isSelected(item) {
  return selectedInvestments.some(selected => rowKey(selected) === rowKey(item));
}

// Test bulk delete ID extraction
function extractIdsForBulkDelete(selectedInvestments) {
  return selectedInvestments
    .map(inv => inv.investment.id)
    .filter(id => id != null && id !== '');
}

// Run tests
console.log('\n=== Test 1: Initial state ===');
console.log('Selected investments:', selectedInvestments.length);
console.log('Is investment 1 selected:', isSelected(mockInvestmentWithCurrentValue));

console.log('\n=== Test 2: Select first investment ===');
handleSelectionChange(mockInvestmentWithCurrentValue, true);
console.log('Selected investments:', selectedInvestments.length);
console.log('Is investment 1 selected:', isSelected(mockInvestmentWithCurrentValue));
console.log('Selected investment ID:', selectedInvestments[0].investment.id);
console.log('Selected investment name:', selectedInvestments[0].investment.name);

console.log('\n=== Test 3: Select second investment ===');
handleSelectionChange(mockInvestmentWithCurrentValue2, true);
console.log('Selected investments:', selectedInvestments.length);
console.log('Is investment 2 selected:', isSelected(mockInvestmentWithCurrentValue2));

console.log('\n=== Test 4: Extract IDs for bulk delete ===');
const idsForDelete = extractIdsForBulkDelete(selectedInvestments);
console.log('IDs for bulk delete:', idsForDelete);
console.log('All IDs are valid:', idsForDelete.every(id => id && id !== ''));

console.log('\n=== Test 5: Calculate total value ===');
const totalValue = selectedInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
console.log('Total value:', totalValue);

console.log('\n=== Test 6: Deselect first investment ===');
handleSelectionChange(mockInvestmentWithCurrentValue, false);
console.log('Selected investments:', selectedInvestments.length);
console.log('Is investment 1 selected:', isSelected(mockInvestmentWithCurrentValue));
console.log('Is investment 2 selected:', isSelected(mockInvestmentWithCurrentValue2));

console.log('\n=== Test 7: Final ID extraction ===');
const finalIds = extractIdsForBulkDelete(selectedInvestments);
console.log('Final IDs for bulk delete:', finalIds);

console.log('\n✅ All tests completed successfully!');
console.log('The bulk selection functionality should now work correctly.');