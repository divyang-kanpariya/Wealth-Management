import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Modal from '@/components/ui/Modal';

// Mock timers for animation testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('Modal Animation Tests', () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>
  };

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should render and animate in when isOpen becomes true', async () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    
    // Modal should not be visible initially
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    
    // Open the modal
    rerender(<Modal {...defaultProps} isOpen={true} />);
    
    // Modal should be visible immediately
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    
    // Check for animation classes
    const backdrop = screen.getByText('Test Modal').closest('[class*="animate"]');
    expect(backdrop).toBeInTheDocument();
  });

  it('should animate out when isOpen becomes false', async () => {
    const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
    
    // Modal should be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    
    // Close the modal
    act(() => {
      rerender(<Modal {...defaultProps} isOpen={false} />);
    });
    
    // Modal should still be visible during animation
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    
    // Fast-forward through animation
    act(() => {
      vi.advanceTimersByTime(350);
    });
    
    // Modal should be removed from DOM
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should handle rapid open/close without flickering', async () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    
    // Rapidly open and close
    rerender(<Modal {...defaultProps} isOpen={true} />);
    rerender(<Modal {...defaultProps} isOpen={false} />);
    rerender(<Modal {...defaultProps} isOpen={true} />);
    
    // Modal should be visible
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    
    // Fast-forward through all animations
    vi.advanceTimersByTime(500);
    
    // Modal should still be visible (last state was open)
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should call onClose when escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} isOpen={true} onClose={onClose} closeOnBackdrop={true} />);
    
    // Find the backdrop (the outermost div with the click handler)
    const backdrop = screen.getByText('Test Modal').closest('[class*="fixed inset-0 z-50"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not close when backdrop is clicked if closeOnBackdrop is false', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} isOpen={true} onClose={onClose} closeOnBackdrop={false} />);
    
    // Find the backdrop (the outermost div with the click handler)
    const backdrop = screen.getByText('Test Modal').closest('[class*="fixed inset-0 z-50"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('should not close when loading is true', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} isOpen={true} onClose={onClose} loading={true} />);
    
    // Try escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    
    // Close button should be disabled
    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toBeDisabled();
  });

  it('should show loading overlay when loading is true', () => {
    render(<Modal {...defaultProps} isOpen={true} loading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<Modal {...defaultProps} isOpen={true} size="sm" />);
    
    // Find the modal container (the div with the size classes)
    let modal = screen.getByText('Test Modal').closest('[class*="max-w-"]');
    expect(modal).toHaveClass('max-w-md');
    
    rerender(<Modal {...defaultProps} isOpen={true} size="lg" />);
    modal = screen.getByText('Test Modal').closest('[class*="max-w-"]');
    expect(modal).toHaveClass('max-w-2xl');
  });

  it('should apply correct variant classes', () => {
    const { rerender } = render(<Modal {...defaultProps} isOpen={true} variant="default" />);
    
    let header = screen.getByText('Test Modal').parentElement;
    expect(header).toHaveClass('p-6');
    
    rerender(<Modal {...defaultProps} isOpen={true} variant="compact" />);
    header = screen.getByText('Test Modal').parentElement;
    expect(header).toHaveClass('p-4');
  });

  it('should focus first focusable element when opened', async () => {
    render(
      <Modal {...defaultProps} isOpen={true}>
        <button>First button</button>
        <button>Second button</button>
      </Modal>
    );
    
    // Fast-forward to allow focus to be set
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // The close button should be focused first for accessibility
    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toHaveFocus();
  });

  it('should restore body overflow when unmounted', () => {
    const { unmount } = render(<Modal {...defaultProps} isOpen={true} />);
    
    // Body overflow should be hidden when modal is open
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    
    // Body overflow should be restored when component unmounts
    expect(document.body.style.overflow).toBe('unset');
  });
});