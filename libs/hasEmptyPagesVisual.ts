import fs from 'node:fs/promises'
import path from 'node:path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export const hasEmptyPagesVisual = async (inputFile: string): Promise<boolean> => {
  try {
    const visualResult = await checkPagesVisually(inputFile)
    return visualResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Error checking for empty pages: ${errorMessage}`)
  }
}

async function checkPagesVisually(inputFile: string): Promise<boolean> {
  // Read the PDF file into a buffer and then
  // parse it with PDF.js
  const pdfData = await fs.readFile(inputFile)
  const pdfDataArray = new Uint8Array(pdfData)
  const pdfDocument = await pdfjsLib.getDocument({
    data: pdfDataArray,
    standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
  }).promise

  // Iterate through all the pages in the PDF file
  // and check for empty pages with early exit
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => (item as any).str).join(' ')

    // Check if page has no text content at all
    // Only consider it blank if text is completely empty after trimming whitespace
    const trimmedText = pageText.trim()

    if (trimmedText === '') {
      return true // Early exit as soon as we find one blank page
    }
  }

  return false // No blank pages found
}
