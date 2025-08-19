import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';

// Mock getBoundingClientRect
const mockGetBoundingClientRect = vi.fn();

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('DropdownMenu Positioning', () => {
  const mockItems: DropdownMenuItem[] = [
    {
      id: 'view',
      label: 'View',
      icon: <span>👁️</span>,
      onClick: vi.fn()
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <span>✏️</span>,
      onClick: vi.fn()
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <span>🗑️</span>,
      onClick: vi.fn(),
      variant: 'danger'
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
    
    // Mock window object
    Object.defineProperty(window, 'innerWidth', { value: mockWindow.innerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: mockWindow.innerHeight, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use bottom-right placement when there is sufficient space', async () => {
    // Position trigger in center with plenty of space
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('top-full', 'right-0', 'mt-1');
    });
  });

  it('should use bottom-left placement when insufficient space on right', async () => {
    // Position trigger near right edge
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 900, // Near right edge
      right: 932,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('top-full', 'left-0', 'mt-1');
    });
  });

  it('should use top-right placement when insufficient space below', async () => {
    // Position trigger near bottom
    mockGetBoundingClientRect.mockReturnValue({
      top: 700, // Near bottom
      bottom: 732,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('bottom-full', 'right-0', 'mb-1');
    });
  });

  it('should use top-left placement when insufficient space below and right', async () => {
    // Position trigger near bottom-right corner
    mockGetBoundingClientRect.mockReturnValue({
      top: 700, // Near bottom
      bottom: 732,
      left: 900, // Near right edge
      right: 932,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('bottom-full', 'left-0', 'mb-1');
    });
  });

  it('should respect explicit placement when not auto', async () => {
    // Position trigger anywhere
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="top-left"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('bottom-full', 'left-0', 'mb-1');
    });
  });

  it('should handle small viewport correctly', async () => {
    // Mock small viewport
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    // Position trigger in center of small viewport
    mockGetBoundingClientRect.mockReturnValue({
      top: 250,
      bottom: 282,
      left: 150,
      right: 182,
      width: 32,
      height: 32
    });

    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      // Should still position correctly even in small viewport
      expect(menu).toHaveClass('absolute');
    });
  });

  it('should close dropdown when clicking outside', async () => {
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(
      <div>
        <DropdownMenu items={mockItems} placement="auto" />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    // Verify dropdown is open
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    // Verify dropdown is closed
    await waitFor(() => {
      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  it('should close dropdown when escape key is pressed', async () => {
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(<DropdownMenu items={mockItems} placement="auto" />);

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    // Verify dropdown is open
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    // Press escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Verify dropdown is closed
    await waitFor(() => {
      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  it('should handle menu items correctly', async () => {
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(<DropdownMenu items={mockItems} placement="auto" />);

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    // Click on a menu item
    fireEvent.click(screen.getByText('View'));

    // Verify onClick was called and dropdown closed
    expect(mockItems[0].onClick).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  it('should handle disabled menu items', async () => {
    const disabledItems: DropdownMenuItem[] = [
      {
        id: 'disabled',
        label: 'Disabled Item',
        icon: <span>❌</span>,
        onClick: vi.fn(),
        disabled: true
      }
    ];

    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(<DropdownMenu items={disabledItems} placement="auto" />);

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const disabledItem = screen.getByText('Disabled Item');
      expect(disabledItem).toBeInTheDocument();
      expect(disabledItem.closest('button')).toBeDisabled();
    });

    // Click on disabled item
    fireEvent.click(screen.getByText('Disabled Item'));

    // Verify onClick was not called and dropdown remains open
    expect(disabledItems[0].onClick).not.toHaveBeenCalled();
    expect(screen.getByText('Disabled Item')).toBeInTheDocument();
  });
});