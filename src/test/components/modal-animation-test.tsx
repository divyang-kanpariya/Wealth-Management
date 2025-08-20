'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

/**
 * Test component to verify modal animation behavior
 * Tests opening, closing, and re-opening animations
 */
export function ModalAnimationTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenSecondModal = () => {
    setIsSecondModalOpen(true);
  };

  const handleCloseSecondModal = () => {
    setIsSecondModalOpen(false);
  };

  const handleOpenLoadingModal = () => {
    setIsLoadingModalOpen(true);
    setIsLoading(true);
    
    // Simulate loading for 3 seconds
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const handleCloseLoadingModal = () => {
    setIsLoadingModalOpen(false);
    setIsLoading(false);
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Modal Animation Test</h1>
      
      <div className="space-y-4">
        <div>
          <Button onClick={handleOpenModal}>
            Open Basic Modal
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Test basic open/close animations
          </p>
        </div>

        <div>
          <Button onClick={handleOpenSecondModal} variant="outline">
            Open Compact Modal
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Test compact variant with different size
          </p>
        </div>

        <div>
          <Button onClick={handleOpenLoadingModal} variant="secondary">
            Open Loading Modal
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Test modal with loading state
          </p>
        </div>
      </div>

      {/* Basic Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Basic Modal Test"
        size="md"
      >
        <div className="space-y-4">
          <p>This is a basic modal to test animations.</p>
          <p>Try closing and reopening multiple times to verify animations work consistently.</p>
          
          <div className="flex space-x-2">
            <Button onClick={handleCloseModal}>
              Close Modal
            </Button>
            <Button 
              onClick={() => {
                handleCloseModal();
                setTimeout(handleOpenModal, 500);
              }}
              variant="outline"
            >
              Close & Reopen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Compact Modal */}
      <Modal
        isOpen={isSecondModalOpen}
        onClose={handleCloseSecondModal}
        title="Compact Modal"
        size="sm"
        variant="compact"
      >
        <div className="space-y-3">
          <p>This is a compact modal variant.</p>
          <p>It should have the same smooth animations.</p>
          
          <Button onClick={handleCloseSecondModal} size="sm">
            Close
          </Button>
        </div>
      </Modal>

      {/* Loading Modal */}
      <Modal
        isOpen={isLoadingModalOpen}
        onClose={handleCloseLoadingModal}
        title="Loading Modal Test"
        size="lg"
        loading={isLoading}
        closeOnBackdrop={!isLoading}
      >
        <div className="space-y-4">
          <p>This modal demonstrates loading state behavior.</p>
          {isLoading ? (
            <p>Loading will complete in 3 seconds...</p>
          ) : (
            <div>
              <p>Loading complete! You can now close the modal.</p>
              <Button onClick={handleCloseLoadingModal}>
                Close Modal
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default ModalAnimationTest;