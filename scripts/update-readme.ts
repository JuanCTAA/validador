#!/usr/bin/env node

import fs from 'fs'
// Main execution
import { fileURLToPath } from 'url'
import type { PerformanceHistory } from '../models/performance-history'
import type { PerformanceResult } from '../models/performance-result'

const PERFORMANCE_HISTORY_FILE = 'test/performance/performance-history.json'
const README_FILE = 'README.md'

function updateReadmeWithPerformanceResults(): void {
  console.log('🔄 Updating README with performance results...')

  // Check if performance history exists
  if (!fs.existsSync(PERFORMANCE_HISTORY_FILE)) {
    console.log('❌ No performance history found, skipping README update')
    return
  }

  try {
    // Load performance history
    const historyContent = fs.readFileSync(PERFORMANCE_HISTORY_FILE, 'utf8')
    const history: PerformanceHistory = JSON.parse(historyContent)

    if (history.results.length === 0) {
      console.log('❌ No performance results to generate table')
      return
    }

    console.log(`📊 Found ${history.results.length} performance results`)

    // Get last 10 results for the table
    const recentResults = history.results.slice(-10)
    const summary = history.summary

    // Get previous results for comparison
    const previousResults = history.results.slice(-20, -10) // Get 10 results before the recent ones
    const createResultsMap = (results: PerformanceResult[]) => {
      const map = new Map<string, number>()
      results.forEach((result) => {
        map.set(result.filename, result.duration)
      })
      return map
    }
    const previousResultsMap = createResultsMap(previousResults)

    // Generate performance table
    let table = '## Performance Results\n\n'
    table += '### Summary\n'
    table += '- **Total tests run**: ' + summary.totalTests + '\n'
    table += '### Recent Test Results\n\n'
    table += '| File | Duration (s) | Performance Change |\n'
    table += '|------|--------------|--------------------|\n'

    recentResults.forEach((result: PerformanceResult) => {
      const durationSeconds = (result.duration / 1000).toFixed(2)

      // Calculate performance change
      let performanceChange = 'N/A'
      const previousDuration = previousResultsMap.get(result.filename)
      if (previousDuration) {
        const changePercent = ((result.duration - previousDuration) / previousDuration) * 100
        if (changePercent > 5) {
          performanceChange = `🔴 ${changePercent.toFixed(1)}% slower`
        } else if (changePercent < -5) {
          performanceChange = `🟢 ${Math.abs(changePercent).toFixed(1)}% faster`
        } else {
          performanceChange = `⚪ ${Math.abs(changePercent).toFixed(1)}% similar`
        }
      }

      table += `| ${result.filename} | ${durationSeconds} | ${performanceChange} |\n`
    })

    table += '\n*Performance results are automatically updated by GitHub Actions after each test run.*\n'
    table += '\n*Performance changes are compared to the previous test run for the same file.*\n'

    // Write temporary table file
    const tempTableFile = 'performance-table.md'
    fs.writeFileSync(tempTableFile, table)

    // Update README
    if (!fs.existsSync(README_FILE)) {
      console.log('❌ README.md not found')
      fs.unlinkSync(tempTableFile)
      return
    }

    const readmeContent = fs.readFileSync(README_FILE, 'utf8')

    let updatedContent: string
    const lines = readmeContent.split('\n')
    const newLines: string[] = []
    let performanceInserted = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip existing performance section if it exists
      if (line?.startsWith('## Performance Results')) {
        let j = i + 1
        // Skip all lines until the next section or end of file
        while (j < lines.length && !lines[j]?.startsWith('## ')) {
          j++
        }
        i = j - 1 // Will be incremented by the loop
        continue
      }

      newLines.push(line!)

      // Insert performance table after Overview section
      if (line?.startsWith('## Overview') && !performanceInserted) {
        // Find the end of the Overview section
        let j = i + 1
        while (j < lines.length && !lines[j]?.startsWith('## ')) {
          newLines.push(lines[j]!)
          j++
        }

        // Insert performance table
        newLines.push('')
        const tableLines = table.split('\n')
        newLines.push(...tableLines)
        performanceInserted = true

        // Set i to continue from the next section
        i = j - 1 // Will be incremented by the loop
      }
    }

    // If performance section wasn't inserted (no Overview section found), append at end
    if (!performanceInserted) {
      console.log('📝 No Overview section found, appending performance section to README')
      newLines.push('')
      const tableLines = table.split('\n')
      newLines.push(...tableLines)
    } else {
      console.log('📝 Inserted performance section after Overview in README')
    }

    updatedContent = newLines.join('\n')

    // Write updated README
    fs.writeFileSync(README_FILE, updatedContent)

    // Clean up temporary file
    fs.unlinkSync(tempTableFile)

    console.log('✅ README.md updated successfully with performance results')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error updating README:', errorMessage)
    process.exit(1)
  }
}

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  updateReadmeWithPerformanceResults()
}

export { updateReadmeWithPerformanceResults }
