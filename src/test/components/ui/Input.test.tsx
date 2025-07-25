import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Input from '../../../components/ui/Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('block', 'w-full', 'rounded-md');
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    const label = screen.getByText('Email');
    const input = screen.getByRole('textbox');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('shows error state', () => {
    render(<Input error="This field is required" />);
    const input = screen.getByRole('textbox');
    const errorMessage = screen.getByText('This field is required');
    
    expect(input).toHaveClass('border-red-300', 'text-red-900');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-red-600');
  });

  it('shows helper text', () => {
    render(<Input helperText="Enter your email address" />);
    const helperText = screen.getByText('Enter your email address');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-gray-500');
  });

  it('prioritizes error over helper text', () => {
    render(
      <Input 
        error="This field is required" 
        helperText="Enter your email address" 
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });

  it('renders with left icon', () => {
    const icon = <span data-testid="left-icon">@</span>;
    render(<Input leftIcon={icon} />);
    
    const input = screen.getByRole('textbox');
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(input).toHaveClass('pl-10');
  });

  it('renders with right icon', () => {
    const icon = <span data-testid="right-icon">✓</span>;
    render(<Input rightIcon={icon} />);
    
    const input = screen.getByRole('textbox');
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(input).toHaveClass('pr-10');
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test@example.com');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });
});