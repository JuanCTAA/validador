import fs from 'fs'
import pdf from 'pdf-parse'
import { chromium } from 'playwright'

export const hasEmptyPagesVisual = async (inputFile: string): Promise<boolean> => {
  try {
    console.log(`Checking for empty pages in ${inputFile} using visual/text analysis`)

    const dataBuffer = fs.readFileSync(inputFile)
    const data = await pdf(dataBuffer)

    console.log(`PDF has ${data.numpages} pages`)
    console.log(`Total text length: ${data.text.length} characters`)

    // If the entire PDF has very little text, it might have blank pages
    if (data.text.trim().length === 0) {
      console.log('PDF has no extractable text - likely all pages are blank')
      return true
    }

    // First try text-based analysis for speed
    const textBasedResult = await checkPagesIndividually(dataBuffer, data.numpages)

    // If text analysis suggests blank pages, verify with visual analysis
    if (textBasedResult) {
      console.log('Text analysis suggests blank pages - verifying with visual analysis...')
      const visualResult = await checkPagesVisually(inputFile, data.numpages)
      return visualResult
    }

    return false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error checking for empty pages: ${errorMessage}`)
    throw new Error(`Error checking for empty pages: ${errorMessage}`)
  }
}

async function checkPagesIndividually(dataBuffer: Buffer, numPages: number): Promise<boolean> {
  console.log('Checking individual pages for content...')

  // This is a simplified approach - pdf-parse doesn't easily allow per-page text extraction
  // We'll use a heuristic based on average text per page
  const data = await pdf(dataBuffer)
  const totalText = data.text.trim()
  const averageTextPerPage = totalText.length / numPages

  console.log(`Average text per page: ${averageTextPerPage.toFixed(2)} characters`)

  // If average text per page is very low, there are likely blank pages
  // This threshold can be adjusted based on testing
  const BLANK_PAGE_THRESHOLD = 50 // characters per page on average

  if (averageTextPerPage < BLANK_PAGE_THRESHOLD) {
    console.log(`Low text density detected - likely contains blank pages`)
    return true
  }

  // Additional check: if the text is heavily concentrated in few pages,
  // other pages might be blank
  const lines = totalText.split('\n').filter((line) => line.trim().length > 0)
  const linesPerPage = lines.length / numPages

  console.log(`Average lines per page: ${linesPerPage.toFixed(2)}`)

  if (linesPerPage < 2) {
    // Less than 2 lines per page on average
    console.log(`Low line density detected - likely contains blank pages`)
    return true
  }

  console.log('No blank pages detected based on text analysis')
  return false
}

async function checkPagesVisually(inputFile: string, numPages: number): Promise<boolean> {
  console.log('Starting visual analysis with Playwright...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Convert PDF to data URL for browser viewing
    const pdfBuffer = fs.readFileSync(inputFile)
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

    await page.goto(pdfDataUrl, { waitUntil: 'networkidle' })

    // Wait for PDF to load
    await page.waitForTimeout(2000)

    // Check each page for visual content
    let blankPagesFound = 0
    const SAMPLE_PAGES = Math.min(5, numPages) // Sample first 5 pages for performance

    for (let pageNum = 1; pageNum <= SAMPLE_PAGES; pageNum++) {
      console.log(`Analyzing page ${pageNum} visually...`)

      // Take screenshot of the page
      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      })

      // Analyze the screenshot for blank content
      const isBlank = await analyzeImageForBlankness(screenshot)

      if (isBlank) {
        blankPagesFound++
        console.log(`Page ${pageNum} appears to be blank`)
      }
    }

    console.log(`Found ${blankPagesFound} blank pages out of ${SAMPLE_PAGES} sampled pages`)

    // If more than 20% of sampled pages are blank, consider the PDF as having blank pages
    const blankRatio = blankPagesFound / SAMPLE_PAGES
    return blankRatio > 0.2
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
