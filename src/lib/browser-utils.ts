/**
 * Browser compatibility utilities
 */

export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const userAgent = window.navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(window.navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(window.navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isIE = /MSIE|Trident/.test(userAgent);
  
  return {
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    userAgent
  };
};

export const supportsFeature = {
  // Check if browser supports CSS Grid
  cssGrid: () => {
    if (typeof window === 'undefined') return true;
    return CSS.supports('display', 'grid');
  },
  
  // Check if browser supports CSS Flexbox
  flexbox: () => {
    if (typeof window === 'undefined') return true;
    return CSS.supports('display', 'flex');
  },
  
  // Check if browser supports CSS Custom Properties (CSS Variables)
  cssVariables: () => {
    if (typeof window === 'undefined') return true;
    return CSS.supports('color', 'var(--test)');
  },
  
  // Check if browser supports Intersection Observer
  intersectionObserver: () => {
    if (typeof window === 'undefined') return true;
    return 'IntersectionObserver' in window;
  },
  
  // Check if browser supports Web Workers
  webWorkers: () => {
    if (typeof window === 'undefined') return true;
    return typeof Worker !== 'undefined';
  },
  
  // Check if browser supports Local Storage
  localStorage: () => {
    if (typeof window === 'undefined') return true;
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Check if browser supports Fetch API
  fetch: () => {
    if (typeof window === 'undefined') return true;
    return 'fetch' in window;
  }
};

export const addBrowserClasses = () => {
  if (typeof window === 'undefined') return;
  
  const browser = getBrowserInfo();
  const html = document.documentElement;
  
  if (browser?.isChrome) html.classList.add('browser-chrome');
  if (browser?.isFirefox) html.classList.add('browser-firefox');
  if (browser?.isSafari) html.classList.add('browser-safari');
  if (browser?.isEdge) html.classList.add('browser-edge');
  if (browser?.isIE) html.classList.add('browser-ie');
  
  // Add feature support classes
  if (!supportsFeature.cssGrid()) html.classList.add('no-css-grid');
  if (!supportsFeature.flexbox()) html.classList.add('no-flexbox');
  if (!supportsFeature.cssVariables()) html.classList.add('no-css-variables');
};

export const polyfillFetch = () => {
  if (typeof window === 'undefined') return;
  
  if (!supportsFeature.fetch()) {
    // Fallback for older browsers
    console.warn('Fetch API not supported. Consider adding a polyfill.');
  }
};

export const getViewportSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };
};

export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  
  const viewport = getViewportSize();
  return viewport.width < 768;
};

export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  
  const viewport = getViewportSize();
  return viewport.width >= 768 && viewport.width < 1024;
};

export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  
  const viewport = getViewportSize();
  return viewport.width >= 1024;
};

// Smooth scroll polyfill for older browsers
export const smoothScrollTo = (element: HTMLElement | null, options?: ScrollIntoViewOptions) => {
  if (!element) return;
  
  if ('scrollBehavior' in document.documentElement.style) {
    element.scrollIntoView({ behavior: 'smooth', ...options });
  } else {
    // Fallback for browsers that don't support smooth scrolling
    element.scrollIntoView();
  }
};

// Format currency with browser locale support
export const formatCurrency = (amount: number, currency = 'INR', locale = 'en-IN') => {
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (e) {
      // Fallback for unsupported locales
      return `₹${amount.toLocaleString()}`;
    }
  }
  
  // Fallback for browsers without Intl support
  return `₹${amount.toLocaleString()}`;
};

// Format date with browser locale support
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
      }).format(dateObj);
    } catch (e) {
      return dateObj.toLocaleDateString();
    }
  }
  
  return dateObj.toLocaleDateString();
};