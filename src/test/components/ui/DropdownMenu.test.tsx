import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';

describe('DropdownMenu', () => {
  const mockItems: DropdownMenuItem[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: <span data-testid="view-icon">👁️</span>,
      onClick: vi.fn()
    },
    {
      id: 'edit',
      label: 'Edit Item',
      icon: <span data-testid="edit-icon">✏️</span>,
      onClick: vi.fn()
    },
    {
      id: 'delete',
      label: 'Delete Item',
      icon: <span data-testid="delete-icon">🗑️</span>,
      onClick: vi.fn(),
      variant: 'danger',
      separator: true
    }
  ];

  it('renders the dropdown trigger button', () => {
    render(<DropdownMenu items={mockItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    expect(trigger).toBeInTheDocument();
  });

  it('shows dropdown menu when trigger is clicked', () => {
    render(<DropdownMenu items={mockItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Edit Item')).toBeInTheDocument();
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('calls onClick handler when menu item is clicked', () => {
    render(<DropdownMenu items={mockItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);
    
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown after item is clicked', () => {
    render(<DropdownMenu items={mockItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);
    
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <DropdownMenu items={mockItems} />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    
    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);
    
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('closes dropdown when escape key is pressed', () => {
    render(<DropdownMenu items={mockItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('does not call onClick for disabled items', () => {
    const disabledItems: DropdownMenuItem[] = [
      {
        id: 'disabled',
        label: 'Disabled Item',
        icon: <span>❌</span>,
        onClick: vi.fn(),
        disabled: true
      }
    ];

    render(<DropdownMenu items={disabledItems} />);
    
    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);
    
    const disabledButton = screen.getByText('Disabled Item');
    fireEvent.click(disabledButton);
    
    expect(disabledItems[0].onClick).not.toHaveBeenCalled();
  });
});