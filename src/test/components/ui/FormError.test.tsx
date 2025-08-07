import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormError } from '@/components/ui';

describe('FormError', () => {
  it('renders nothing when no error is provided', () => {
    const { container } = render(<FormError />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when error is empty string', () => {
    const { container } = render(<FormError error="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single error message', () => {
    render(<FormError error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-red-600');
  });

  it('renders multiple error messages from array', () => {
    const errors = ['This field is required', 'Must be at least 3 characters'];
    render(<FormError error={errors} />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 3 characters')).toBeInTheDocument();
  });

  it('renders error icon by default', () => {
    render(<FormError error="Error message" />);
    
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-4', 'w-4');
  });

  it('hides error icon when showIcon is false', () => {
    render(<FormError error="Error message" showIcon={false} />);
    
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FormError error="Error message" className="custom-class" />);
    
    const container = screen.getByText('Error message').closest('div')?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('renders multiple errors with icons', () => {
    const errors = ['Error 1', 'Error 2'];
    render(<FormError error={errors} />);
    
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons).toHaveLength(2);
    
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });

  it('handles empty array', () => {
    const { container } = render(<FormError error={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('filters out empty strings from array', () => {
    const errors = ['Valid error', '', 'Another valid error'];
    render(<FormError error={errors} />);
    
    expect(screen.getByText('Valid error')).toBeInTheDocument();
    expect(screen.getByText('Another valid error')).toBeInTheDocument();
    
    // Should only render 2 errors (empty string filtered out)
    const errorElements = screen.getAllByText(/error/i);
    expect(errorElements).toHaveLength(2);
  });
});