import { describe, it, expect } from 'vitest';

describe('Account Components', () => {
  it('should export all account components', async () => {
    const accountComponents = await import('@/components/accounts');
    
    expect(accountComponents.AccountForm).toBeDefined();

    expect(accountComponents.AccountList).toBeDefined();
  });
});