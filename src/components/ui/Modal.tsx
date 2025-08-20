'use client';

import React, { useEffect, useState, useRef } from 'react';

/**
 * Enhanced Modal component with smooth animations and better UX
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
  /** Whether to close modal when clicking backdrop */
  closeOnBackdrop?: boolean;
  /** Whether to show loading state */
  loading?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  variant = 'default',
  className = '',
  closeOnBackdrop = true,
  loading = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle modal open/close animations with proper state management
  useEffect(() => {
    if (isOpen && animationState === 'exited') {
      // Opening modal
      setIsVisible(true);
      setAnimationState('entering');
      document.body.style.overflow = 'hidden';
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Trigger entrance animation after DOM update
      timeoutRef.current = setTimeout(() => {
        setAnimationState('entered');
      }, 50); // Small delay to ensure DOM is updated
      
    } else if (!isOpen && (animationState === 'entered' || animationState === 'entering')) {
      // Closing modal
      setAnimationState('exiting');
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Wait for exit animation to complete
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setAnimationState('exited');
        document.body.style.overflow = 'unset';
      }, 300); // Match animation duration
    }
  }, [isOpen, animationState]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen, animationState]);

  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !loading) {
      onClose();
    }
  };

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

  const getBackdropClasses = () => {
    const baseClasses = 'fixed inset-0 z-50 overflow-y-auto';
    switch (animationState) {
      case 'entering':
        return `${baseClasses} animate-fade-in`;
      case 'entered':
        return `${baseClasses} opacity-100`;
      case 'exiting':
        return `${baseClasses} animate-fade-out`;
      default:
        return baseClasses;
    }
  };

  const getModalClasses = () => {
    const baseClasses = `relative ${variantClasses[variant].modal} w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out ${className}`;
    switch (animationState) {
      case 'entering':
        return `${baseClasses} animate-scale-in`;
      case 'entered':
        return `${baseClasses} scale-100 opacity-100`;
      case 'exiting':
        return `${baseClasses} animate-scale-out`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className={getBackdropClasses()} onClick={handleBackdropClick}>
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out ${
            animationState === 'entering' || animationState === 'entered' 
              ? 'bg-opacity-50' 
              : 'bg-opacity-0'
          }`}
        />
        
        {/* Modal */}
        <div 
          ref={modalRef} 
          className={getModalClasses()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading Overlay */}
          {loading && (
            <div className="loading-overlay">
              <div className="flex flex-col items-center space-y-2">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          )}

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
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={loading}
                  aria-label="Close modal"
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