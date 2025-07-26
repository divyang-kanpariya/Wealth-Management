import { BreadcrumbItem } from '@/components/ui/Breadcrumb';

export interface BreadcrumbConfig {
  [key: string]: {
    label: string;
    href?: string;
  };
}

const breadcrumbConfig: BreadcrumbConfig = {
  '/': { label: 'Dashboard', href: '/' },
  '/investments': { label: 'Investments', href: '/investments' },
  '/goals': { label: 'Goals', href: '/goals' },
  '/accounts': { label: 'Accounts', href: '/accounts' },
};

export function generateBreadcrumbs(pathname: string, dynamicData?: { [key: string]: string }): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Always start with Dashboard for non-root pages
  if (pathname !== '/') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/',
    });
  }

  // Split the pathname and build breadcrumbs
  const pathSegments = pathname.split('/').filter(segment => segment !== '');
  
  if (pathSegments.length === 0) {
    // Root path
    return [{ label: 'Dashboard', current: true }];
  }

  let currentPath = '';
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Handle dynamic routes (like [id])
    if (segment.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
      // This looks like a UUID, it's likely a dynamic route
      const parentPath = currentPath.replace(`/${segment}`, '');
      const parentConfig = breadcrumbConfig[parentPath];
      
      if (parentConfig) {
        const entityName = dynamicData?.[segment] || 'Details';
        breadcrumbs.push({
          label: entityName,
          href: isLast ? undefined : currentPath,
          current: isLast,
        });
      }
    } else {
      // Static route
      const config = breadcrumbConfig[currentPath];
      if (config) {
        breadcrumbs.push({
          label: config.label,
          href: isLast ? undefined : config.href,
          current: isLast,
        });
      }
    }
  });

  return breadcrumbs;
}

export function getBreadcrumbsForPage(
  pathname: string,
  pageTitle?: string,
  parentPath?: string,
  parentLabel?: string
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with Dashboard for non-root pages
  if (pathname !== '/') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/',
    });
  }

  // Add parent breadcrumb if provided
  if (parentPath && parentLabel) {
    breadcrumbs.push({
      label: parentLabel,
      href: parentPath,
    });
  }

  // Add current page
  if (pathname === '/') {
    return [{ label: 'Dashboard', current: true }];
  } else {
    const config = breadcrumbConfig[pathname];
    const label = pageTitle || config?.label || 'Page';
    
    breadcrumbs.push({
      label,
      current: true,
    });
  }

  return breadcrumbs;
}