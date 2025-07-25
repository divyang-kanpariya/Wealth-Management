import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingState from '../../../components/ui/LoadingState';

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders in fullscreen mode', () => {
    render(<LoadingState fullScreen />);
    const container = screen.getByText('Loading...').closest('div');
    expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('renders with different sizes', () => {
    render(<LoadingState size="lg" />);
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('applies custom className', () => {
    render(<LoadingState className="custom-loading" />);
    const container = screen.getByText('Loading...').closest('div');
    expect(container).toHaveClass('custom-loading');
  });
});