import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from '../../../components/layout/Header';

describe('Header', () => {
  it('renders with default title', () => {
    render(<Header />);
    expect(screen.getByText('Personal Wealth Management')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<Header title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(<Header title="Main Title" subtitle="This is a subtitle" />);
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = <button>Action Button</button>;
    render(<Header actions={actions} />);
    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
  });

  it('has proper header structure', () => {
    render(<Header title="Test Title" />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b');
  });

  it('applies responsive classes', () => {
    render(<Header title="Test Title" />);
    const container = screen.getByText('Test Title').closest('.max-w-7xl');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
  });
});