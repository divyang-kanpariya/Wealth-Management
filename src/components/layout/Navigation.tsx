import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  current?: boolean;
}

export interface NavigationProps {
  items: NavigationItem[];
  isMobile?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ items, isMobile = false }) => {
  // Use usePathname for App Router, with fallback for safety
  let pathname = '/';
  try {
    pathname = usePathname();
  } catch (error) {
    // Fallback if router is not available (e.g., in tests)
    console.warn('usePathname not available, using default pathname');
  }
  
  const isCurrentPath = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  if (isMobile) {
    return (
      <nav className="space-y-1 px-2 pb-3 pt-2">
        {items.map((item) => {
          const current = isCurrentPath(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                current
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
            >
              <div className="flex items-center">
                {item.icon && (
                  <div className="mr-3 h-5 w-5">
                    {item.icon}
                  </div>
                )}
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex space-x-8">
      {items.map((item) => {
        const current = isCurrentPath(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`${
              current
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            <div className="flex items-center">
              {item.icon && (
                <div className="mr-2 h-4 w-4">
                  {item.icon}
                </div>
              )}
              {item.name}
            </div>
          </Link>
        );
      })}
    </nav>
  );
};

export default Navigation;