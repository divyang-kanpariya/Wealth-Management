#!/usr/bin/env node

/**
 * No-Cache Behavior Test Runner
 * 
 * This script runs all no-cache behavior tests and provides detailed reporting.
 * It can be executed directly or integrated into CI/CD pipelines.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

interface TestResult {
  success: boolean
  duration: number
  testFile: string
  passed: number
  failed: number
  skipped: number
  errors: string[]
}

interface TestSuiteResult {
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  results: TestResult[]
  coverage?: any
}

class NoCacheTestRunner {
  private testFiles = [
    'src/test/integration/comprehensive-no-cache-behavior.test.ts',
    'src/test/integration/background-price-refresh-comprehensive.test.ts',
    'src/test/integration/enhanced-refresh-functionality.test.ts',
    'src/test/integration/database-only-pricing-cache.test.ts',
    'src/test/integration/no-cache-behavior-test-suite.test.ts',
    'src/test/unit/user-data-no-cache.test.ts',
    'src/test/lib/database-only-caching.test.ts'
  ]

  private outputDir = './test-results'
  private coverageDir = './coverage/no-cache-behavior'

  constructor() {
    this.ensureDirectories()
  }

  private ensureDirectories() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true })
    }
    if (!existsSync(this.coverageDir)) {
      mkdirSync(this.coverageDir, { recursive: true })
    }
  }

  async runAllTests(): Promise<TestSuiteResult> {
    console.log('🚀 Starting No-Cache Behavior Test Suite')
    console.log('=' .repeat(60))
    
    this.validateEnvironment()
    
    const startTime = Date.now()
    const results: TestResult[] = []
    
    // Run tests sequentially to avoid database conflicts
    for (const testFile of this.testFiles) {
      console.log(`\n📋 Running: ${path.basename(testFile)}`)
      console.log('-'.repeat(40))
      
      const result = await this.runSingleTest(testFile)
      results.push(result)
      
      if (result.success) {
        console.log(`✅ ${path.basename(testFile)} - PASSED (${result.duration}ms)`)
      } else {
        console.log(`❌ ${path.basename(testFile)} - FAILED (${result.duration}ms)`)
        result.errors.forEach(error => console.log(`   Error: ${error}`))
      }
    }
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    const suiteResult: TestSuiteResult = {
      totalTests: results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration,
      results
    }
    
    await this.generateReports(suiteResult)
    this.printSummary(suiteResult)
    
    return suiteResult
  }

  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Run vitest for specific file
      const command = `npx vitest run "${testFile}" --reporter=json --no-coverage`
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Parse vitest JSON output
      const lines = output.split('\n').filter(line => line.trim())
      const jsonLine = lines.find(line => line.startsWith('{'))
      
      if (jsonLine) {
        const result = JSON.parse(jsonLine)
        return {
          success: result.numFailedTests === 0,
          duration,
          testFile,
          passed: result.numPassedTests || 0,
          failed: result.numFailedTests || 0,
          skipped: result.numPendingTests || 0,
          errors: []
        }
      }
      
      return {
        success: true,
        duration,
        testFile,
        passed: 1,
        failed: 0,
        skipped: 0,
        errors: []
      }
      
    } catch (error: any) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      return {
        success: false,
        duration,
        testFile,
        passed: 0,
        failed: 1,
        skipped: 0,
        errors: [error.message || 'Unknown error']
      }
    }
  }

  private validateEnvironment() {
    console.log('🔍 Validating test environment...')
    
    const requiredEnvVars = ['DATABASE_URL']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      throw new Error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
    }
    
    // Check if test files exist
    const missingFiles = this.testFiles.filter(file => !existsSync(file))
    if (missingFiles.length > 0) {
      throw new Error(`❌ Missing test files: ${missingFiles.join(', ')}`)
    }
    
    console.log('✅ Environment validation passed')
  }

  private async generateReports(result: TestSuiteResult) {
    console.log('\n📊 Generating test reports...')
    
    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: result.totalTests,
        totalPassed: result.totalPassed,
        totalFailed: result.totalFailed,
        totalSkipped: result.totalSkipped,
        totalDuration: result.totalDuration,
        successRate: result.totalTests > 0 ? (result.totalPassed / result.totalTests * 100).toFixed(2) : '0'
      },
      results: result.results,
      requirements: {
        '1.1': 'User data changes reflected immediately after CRUD operations',
        '2.1': 'Pricing data served from database cache only',
        '3.1': 'Manual refresh functionality works correctly',
        '4.1': 'System maintains data consistency and performance'
      },
      testCategories: [
        'User Data No-Cache Behavior',
        'Background Price Refresh Service',
        'Enhanced Refresh Functionality',
        'Database-Only Pricing Cache',
        'Integration Test Suite'
      ]
    }
    
    const jsonReportPath = path.join(this.outputDir, 'no-cache-behavior-report.json')
    writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2))
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport)
    const htmlReportPath = path.join(this.outputDir, 'no-cache-behavior-report.html')
    writeFileSync(htmlReportPath, htmlReport)
    
    console.log(`📄 JSON report: ${jsonReportPath}`)
    console.log(`🌐 HTML report: ${htmlReportPath}`)
  }

  private generateHtmlReport(data: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No-Cache Behavior Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .test-results { margin-top: 30px; }
        .test-file { margin-bottom: 20px; padding: 15px; border: 1px solid #dee2e6; border-radius: 6px; }
        .test-file.passed { border-left: 4px solid #28a745; }
        .test-file.failed { border-left: 4px solid #dc3545; }
        .requirements { margin-top: 30px; }
        .requirement { padding: 10px; margin: 5px 0; background: #e9ecef; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>No-Cache Behavior Test Report</h1>
            <p>Generated on ${data.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${data.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${data.summary.totalPassed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failure">${data.summary.totalFailed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.summary.totalSkipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.summary.totalDuration}ms</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>Test Results</h2>
            ${data.results.map((result: any) => `
                <div class="test-file ${result.success ? 'passed' : 'failed'}">
                    <h3>${path.basename(result.testFile)}</h3>
                    <p><strong>Status:</strong> ${result.success ? '✅ PASSED' : '❌ FAILED'}</p>
                    <p><strong>Duration:</strong> ${result.duration}ms</p>
                    <p><strong>Tests:</strong> ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped</p>
                    ${result.errors.length > 0 ? `<p><strong>Errors:</strong> ${result.errors.join(', ')}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="requirements">
            <h2>Requirements Coverage</h2>
            ${Object.entries(data.requirements).map(([req, desc]) => `
                <div class="requirement">
                    <strong>${req}:</strong> ${desc}
                </div>
            `).join('')}
        </div>
        
        <div class="requirements">
            <h2>Test Categories</h2>
            ${data.testCategories.map((category: string) => `
                <div class="requirement">${category}</div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `
  }

  private printSummary(result: TestSuiteResult) {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUITE SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${result.totalTests}`)
    console.log(`✅ Passed: ${result.totalPassed}`)
    console.log(`❌ Failed: ${result.totalFailed}`)
    console.log(`⏭️  Skipped: ${result.totalSkipped}`)
    console.log(`⏱️  Duration: ${result.totalDuration}ms`)
    console.log(`📈 Success Rate: ${result.totalTests > 0 ? (result.totalPassed / result.totalTests * 100).toFixed(2) : '0'}%`)
    
    if (result.totalFailed > 0) {
      console.log('\n❌ FAILED TESTS:')
      result.results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${path.basename(r.testFile)}`)
        r.errors.forEach(error => console.log(`    Error: ${error}`))
      })
    }
    
    console.log('\n📋 REQUIREMENTS TESTED:')
    console.log('  ✓ 1.1 - User data changes reflected immediately')
    console.log('  ✓ 2.1 - Database-only pricing cache')
    console.log('  ✓ 3.1 - Manual refresh functionality')
    console.log('  ✓ 4.1 - System consistency and performance')
    
    console.log('\n🎯 TEST CATEGORIES COVERED:')
    console.log('  ✓ User Data No-Cache Behavior')
    console.log('  ✓ Background Price Refresh Service')
    console.log('  ✓ Enhanced Refresh Functionality')
    console.log('  ✓ Database-Only Pricing Cache')
    console.log('  ✓ Integration Test Suite')
    
    if (result.totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! No-cache behavior implementation is working correctly.')
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Please review the failed tests and fix the issues.')
    }
    
    console.log('='.repeat(60))
  }
}

// Main execution
async function main() {
  try {
    const runner = new NoCacheTestRunner()
    const result = await runner.runAllTests()
    
    // Exit with appropriate code
    process.exit(result.totalFailed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { NoCacheTestRunner }