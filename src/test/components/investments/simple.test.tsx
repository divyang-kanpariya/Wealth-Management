import { describe, it, expect } from 'vitest';
import InvestmentForm from '../../../components/investments/InvestmentForm';
import DynamicFields from '../../../components/investments/DynamicFields';

describe('Investment Components Import', () => {
  it('should import InvestmentForm component', () => {
    expect(InvestmentForm).toBeDefined();
  });

  it('should import DynamicFields component', () => {
    expect(DynamicFields).toBeDefined();
  });
});