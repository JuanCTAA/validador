#!/usr/bin/env node

import fs from 'fs'

const PERFORMANCE_HISTORY_FILE = 'test/performance/performance-history.json'

function checkPerformanceRegression(): void {
  console.log('🔍 Checking for performance regression...')

  if (!fs.existsSync(PERFORMANCE_HISTORY_FILE)) {
    console.log('No performance history available for regression check')
    process.exit(0)
  }

  try {
    const historyContent = fs.readFileSync(PERFORMANCE_HISTORY_FILE, 'utf8')
    const history: PerformanceHistory = JSON.parse(historyContent)

    if (history.results.length < 2) {
      console.log('Not enough data for regression analysis')
      process.exit(0)
    }

    const results = history.results
    const currentRun = results.slice(-1)[0]
    const previousRun = results.slice(-2, -1)[0]

    if (!currentRun || !previousRun) {
      console.log('Unable to compare runs')
      process.exit(0)
    }

    const currentAvg = currentRun.duration
    const previousAvg = previousRun.duration
    const regressionThreshold = 20 // 20% slower is considered a regression

    const changePercent = ((currentAvg - previousAvg) / previousAvg) * 100

    console.log(`Performance change: ${changePercent.toFixed(2)}%`)

    if (changePercent > regressionThreshold) {
      console.error(`❌ Performance regression detected: ${changePercent.toFixed(2)}% slower`)
      console.error(`Current: ${(currentAvg / 1000).toFixed(2)}s, Previous: ${(previousAvg / 1000).toFixed(2)}s`)
      process.exit(1)
    } else if (changePercent < -5) {
      console.log(`🎉 Performance improvement: ${Math.abs(changePercent).toFixed(2)}% faster`)
    } else {
      console.log(`✅ Performance is stable`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error checking performance regression:', errorMessage)
    process.exit(1)
  }
}

// Main execution
import { fileURLToPath } from 'url'
import type { PerformanceHistory } from '../models/performance-history'

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  checkPerformanceRegression()
}

export { checkPerformanceRegression }
