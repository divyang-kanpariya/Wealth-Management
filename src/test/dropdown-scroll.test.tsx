import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DropdownMenu, { DropdownMenuItem } from '../components/ui/DropdownMenu';

// Mock getBoundingClientRect
const mockGetBoundingClientRect = vi.fn();

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('DropdownMenu Simplified Behavior', () => {
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
    
    // Default trigger position (center of screen)
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should position dropdown correctly on initial open', async () => {
    render(
      <DropdownMenu
        items={mockItems}
        placement="bottom-right"
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

  it('should use auto placement to handle edge cases', async () => {
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
      // Should position to avoid viewport edges
      expect(menu).toHaveClass('bottom-full', 'left-0', 'mb-1');
    });
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <DropdownMenu
          items={mockItems}
          placement="bottom-right"
        />
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

  it('should handle rapid interactions without performance issues', async () => {
    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    
    // Simulate rapid open/close cycles
    for (let i = 0; i < 5; i++) {
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('View')).toBeInTheDocument();
      });
      
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.queryByText('View')).not.toBeInTheDocument();
      });
    }
  });

  it('should position dropdown above trigger when insufficient space below', async () => {
    // Position trigger near bottom of viewport
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

  it('should handle window resize events gracefully', async () => {
    render(
      <DropdownMenu
        items={mockItems}
        placement="auto"
      />
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });
  });

  it('should work correctly in table context', async () => {
    // Simulate table row context
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <td>Data</td>
            <td>
              <DropdownMenu
                items={mockItems}
                placement="auto"
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    const trigger = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });
  });

  it('should handle small viewport correctly', async () => {
    // Mock small viewport (mobile)
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

    // Position trigger in center of small viewport
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
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
      // Should position correctly even in small viewport
      expect(menu).toHaveClass('absolute');
    });
  });
});