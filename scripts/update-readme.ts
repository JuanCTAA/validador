#!/usr/bin/env node

import fs from 'fs'

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

interface PerformanceSummary {
  lastRun: string
  totalTests: number
  averageDuration: number
  fastestTest: { filename: string; duration: number }
  slowestTest: { filename: string; duration: number }
}

interface PerformanceHistory {
  results: PerformanceResult[]
  summary: PerformanceSummary
}

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

    // Generate performance table
    let table = '## Performance Results\n\n'
    table += 'Last updated: ' + summary.lastRun + '\n\n'
    table += '### Summary\n'
    table += '- **Total tests run**: ' + summary.totalTests + '\n'
    table += '- **Average duration**: ' + summary.averageDuration.toFixed(2) + 'ms\n'
    table +=
      '- **Fastest test**: ' + summary.fastestTest.filename + ' (' + summary.fastestTest.duration.toFixed(2) + 'ms)\n'
    table +=
      '- **Slowest test**: ' + summary.slowestTest.filename + ' (' + summary.slowestTest.duration.toFixed(2) + 'ms)\n\n'

    table += '### Recent Test Results\n\n'
    table += '| Date | File | Size (KB) | Duration (ms) | Valid | Commit |\n'
    table += '|------|------|-----------|---------------|-------|--------|\n'

    recentResults.forEach((result: PerformanceResult) => {
      const date = new Date(result.timestamp).toISOString().split('T')[0]
      const sizeKB = (result.fileSize / 1024).toFixed(1)
      const shortCommit = result.gitCommit ? result.gitCommit.substring(0, 7) : 'unknown'
      const validIcon = result.isValid ? '✅' : '❌'

      table += `| ${date} | ${result.filename} | ${sizeKB} | ${result.duration.toFixed(2)} | ${validIcon} | ${shortCommit} |\n`
    })

    table += '\n*Performance results are automatically updated by GitHub Actions after each test run.*\n'

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
    if (readmeContent.includes('## Performance Results')) {
      console.log('📝 Replacing existing performance section in README')

      // Replace existing performance section
      const lines = readmeContent.split('\n')
      const newLines: string[] = []
      let inPerformanceSection = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line?.startsWith('## Performance Results')) {
          inPerformanceSection = true
          // Insert the new table content
          const tableLines = table.split('\n')
          newLines.push(...tableLines)
        } else if (line?.startsWith('## ') && inPerformanceSection) {
          // We've reached the next section
          inPerformanceSection = false
          newLines.push(line)
        } else if (!inPerformanceSection) {
          newLines.push(line!)
        }
        // Skip lines that are part of the old performance section
      }

      updatedContent = newLines.join('\n')
    } else {
      console.log('📝 Appending performance section to README')

      // Append performance section at the end
      updatedContent = readmeContent.trimEnd() + '\n\n' + table
    }

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

// Main execution
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  updateReadmeWithPerformanceResults()
}

export { updateReadmeWithPerformanceResults }
