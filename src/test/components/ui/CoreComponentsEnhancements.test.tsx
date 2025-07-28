import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import FormError from '../../../components/ui/FormError';

describe('Core UI Components Enhancements', () => {
  describe('Button Component Enhancements', () => {
    it('applies consistent icon sizing based on button size', () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>;
      
      const { rerender } = render(
        <Button size="sm" leftIcon={<TestIcon />}>Small Button</Button>
      );
      
      let iconContainer = screen.getByTestId('test-icon').parentElement;
      expect(iconContainer).toHaveClass('h-3', 'w-3');
      
      rerender(
        <Button size="md" leftIcon={<TestIcon />}>Medium Button</Button>
      );
      
      iconContainer = screen.getByTestId('test-icon').parentElement;
      expect(iconContainer).toHaveClass('h-4', 'w-4');
      
      rerender(
        <Button size="lg" leftIcon={<TestIcon />}>Large Button</Button>
      );
      
      iconContainer = screen.getByTestId('test-icon').parentElement;
      expect(iconContainer).toHaveClass('h-5', 'w-5');
    });

    it('applies loading spinner size based on button size', () => {
      const { rerender } = render(
        <Button size="sm" loading>Loading</Button>
      );
      
      let spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toHaveClass('h-3', 'w-3');
      
      rerender(
        <Button size="lg" loading>Loading</Button>
      );
      
      spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toHaveClass('h-5', 'w-5');
    });

    it('applies disabled classes correctly', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Modal Component Enhancements', () => {
    it('applies default variant styling', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Default Modal">
          Content
        </Modal>
      );
      
      const modal = document.querySelector('.bg-white.rounded-lg.shadow-xl');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('border');
    });

    it('applies compact variant styling', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Compact Modal" variant="compact">
          Content
        </Modal>
      );
      
      const modal = document.querySelector('.bg-white.rounded-lg.shadow-xl.border.border-gray-200');
      expect(modal).toBeInTheDocument();
    });

    it('uses different padding for compact variant', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Compact Modal" variant="compact">
          <div data-testid="modal-content">Content</div>
        </Modal>
      );
      
      const content = screen.getByTestId('modal-content').parentElement;
      expect(content).toHaveClass('p-4');
    });
  });

  describe('FormError Component Enhancements', () => {
    it('renders simple style by default', () => {
      render(<FormError error="Simple error" />);
      
      const container = screen.getByText('Simple error').closest('div')?.parentElement;
      expect(container).toHaveClass('mt-1');
      expect(container).not.toHaveClass('p-3', 'rounded-lg', 'border');
    });

    it('renders compact style with background and border', () => {
      render(<FormError error="Compact error" style="compact" />);
      
      const container = screen.getByText('Compact error').closest('div')?.parentElement;
      expect(container).toHaveClass('mt-2', 'p-3', 'rounded-lg', 'border', 'bg-red-50', 'border-red-200');
    });

    it('applies different variant colors in compact style', () => {
      const { rerender } = render(
        <FormError error="Warning message" variant="warning" style="compact" />
      );
      
      let container = screen.getByText('Warning message').closest('div')?.parentElement;
      expect(container).toHaveClass('bg-amber-50', 'border-amber-200');
      
      rerender(
        <FormError error="Info message" variant="info" style="compact" />
      );
      
      container = screen.getByText('Info message').closest('div')?.parentElement;
      expect(container).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('handles multiple errors in compact style with proper spacing', () => {
      const errors = ['First error', 'Second error'];
      render(<FormError error={errors} style="compact" />);
      
      expect(screen.getByText('First error')).toBeInTheDocument();
      expect(screen.getByText('Second error')).toBeInTheDocument();
      
      const secondError = screen.getByText('Second error').parentElement;
      expect(secondError).toHaveClass('mt-2');
    });
  });
});