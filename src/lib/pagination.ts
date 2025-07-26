/**
 * Pagination utilities for handling large data sets
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  filters?: Record<string, any>;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export class PaginationHelper {
  private options: Required<PaginationOptions>;

  constructor(options: PaginationOptions = {}) {
    this.options = {
      defaultLimit: 20,
      maxLimit: 100,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      ...options,
    };
  }

  /**
   * Parse and validate pagination parameters
   */
  parseParams(params: PaginationParams): {
    page: number;
    limit: number;
    skip: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    filters: Record<string, any>;
  } {
    const page = Math.max(1, parseInt(String(params.page || 1)));
    const limit = Math.min(
      this.options.maxLimit,
      Math.max(1, parseInt(String(params.limit || this.options.defaultLimit)))
    );
    const skip = (page - 1) * limit;
    const sortBy = params.sortBy || this.options.defaultSortBy;
    const sortOrder = params.sortOrder || this.options.defaultSortOrder;
    const search = params.search?.trim() || undefined;
    const filters = params.filters || {};

    return {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      search,
      filters,
    };
  }

  /**
   * Create paginated response
   */
  createResponse<T>(
    data: T[],
    total: number,
    params: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      filters?: Record<string, any>;
    }
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / params.limit);
    const hasNext = params.page < totalPages;
    const hasPrev = params.page > 1;

    return {
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      sorting: {
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      filters: params.filters,
    };
  }

  /**
   * Generate Prisma orderBy clause
   */
  getPrismaOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, any> {
    // Handle nested sorting (e.g., 'account.name')
    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      return {
        [relation]: {
          [field]: sortOrder,
        },
      };
    }

    return {
      [sortBy]: sortOrder,
    };
  }

  /**
   * Generate Prisma where clause for search and filters
   */
  getPrismaWhere(
    search?: string,
    filters: Record<string, any> = {},
    searchFields: string[] = []
  ): Record<string, any> {
    const where: Record<string, any> = {};

    // Add search conditions
    if (search && searchFields.length > 0) {
      where.OR = searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive',
        },
      }));
    }

    // Add filter conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          where[key] = { in: value };
        } else if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
          // Date range filter
          where[key] = {
            gte: value.from,
            lte: value.to,
          };
        } else {
          where[key] = value;
        }
      }
    });

    return where;
  }
}

// Investment-specific pagination helper
export class InvestmentPaginationHelper extends PaginationHelper {
  constructor() {
    super({
      defaultLimit: 20,
      maxLimit: 100,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });
  }

  /**
   * Get Prisma where clause for investment search and filters
   */
  getInvestmentWhere(search?: string, filters: Record<string, any> = {}): Record<string, any> {
    const searchFields = ['name', 'symbol', 'notes'];
    return this.getPrismaWhere(search, filters, searchFields);
  }

  /**
   * Get valid sort fields for investments
   */
  getValidSortFields(): string[] {
    return [
      'name',
      'type',
      'buyDate',
      'createdAt',
      'updatedAt',
      'buyPrice',
      'units',
      'totalValue',
      'account.name',
      'goal.name',
    ];
  }

  /**
   * Validate and sanitize sort field
   */
  validateSortField(sortBy: string): string {
    const validFields = this.getValidSortFields();
    return validFields.includes(sortBy) ? sortBy : 'createdAt';
  }
}

// Goal-specific pagination helper
export class GoalPaginationHelper extends PaginationHelper {
  constructor() {
    super({
      defaultLimit: 20,
      maxLimit: 50,
      defaultSortBy: 'targetDate',
      defaultSortOrder: 'asc',
    });
  }

  getGoalWhere(search?: string, filters: Record<string, any> = {}): Record<string, any> {
    const searchFields = ['name', 'description'];
    return this.getPrismaWhere(search, filters, searchFields);
  }

  getValidSortFields(): string[] {
    return [
      'name',
      'targetAmount',
      'targetDate',
      'priority',
      'createdAt',
      'updatedAt',
    ];
  }

  validateSortField(sortBy: string): string {
    const validFields = this.getValidSortFields();
    return validFields.includes(sortBy) ? sortBy : 'targetDate';
  }
}

// Account-specific pagination helper
export class AccountPaginationHelper extends PaginationHelper {
  constructor() {
    super({
      defaultLimit: 20,
      maxLimit: 50,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });
  }

  getAccountWhere(search?: string, filters: Record<string, any> = {}): Record<string, any> {
    const searchFields = ['name', 'notes'];
    return this.getPrismaWhere(search, filters, searchFields);
  }

  getValidSortFields(): string[] {
    return [
      'name',
      'type',
      'createdAt',
      'updatedAt',
    ];
  }

  validateSortField(sortBy: string): string {
    const validFields = this.getValidSortFields();
    return validFields.includes(sortBy) ? sortBy : 'name';
  }
}

// Export singleton instances
export const investmentPagination = new InvestmentPaginationHelper();
export const goalPagination = new GoalPaginationHelper();
export const accountPagination = new AccountPaginationHelper();

// Utility function to extract pagination params from URL search params
export function extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const params: PaginationParams = {};

  const page = searchParams.get('page');
  if (page) params.page = parseInt(page);

  const limit = searchParams.get('limit');
  if (limit) params.limit = parseInt(limit);

  const sortBy = searchParams.get('sortBy');
  if (sortBy) params.sortBy = sortBy;

  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder === 'asc' || sortOrder === 'desc') {
    params.sortOrder = sortOrder;
  }

  const search = searchParams.get('search');
  if (search) params.search = search;

  // Extract filter parameters (any param starting with 'filter_')
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter_')) {
      const filterKey = key.replace('filter_', '');
      // Try to parse as JSON for complex filters, otherwise use as string
      try {
        filters[filterKey] = JSON.parse(value);
      } catch {
        filters[filterKey] = value;
      }
    }
  });

  if (Object.keys(filters).length > 0) {
    params.filters = filters;
  }

  return params;
}

// Utility function to create URL search params from pagination params
export function createPaginationSearchParams(params: PaginationParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.search) searchParams.set('search', params.search);

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const filterKey = `filter_${key}`;
        if (typeof value === 'object') {
          searchParams.set(filterKey, JSON.stringify(value));
        } else {
          searchParams.set(filterKey, value.toString());
        }
      }
    });
  }

  return searchParams;
}

export default PaginationHelper;