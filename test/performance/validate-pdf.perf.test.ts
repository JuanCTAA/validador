import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { describe, test } from 'vitest'
import { hasEmptyPagesGhostscript } from '../../libs/hasEmptyPagesGhostscript.js'

interface PerformanceResult {
  timestamp: string
  testName: string
  filename: string
  fileSize: number
  duration: number
  isValid: boolean
  gitCommit?: string
  nodeVersion: string
  platform: string
  arch: string
}

interface PerformanceHistory {
  results: PerformanceResult[]
  summary: {
    lastRun: string
    totalTests: number
  }
}

const PERFORMANCE_HISTORY_FILE = 'test/performance/performance-history.json'
const MAX_HISTORY_ENTRIES = 1000 // Keep last 1000 test runs

// Ensure performance directory exists
if (!fs.existsSync('test/performance')) {
  fs.mkdirSync('test/performance', { recursive: true })
}

function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath)
  return stats.size
}

function getGitCommit(): string {
  try {
    const { execSync } = require('child_process')
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function loadPerformanceHistory(): PerformanceHistory {
  if (!fs.existsSync(PERFORMANCE_HISTORY_FILE)) {
    return {
      results: [],
      summary: {
        lastRun: '',
        totalTests: 0,
      },
    }
  }

  try {
    return JSON.parse(fs.readFileSync(PERFORMANCE_HISTORY_FILE, 'utf8'))
  } catch {
    return {
      results: [],
      summary: {
        lastRun: '',
        totalTests: 0,
      },
    }
  }
}

function savePerformanceHistory(history: PerformanceHistory): void {
  // Keep only the last MAX_HISTORY_ENTRIES
  if (history.results.length > MAX_HISTORY_ENTRIES) {
    history.results = history.results.slice(-MAX_HISTORY_ENTRIES)
  }

  fs.writeFileSync(PERFORMANCE_HISTORY_FILE, JSON.stringify(history, null, 2))
}

function updateSummary(history: PerformanceHistory): void {
  if (history.results.length === 0) return

  const currentRun = history.results[history.results.length - 1]
  history.summary.lastRun = currentRun!.timestamp
  history.summary.totalTests = history.results.length
}

async function measurePerformance(
  testName: string,
  filePath: string,
  expectedValid: boolean,
): Promise<PerformanceResult> {
  const filename = path.basename(filePath)
  const fileSize = getFileSize(filePath)

  console.log(`🚀 Performance test: ${testName} - ${filename} (${(fileSize / 1024).toFixed(2)} KB)`)

  const startTime = performance.now()
  const isValid = !(await hasEmptyPagesGhostscript(filePath))
  const endTime = performance.now()

  const duration = endTime - startTime

  console.log(`✅ Completed in ${(duration / 1000).toFixed(2)}s - Result: ${isValid ? 'valid' : 'invalid'}`)

  // Verify the result matches expectation
  if (isValid !== expectedValid) {
    console.warn(`⚠️  Warning: Expected ${expectedValid ? 'valid' : 'invalid'} but got ${isValid ? 'valid' : 'invalid'}`)
  }

  return {
    timestamp: new Date().toISOString(),
    testName,
    filename,
    fileSize,
    duration,
    isValid,
    gitCommit: getGitCommit(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }
}

function getPdfFilesFromFolder(folderPath: string): string[] {
  return fs
    .readdirSync(folderPath)
    .filter((file) => path.extname(file).toLowerCase() === '.pdf')
    .map((file) => path.join(folderPath, file))
}

// Get test files
const validPdfs = getPdfFilesFromFolder('test/fixtures/valids')
const invalidPdfs = getPdfFilesFromFolder('test/fixtures/invalids')

describe('PDF Validation Performance Tests', () => {
  const performanceResults: PerformanceResult[] = []

  // Test valid PDFs
  test.each(validPdfs.map((filePath) => ({ filePath, testType: 'Valid PDF Test', expected: true })))(
    'Performance: Valid PDF - $filePath',
    async ({ filePath, testType, expected }) => {
      const result = await measurePerformance(testType, filePath, expected)
      performanceResults.push(result)
    },
  )

  // Test invalid PDFs
  test.each(invalidPdfs.map((filePath) => ({ filePath, testType: 'Invalid PDF Test', expected: false })))(
    'Performance: Invalid PDF - $filePath',
    async ({ filePath, testType, expected }) => {
      const result = await measurePerformance(testType, filePath, expected)
      performanceResults.push(result)
    },
  )

  // Save results after all tests
  test('Save performance results', async () => {
    if (performanceResults.length === 0) {
      console.log('No performance results to save')
      return
    }

    const history = loadPerformanceHistory()
    history.results.push(...performanceResults)
    updateSummary(history)
    savePerformanceHistory(history)

    console.log(`\n📊 Performance Test Summary:`)
    console.log(`Total tests run: ${performanceResults.length}`)
    console.log(
      `Average duration: ${(performanceResults.reduce((a, b) => a + b.duration, 0) / performanceResults.length / 1000).toFixed(2)}s`,
    )
    console.log(`Fastest test: ${(Math.min(...performanceResults.map((r) => r.duration)) / 1000).toFixed(2)}s`)
    console.log(`Slowest test: ${(Math.max(...performanceResults.map((r) => r.duration)) / 1000).toFixed(2)}s`)
    console.log(`Results saved to: ${PERFORMANCE_HISTORY_FILE}`)

    // Compare with previous runs if available
    if (history.results.length > performanceResults.length) {
      const currentAverage = performanceResults.reduce((a, b) => a + b.duration, 0) / performanceResults.length
      const previousResults = history.results.slice(-performanceResults.length * 2, -performanceResults.length)
      if (previousResults.length > 0) {
        const previousAverage = previousResults.reduce((a, b) => a + b.duration, 0) / previousResults.length
        const improvement = ((previousAverage - currentAverage) / previousAverage) * 100

        if (improvement > 0) {
          console.log(`🎉 Performance improved by ${improvement.toFixed(2)}% compared to previous run`)
        } else {
          console.log(`📉 Performance decreased by ${Math.abs(improvement).toFixed(2)}% compared to previous run`)
        }
      }
    }
  })
})
