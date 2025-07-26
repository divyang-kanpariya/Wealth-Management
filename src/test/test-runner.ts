#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Personal Wealth Management Application
 * 
 * This script orchestrates the execution of all test suites and provides
 * detailed reporting on test coverage and results.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

interface TestSuite {
  name: string
  command: string
  description: string
  required: boolean
}

interface TestResult {
  suite: string
  passed: boolean
  duration: number
  coverage?: number
  errors?: string[]
}

class TestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      command: 'npm run test:unit',
      description: 'Tests for individual functions and components',
      required: true
    },
    {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      description: 'Tests for API endpoints and database operations',
      required: true
    },
    {
      name: 'E2E Tests',
      command: 'npm run test:e2e',
      description: 'End-to-end user workflow tests',
      required: true
    },
    {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      description: 'Performance and load testing',
      required: false
    },
    {
      name: 'API Tests',
      command: 'npm run test:api',
      description: 'API endpoint validation tests',
      required: true
    }
  ]

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite')
    console.log('=====================================\n')
    
    this.startTime = Date.now()

    // Ensure coverage directory exists
    if (!existsSync('coverage')) {
      mkdirSync('coverage', { recursive: true })
    }

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite)
    }

    // Generate final report
    this.generateReport()
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}`)
    console.log(`   ${suite.description}`)
    console.log(`   Command: ${suite.command}\n`)

    const suiteStartTime = Date.now()
    let result: TestResult

    try {
      const output = execSync(suite.command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      })

      const duration = Date.now() - suiteStartTime
      const coverage = this.extractCoverage(output)

      result = {
        suite: suite.name,
        passed: true,
        duration,
        coverage
      }

      console.log(`✅ ${suite.name} passed in ${duration}ms`)
      if (coverage) {
        console.log(`   Coverage: ${coverage}%`)
      }
      console.log()

    } catch (error: any) {
      const duration = Date.now() - suiteStartTime
      const errors = this.extractErrors(error.stdout || error.message)

      result = {
        suite: suite.name,
        passed: false,
        duration,
        errors
      }

      console.log(`❌ ${suite.name} failed in ${duration}ms`)
      if (errors.length > 0) {
        console.log('   Errors:')
        errors.forEach(err => console.log(`   - ${err}`))
      }
      console.log()

      // If this is a required test suite and it fails, we might want to stop
      if (suite.required && process.env.CI) {
        console.log('💥 Required test suite failed in CI environment')
        process.exit(1)
      }
    }

    this.results.push(result)
  }

  private extractCoverage(output: string): number | undefined {
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/)
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined
  }

  private extractErrors(output: string): string[] {
    const lines = output.split('\n')
    const errors: string[] = []

    for (const line of lines) {
      if (line.includes('FAIL') || line.includes('Error:') || line.includes('✗')) {
        errors.push(line.trim())
      }
    }

    return errors.slice(0, 5) // Limit to first 5 errors
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.passed).length
    const totalTests = this.results.length

    console.log('\n📊 Test Results Summary')
    console.log('=======================')
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Passed: ${passedTests}/${totalTests}`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`)

    // Detailed results
    console.log('📋 Detailed Results:')
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      const coverage = result.coverage ? ` (${result.coverage}% coverage)` : ''
      console.log(`${status} ${result.suite}: ${result.duration}ms${coverage}`)
      
      if (!result.passed && result.errors) {
        result.errors.forEach(error => {
          console.log(`   └─ ${error}`)
        })
      }
    })

    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      console.log(`\n📈 Average Coverage: ${avgCoverage.toFixed(1)}%`)
    }

    // Generate JSON report
    this.generateJsonReport()

    // Exit with appropriate code
    const allPassed = this.results.every(r => r.passed)
    if (!allPassed) {
      console.log('\n💥 Some tests failed!')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed!')
    }
  }

  private generateJsonReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        successRate: (this.results.filter(r => r.passed).length / this.results.length) * 100
      }
    }

    const reportPath = path.join('coverage', 'test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }
}

// CLI execution
if (require.main === module) {
  const runner = new TestRunner()
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { TestRunner }