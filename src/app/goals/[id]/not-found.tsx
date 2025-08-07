import React from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

export default function GoalNotFound() {
  return (
    <Layout>
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="mb-8">
          <svg 
            className="mx-auto h-24 w-24 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V19a2 2 0 01-2 2H9a2 2 0 01-2-2V6.306" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Goal Not Found
        </h1>
        
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          The goal you&apos;re looking for doesn&apos;t exist or may have been deleted.
        </p>
        
        <div className="flex space-x-4">
          <Link href="/goals">
            <Button variant="primary">
              View All Goals
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}