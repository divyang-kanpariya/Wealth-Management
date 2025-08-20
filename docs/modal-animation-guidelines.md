# Modal Animation Guidelines

## Overview

This document outlines the modal animation implementation and guidelines for consistent dialog behavior across the application.

## Fixed Issues

### 1. Animation State Management
**Problem**: The original modal used conflicting state variables (`isVisible` and `isAnimating`) that could get out of sync, causing flickering and inconsistent animations.

**Solution**: Implemented a single `animationState` enum with clear states:
- `entering`: Modal is appearing
- `entered`: Modal is fully visible
- `exiting`: Modal is disappearing  
- `exited`: Modal is hidden

### 2. Animation Timing
**Problem**: Animations only played once and didn't trigger correctly on reopen.

**Solution**: 
- Proper timeout management with cleanup
- Consistent 300ms animation duration
- Proper state transitions that reset correctly

### 3. Event Handling
**Problem**: Backdrop clicks weren't working correctly due to event propagation issues.

**Solution**:
- Moved click handler to the outermost backdrop div
- Added `stopPropagation` to modal content to prevent accidental closes
- Proper event delegation

### 4. Focus Management
**Problem**: Focus wasn't being managed properly for accessibility.

**Solution**:
- Automatic focus on first focusable element when modal opens
- Proper focus restoration when modal closes
- Keyboard navigation support (Escape key)

## Animation Specifications

### Timing
- **Enter Duration**: 300ms
- **Exit Duration**: 300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out)

### Effects
- **Backdrop**: Fade in/out with opacity transition
- **Modal Content**: Scale + translate animation (0.95 to 1.0 scale, -10px to 0px translateY)

### CSS Classes
```css
/* Backdrop animations */
.animate-fade-in: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)
.animate-fade-out: fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)

/* Modal content animations */
.animate-scale-in: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)
.animate-scale-out: scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

## Usage Guidelines

### Basic Modal
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Modal Title"
>
  <p>Modal content</p>
</Modal>
```

### Modal with Loading State
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Processing..."
  loading={isLoading}
  closeOnBackdrop={!isLoading}
>
  <p>Please wait while we process your request...</p>
</Modal>
```

### Modal Sizes
- `sm`: max-w-md (384px)
- `md`: max-w-lg (512px) - default
- `lg`: max-w-2xl (672px)
- `xl`: max-w-4xl (896px)

### Modal Variants
- `default`: Standard padding and borders
- `compact`: Reduced padding for smaller content

## Accessibility Features

### Keyboard Navigation
- **Escape Key**: Closes modal (unless loading)
- **Tab Navigation**: Cycles through focusable elements within modal
- **Auto Focus**: First focusable element receives focus on open

### Screen Reader Support
- Proper ARIA labels on close button
- Modal content is announced when opened
- Focus is trapped within modal

### Visual Indicators
- Loading overlay prevents interaction when processing
- Disabled states for buttons during loading
- Clear visual feedback for all interactive elements

## Performance Considerations

### Animation Optimization
- Uses CSS transforms instead of layout properties
- Hardware acceleration with `transform` and `opacity`
- Minimal reflows and repaints

### Memory Management
- Proper cleanup of timeouts on unmount
- Event listener cleanup
- Body overflow restoration

### Bundle Size
- No external animation libraries required
- Uses native CSS animations
- Minimal JavaScript for state management

## Testing

### Animation Testing
```tsx
// Test modal opens with animation
const { rerender } = render(<Modal isOpen={false} />);
rerender(<Modal isOpen={true} />);
expect(screen.getByText('Modal Title')).toBeInTheDocument();

// Test modal closes with animation
rerender(<Modal isOpen={false} />);
act(() => vi.advanceTimersByTime(300));
expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
```

### Interaction Testing
```tsx
// Test backdrop click
const onClose = vi.fn();
render(<Modal isOpen={true} onClose={onClose} />);
fireEvent.click(screen.getByText('Title').closest('[class*="fixed inset-0"]'));
expect(onClose).toHaveBeenCalled();

// Test escape key
fireEvent.keyDown(document, { key: 'Escape' });
expect(onClose).toHaveBeenCalled();
```

## Browser Compatibility

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Fallbacks
- Graceful degradation for older browsers
- CSS animations with vendor prefixes
- JavaScript fallbacks for unsupported features

## Common Patterns

### Confirmation Dialogs
```tsx
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Action"
  size="sm"
  variant="compact"
>
  <p>Are you sure you want to delete this item?</p>
  <div className="flex space-x-2 mt-4">
    <Button onClick={handleConfirm} variant="danger">Delete</Button>
    <Button onClick={() => setShowConfirm(false)} variant="outline">Cancel</Button>
  </div>
</Modal>
```

### Form Modals
```tsx
<Modal
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Add New Item"
  size="lg"
  closeOnBackdrop={false}
>
  <form onSubmit={handleSubmit}>
    {/* Form fields */}
    <div className="flex justify-end space-x-2 mt-6">
      <Button type="button" onClick={() => setShowForm(false)} variant="outline">
        Cancel
      </Button>
      <Button type="submit" loading={isSubmitting}>
        Save
      </Button>
    </div>
  </form>
</Modal>
```

## Migration Guide

### From Old Modal Implementation
1. Replace `isVisible` state management with `isOpen` prop
2. Update animation classes to use new CSS animations
3. Add proper focus management
4. Update event handlers for backdrop clicks
5. Test all modal interactions thoroughly

### Breaking Changes
- Animation timing changed from 200ms to 300ms
- Focus behavior now focuses first element instead of modal container
- Backdrop click behavior requires `closeOnBackdrop={true}` to be explicit

## Future Enhancements

### Planned Features
- Modal stacking support for nested modals
- Custom animation presets
- Gesture support for mobile (swipe to close)
- Better responsive behavior on small screens

### Performance Improvements
- Virtual scrolling for large modal content
- Lazy loading of modal content
- Animation frame optimization