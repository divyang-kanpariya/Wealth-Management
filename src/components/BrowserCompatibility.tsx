'use client'

import { useEffect } from 'react';
import { addBrowserClasses, polyfillFetch, getBrowserInfo, supportsFeature } from '@/lib/browser-utils';

const BrowserCompatibility = () => {
  useEffect(() => {
    // Add browser-specific classes
    addBrowserClasses();
    
    // Initialize polyfills
    polyfillFetch();
    
    // Check for unsupported browsers and show warning if needed
    const browser = getBrowserInfo();
    if (browser?.isIE) {
      console.warn('Internet Explorer is not fully supported. Please use a modern browser for the best experience.');
      
      // Show a banner for IE users
      const banner = document.createElement('div');
      banner.innerHTML = `
        <div style="
          background: #f59e0b;
          color: white;
          padding: 12px;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
        ">
          <strong>Unsupported Browser:</strong> 
          For the best experience, please use Chrome, Firefox, Safari, or Edge.
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 8px;
            margin-left: 12px;
            border-radius: 4px;
            cursor: pointer;
          ">×</button>
        </div>
      `;
      document.body.appendChild(banner);
    }
    
    // Log feature support for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Browser Feature Support:', {
        cssGrid: supportsFeature.cssGrid(),
        flexbox: supportsFeature.flexbox(),
        cssVariables: supportsFeature.cssVariables(),
        intersectionObserver: supportsFeature.intersectionObserver(),
        webWorkers: supportsFeature.webWorkers(),
        localStorage: supportsFeature.localStorage(),
        fetch: supportsFeature.fetch()
      });
    }
  }, []);

  return null; // This component doesn't render anything
};

export default BrowserCompatibility;