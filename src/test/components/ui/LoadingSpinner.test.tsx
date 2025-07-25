import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'text-blue-600');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with different colors', () => {
    const { rerender } = render(<LoadingSpinner color="gray" />);
    let spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('text-gray-600');

    rerender(<LoadingSpinner color="white" />);
    spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('text-white');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('custom-spinner');
  });
});