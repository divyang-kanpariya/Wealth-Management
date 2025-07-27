import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { expect } from 'vitest'

// API testing utilities
export class ApiTestHelpers {
  static createMockRequest(method: string, body?: any, query?: any): NextApiRequest {
    const { req } = createMocks({
      method: method as any,
      body,
      query,
      headers: {
        'content-type': 'application/json',
      },
    })
    return req as NextApiRequest
  }

  static createMockResponse(): NextApiResponse {
    const { res } = createMocks()
    return res as NextApiResponse
  }

  static async callApiHandler(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
    method: string,
    body?: any,
    query?: any
  ) {
    const req = this.createMockRequest(method, body, query)
    const res = this.createMockResponse()
    
    await handler(req, res)
    
    return {
      status: res.statusCode,
      data: (res as any)._getJSONData(),
      headers: res.getHeaders()
    }
  }

  static expectApiSuccess(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus)
    expect(response.data).toBeDefined()
  }

  static expectApiError(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus)
    expect(response.data).toHaveProperty('error')
    if (expectedMessage) {
      expect(response.data.error).toContain(expectedMessage)
    }
  }

  static expectValidationError(response: any) {
    this.expectApiError(response, 400, 'Validation error')
    expect(response.data).toHaveProperty('details')
  }
}

// Database test utilities for API tests
export class ApiDbTestUtils {
  static async withTestTransaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    // This would ideally use database transactions for isolation
    // For now, we'll use cleanup before and after
    try {
      const result = await callback()
      return result
    } finally {
      // Cleanup would happen here
    }
  }
}

// Mock external API responses
export const mockExternalApis = {
  nse: {
    success: (symbol: string, price: number) => ({
      info: {
        symbol,
        companyName: `${symbol} Limited`,
        lastPrice: price,
        change: 5.25,
        pChange: 2.15,
        previousClose: price - 5.25,
        open: price - 2.0,
        dayHigh: price + 10,
        dayLow: price - 15,
        totalTradedVolume: 1234567,
        totalTradedValue: price * 1234567,
        lastUpdateTime: '15-Jan-2024 15:30:00',
        yearHigh: price + 50,
        yearLow: price - 100
      }
    }),
    error: () => ({
      error: 'Symbol not found'
    })
  },
  
  amfi: {
    success: (schemes: Array<{ code: string; name: string; nav: number }>) => {
      const header = 'Scheme Code;ISIN Div Payout/ ISIN Growth;Scheme Name;Net Asset Value;Date'
      const rows = schemes.map(scheme => 
        `${scheme.code};;${scheme.name};${scheme.nav};15-Jan-2024`
      )
      return [header, ...rows].join('\n')
    },
    empty: () => 'Scheme Code;ISIN Div Payout/ ISIN Growth;Scheme Name;Net Asset Value;Date\n'
  }
}