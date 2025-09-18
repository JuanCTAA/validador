import fs from 'fs'
import { chromium } from 'playwright'

export const hasEmptyPagesVisual = async (inputFile: string): Promise<boolean> => {
  try {
    console.log(`Checking for empty pages in ${inputFile} using visual analysis only`)

    // Use only visual analysis - no text parsing to avoid false positives
    const visualResult = await checkPagesVisually(inputFile)
    return visualResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error checking for empty pages: ${errorMessage}`)
    throw new Error(`Error checking for empty pages: ${errorMessage}`)
  }
}

async function checkPagesVisually(inputFile: string): Promise<boolean> {
  console.log('Starting visual analysis with Playwright...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Convert PDF to data URL for browser viewing
    const pdfBuffer = fs.readFileSync(inputFile)
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

    await page.goto(pdfDataUrl, { waitUntil: 'domcontentloaded' })

    // Reduced wait time for PDF to load - most PDFs load quickly
    await page.waitForTimeout(1000)

    // Check pages for visual content with early exit optimization
    // Check all pages in the PDF until we find a blank page or reach the end

    let pageNum = 1
    while (true) {
      console.log(`Analyzing page ${pageNum} visually...`)

      try {
        // Navigate to specific page if possible
        // Most PDF viewers support page navigation via keyboard shortcuts
        if (pageNum > 1) {
          await page.keyboard.press('PageDown')
          await page.waitForTimeout(200) // Reduced wait time for page navigation
        }

        // Take screenshot of the current page
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png',
        })

        // Analyze the screenshot for blank content
        const isBlank = await analyzeImageForBlankness(screenshot)

        if (isBlank) {
          console.log(`Page ${pageNum} appears to be blank - early exit`)
          return true // Early exit as soon as we find one blank page
        }

        // Try to go to next page, if we can't, we've reached the end
        await page.keyboard.press('PageDown')
        await page.waitForTimeout(100) // Minimal wait for navigation

        pageNum++
      } catch (error) {
        console.log(`Could not analyze page ${pageNum}, stopping analysis`)
        break
      }
    }

    console.log(`No blank pages found in the checked pages`)
    return false // No blank pages found
  } finally {
    await browser.close()
  }
}

async function analyzeImageForBlankness(imageBuffer: Buffer): Promise<boolean> {
  // Simple analysis: check if image is mostly white/empty
  // This is a basic implementation - could be enhanced with more sophisticated image analysis

  // For now, we'll use a simple heuristic based on file size
  // Blank pages typically result in smaller image files
  const BLANK_PAGE_SIZE_THRESHOLD = 10000 // bytes

  if (imageBuffer.length < BLANK_PAGE_SIZE_THRESHOLD) {
    return true
  }

  // Could add more sophisticated analysis here:
  // - Pixel histogram analysis
  // - Edge detection
  // - Color variance analysis

  return false
}
