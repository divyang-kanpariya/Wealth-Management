import React, { useEffect } from 'react';

/**
 * Modal component for displaying content in an overlay
 * Follows the design system patterns with consistent styling and behavior
 */
export interface ModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean;
  /** Callback function called when modal should be closed */
  onClose: () => void;
  /** Optional title displayed in the modal header */
  title?: string;
  /** Content to be displayed in the modal body */
  children: React.ReactNode;
  /** Size variant of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the close button in the header */
  showCloseButton?: boolean;
  /** Visual variant of the modal */
  variant?: 'default' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  variant = 'default',
  className = ''
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const variantClasses = {
    default: {
      modal: 'bg-white rounded-lg shadow-xl',
      header: 'p-6 border-b border-gray-200',
      content: 'p-6'
    },
    compact: {
      modal: 'bg-white rounded-lg shadow-xl border border-gray-200',
      header: 'p-4 border-b border-gray-100',
      content: 'p-4'
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`relative ${variantClasses[variant].modal} w-full ${sizeClasses[size]} transform transition-all ${className}`}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={`flex items-center justify-between ${variantClasses[variant].header}`}>
              {title && (
                <h3 className="text-lg font-medium text-gray-900">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={variantClasses[variant].content}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;