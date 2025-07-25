import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Select from '../../../components/ui/Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true }
];

describe('Select', () => {
  it('renders with options', () => {
    render(<Select options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Option 1');
    expect(options[1]).toHaveTextContent('Option 2');
    expect(options[2]).toHaveTextContent('Option 3');
  });

  it('renders with label', () => {
    render(<Select label="Choose option" options={mockOptions} />);
    const label = screen.getByText('Choose option');
    const select = screen.getByRole('combobox');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', select.id);
  });

  it('renders with placeholder', () => {
    render(<Select placeholder="Select an option" options={mockOptions} />);
    const placeholderOption = screen.getByText('Select an option');
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toHaveAttribute('disabled');
  });

  it('shows error state', () => {
    render(<Select error="Please select an option" options={mockOptions} />);
    const select = screen.getByRole('combobox');
    const errorMessage = screen.getByText('Please select an option');
    
    expect(select).toHaveClass('border-red-300', 'text-red-900');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-red-600');
  });

  it('shows helper text', () => {
    render(<Select helperText="Choose your preferred option" options={mockOptions} />);
    const helperText = screen.getByText('Choose your preferred option');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-gray-500');
  });

  it('handles disabled options', () => {
    render(<Select options={mockOptions} />);
    const options = screen.getAllByRole('option');
    expect(options[2]).toBeDisabled();
  });

  it('handles selection changes', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select).toHaveValue('option2');
  });

  it('applies custom className', () => {
    render(<Select className="custom-select" options={mockOptions} />);
    expect(screen.getByRole('combobox')).toHaveClass('custom-select');
  });
});