import { describe, it, expect } from 'vitest';

describe('UI Components', () => {
  it('should have Button component', async () => {
    const Button = await import('../../../components/ui/Button');
    expect(Button.default).toBeDefined();
    expect(typeof Button.default).toBe('function');
  });

  it('should have Input component', async () => {
    const Input = await import('../../../components/ui/Input');
    expect(Input.default).toBeDefined();
    expect(typeof Input.default).toBe('function');
  });

  it('should have Select component', async () => {
    const Select = await import('../../../components/ui/Select');
    expect(Select.default).toBeDefined();
    expect(typeof Select.default).toBe('function');
  });

  it('should have Modal component', async () => {
    const Modal = await import('../../../components/ui/Modal');
    expect(Modal.default).toBeDefined();
    expect(typeof Modal.default).toBe('function');
  });

  it('should have LoadingSpinner component', async () => {
    const LoadingSpinner = await import('../../../components/ui/LoadingSpinner');
    expect(LoadingSpinner.default).toBeDefined();
    expect(typeof LoadingSpinner.default).toBe('function');
  });

  it('should have LoadingState component', async () => {
    const LoadingState = await import('../../../components/ui/LoadingState');
    expect(LoadingState.default).toBeDefined();
    expect(typeof LoadingState.default).toBe('function');
  });

  it('should have ErrorState component', async () => {
    const ErrorState = await import('../../../components/ui/ErrorState');
    expect(ErrorState.default).toBeDefined();
    expect(typeof ErrorState.default).toBe('function');
  });

  it('should have Alert component', async () => {
    const Alert = await import('../../../components/ui/Alert');
    expect(Alert.default).toBeDefined();
    expect(typeof Alert.default).toBe('function');
  });
});

describe('Layout Components', () => {
  it('should have Header component', async () => {
    const Header = await import('../../../components/layout/Header');
    expect(Header.default).toBeDefined();
    expect(typeof Header.default).toBe('function');
  });

  it('should have Navigation component', async () => {
    const Navigation = await import('../../../components/layout/Navigation');
    expect(Navigation.default).toBeDefined();
    expect(typeof Navigation.default).toBe('function');
  });

  it('should have Layout component', async () => {
    const Layout = await import('../../../components/layout/Layout');
    expect(Layout.default).toBeDefined();
    expect(typeof Layout.default).toBe('function');
  });
});

describe('Component Exports', () => {
  it('should export all UI components from index', async () => {
    const uiComponents = await import('../../../components/ui/index');

    expect(uiComponents.Button).toBeDefined();
    expect(uiComponents.Input).toBeDefined();
    expect(uiComponents.Select).toBeDefined();
    expect(uiComponents.Modal).toBeDefined();
    expect(uiComponents.LoadingSpinner).toBeDefined();
    expect(uiComponents.LoadingState).toBeDefined();
    expect(uiComponents.ErrorState).toBeDefined();
    expect(uiComponents.Alert).toBeDefined();
  });

  it('should export all layout components from index', async () => {
    const layoutComponents = await import('../../../components/layout/index');

    expect(layoutComponents.Header).toBeDefined();
    expect(layoutComponents.Navigation).toBeDefined();
    expect(layoutComponents.Layout).toBeDefined();
  });

  it('should export all components from main index', async () => {
    const allComponents = await import('../../../components/index');

    // UI Components
    expect(allComponents.Button).toBeDefined();
    expect(allComponents.Input).toBeDefined();
    expect(allComponents.Select).toBeDefined();
    expect(allComponents.Modal).toBeDefined();
    expect(allComponents.LoadingSpinner).toBeDefined();
    expect(allComponents.LoadingState).toBeDefined();
    expect(allComponents.ErrorState).toBeDefined();
    expect(allComponents.Alert).toBeDefined();

    // Layout Components
    expect(allComponents.Header).toBeDefined();
    expect(allComponents.Navigation).toBeDefined();
    expect(allComponents.Layout).toBeDefined();
  });
});