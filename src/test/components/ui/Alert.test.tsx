import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert } from '@/components/ui';

describe('Alert', () => {
  it('renders with required message', () => {
    render(<Alert message="This is an alert" />);
    expect(screen.getByText('This is an alert')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Alert title="Alert Title" message="Alert message" />);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders different alert types', () => {
    const { rerender } = render(<Alert type="success" message="Success message" />);
    let container = screen.getByText('Success message').closest('div');
    expect(container).toHaveClass('bg-green-50', 'border-green-200');

    rerender(<Alert type="error" message="Error message" />);
    container = screen.getByText('Error message').closest('div');
    expect(container).toHaveClass('bg-red-50', 'border-red-200');

    rerender(<Alert type="warning" message="Warning message" />);
    container = screen.getByText('Warning message').closest('div');
    expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200');

    rerender(<Alert type="info" message="Info message" />);
    container = screen.getByText('Info message').closest('div');
    expect(container).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('renders close button when onClose is provided', () => {
    const handleClose = vi.fn();
    render(<Alert message="Closable alert" onClose={handleClose} />);
    
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<Alert message="Non-closable alert" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert message="Custom alert" className="custom-alert" />);
    const container = screen.getByText('Custom alert').closest('div');
    expect(container).toHaveClass('custom-alert');
  });

  it('renders appropriate icons for each type', () => {
    const { rerender } = render(<Alert type="success" message="Success" />);
    let icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-green-400');

    rerender(<Alert type="error" message="Error" />);
    icon = document.querySelector('svg');
    expect(icon).toHaveClass('text-red-400');

    rerender(<Alert type="warning" message="Warning" />);
    icon = document.querySelector('svg');
    expect(icon).toHaveClass('text-yellow-400');

    rerender(<Alert type="info" message="Info" />);
    icon = document.querySelector('svg');
    expect(icon).toHaveClass('text-blue-400');
  });
});