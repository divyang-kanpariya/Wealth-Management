import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorState from '../../../components/ui/ErrorState';

describe('ErrorState', () => {
  it('renders with required message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument(); // default title
  });

  it('renders with custom title', () => {
    render(<ErrorState title="Custom Error" message="Error details" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="Error occurred" onRetry={handleRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom retry text', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState 
        message="Error occurred" 
        onRetry={handleRetry} 
        retryText="Reload Data" 
      />
    );
    
    expect(screen.getByRole('button', { name: /reload data/i })).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error occurred" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders in fullscreen mode', () => {
    render(<ErrorState message="Error occurred" fullScreen />);
    const container = screen.getByText('Error occurred').closest('div');
    expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('applies custom className', () => {
    render(<ErrorState message="Error occurred" className="custom-error" />);
    const container = screen.getByText('Error occurred').closest('div');
    expect(container).toHaveClass('custom-error');
  });

  it('renders error icon', () => {
    render(<ErrorState message="Error occurred" />);
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-red-400');
  });
});