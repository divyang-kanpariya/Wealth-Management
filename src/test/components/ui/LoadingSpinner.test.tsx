import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner } from '@/components/ui';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'text-blue-600');
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<LoadingSpinner size="sm" />);
    let spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="lg" />);
    spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with different colors', () => {
    const { rerender, container } = render(<LoadingSpinner color="gray" />);
    let spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('text-gray-600');

    rerender(<LoadingSpinner color="white" />);
    spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('text-white');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('custom-spinner');
  });
});