#!/usr/bin/env node

import fs from 'fs'
// Main execution
import { fileURLToPath } from 'url'
import type { PerformanceHistory } from '../models/performance-history'
import type { PerformanceResult } from '../models/performance-result'

const PERFORMANCE_HISTORY_FILE = 'test/performance/performance-history.json'
const OUTPUT_FILE = 'docs/PERFORMANCE_EXECUTION_HISTORY.md'

function generatePerformanceHistoryReadme(): void {
  console.log('📊 Generating performance execution history README...')

  // Check if performance history exists
  if (!fs.existsSync(PERFORMANCE_HISTORY_FILE)) {
    console.log('❌ No performance history found')
    return
  }

  try {
    // Load performance history
    const historyContent = fs.readFileSync(PERFORMANCE_HISTORY_FILE, 'utf8')
    const history: PerformanceHistory = JSON.parse(historyContent)

    if (history.results.length === 0) {
      console.log('❌ No performance results available')
      return
    }

    console.log(`📊 Processing ${history.results.length} performance results`)

    // Group results by filename
    const resultsByFile = new Map<string, PerformanceResult[]>()

    history.results.forEach((result) => {
      if (!resultsByFile.has(result.filename)) {
        resultsByFile.set(result.filename, [])
      }
      resultsByFile.get(result.filename)!.push(result)
    })

    // Sort files by name
    const sortedFiles = Array.from(resultsByFile.keys()).sort()

    // Generate README content
    let content = '# Performance Execution History\n\n'
    content +=
      'This document contains the complete execution history of PDF validation performance tests, organized by file.\n\n'
    content += `**Last Updated:** ${new Date().toISOString()}\n`
    content += `**Total Test Runs:** ${history.results.length}\n`
    content += `**Files Tested:** ${resultsByFile.size}\n\n`

    // Add summary statistics
    const allDurations = history.results.map((r) => r.duration)
    const avgDuration = allDurations.reduce((a, b) => a + b, 0) / allDurations.length
    const minDuration = Math.min(...allDurations)
    const maxDuration = Math.max(...allDurations)

    content += '## Overall Statistics\n\n'
    content += `- **Average Duration:** ${(avgDuration / 1000).toFixed(2)}s\n`
    content += `- **Fastest Test:** ${(minDuration / 1000).toFixed(2)}s\n`
    content += `- **Slowest Test:** ${(maxDuration / 1000).toFixed(2)}s\n\n`

    // Add table of contents
    content += '## Files\n\n'
    sortedFiles.forEach((filename) => {
      const anchor = filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      content += `- [${filename}](#${anchor})\n`
    })
    content += '\n'

    // Generate tables for each file
    sortedFiles.forEach((filename) => {
      const fileResults = resultsByFile.get(filename)!

      // Sort results by timestamp (newest first)
      fileResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      content += `## ${filename}\n\n`

      // File statistics
      const fileDurations = fileResults.map((r) => r.duration)
      const fileAvgDuration = fileDurations.reduce((a, b) => a + b, 0) / fileDurations.length
      const fileMinDuration = Math.min(...fileDurations)
      const fileMaxDuration = Math.max(...fileDurations)
      const fileSize = fileResults[0]?.fileSize || 0

      content += `**File Size:** ${(fileSize / (1024 * 1024)).toFixed(1)} MB\n`
      content += `**Test Runs:** ${fileResults.length}\n`
      content += `**Average Duration:** ${(fileAvgDuration / 1000).toFixed(2)}s\n`
      content += `**Best Time:** ${(fileMinDuration / 1000).toFixed(2)}s\n`
      content += `**Worst Time:** ${(fileMaxDuration / 1000).toFixed(2)}s\n\n`

      // Performance trend
      if (fileResults.length >= 2) {
        const latestDuration = fileResults[0]?.duration || 0
        const previousDuration = fileResults[1]?.duration || 0
        const trendPercent = ((latestDuration - previousDuration) / previousDuration) * 100

        let trendIcon = '📊'
        let trendText = 'stable'

        if (trendPercent > 10) {
          trendIcon = '📈'
          trendText = `${trendPercent.toFixed(1)}% slower`
        } else if (trendPercent < -10) {
          trendIcon = '📉'
          trendText = `${Math.abs(trendPercent).toFixed(1)}% faster`
        }

        content += `**Latest Trend:** ${trendIcon} ${trendText}\n\n`
      }

      // Execution history table
      content += '### Execution History\n\n'
      content += '| Date | Time | Duration (s) | Result | Node Version | Platform |\n'
      content += '|------|------|--------------|--------|--------------|---------|\n'

      fileResults.forEach((result) => {
        const date = new Date(result.timestamp).toISOString().split('T')[0]
        const time = new Date(result.timestamp).toISOString().split('T')[1]?.split('.')[0] || ''
        const duration = (result.duration / 1000).toFixed(2)
        const resultIcon = result.isValid ? '✅ Valid' : '❌ Invalid'
        const nodeVersion = result.nodeVersion
        const platform = result.platform

        content += `| ${date} | ${time} | ${duration} | ${resultIcon} | ${nodeVersion} | ${platform} |\n`
      })

      content += '\n'

      // Performance chart (text-based visualization)
      if (fileResults.length > 1) {
        content += '### Performance Trend\n\n'
        content += '```\n'

        // Create a simple text chart showing last 10 runs
        const chartResults = fileResults.slice(0, 10).reverse()
        const chartDurations = chartResults.map((r) => r.duration / 1000)
        const chartMin = Math.min(...chartDurations)
        const chartMax = Math.max(...chartDurations)
        const chartRange = chartMax - chartMin || 1

        chartResults.forEach((result) => {
          const duration = result.duration / 1000
          const normalized = (duration - chartMin) / chartRange
          const barLength = Math.round(normalized * 30) + 1
          const bar = '█'.repeat(barLength)
          const date = new Date(result.timestamp).toISOString().split('T')[0]

          content += `${date}: ${bar} ${duration.toFixed(2)}s\n`
        })

        content += '```\n\n'
      }

      content += '---\n\n'
    })

    // Add footer
    content += '## Notes\n\n'
    content += '- All durations are measured in seconds\n'
    content += '- Results are sorted by timestamp (newest first)\n'
    content += '- Performance trends compare the latest run with the previous run\n'
    content += '- This document is automatically generated from performance test data\n\n'
    content += `*Generated on ${new Date().toISOString()} from ${history.results.length} test results*\n`

    // Write the README file
    fs.writeFileSync(OUTPUT_FILE, content)

    console.log(`✅ Performance execution history README generated successfully`)
    console.log(`📄 File: ${OUTPUT_FILE}`)
    console.log(`📊 Files documented: ${resultsByFile.size}`)
    console.log(`📈 Total test runs: ${history.results.length}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error generating performance history README:', errorMessage)
    process.exit(1)
  }
}

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  generatePerformanceHistoryReadme()
}

export { generatePerformanceHistoryReadme }
