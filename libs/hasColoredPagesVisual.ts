import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pdf } from 'pdf-to-img'
import sharp from 'sharp'

export const hasColoredPagesVisual = async (inputFile: string): Promise<boolean> => {
  const startTime = performance.now()
  console.log(`[PERF] Starting hasColoredPagesVisual for file: ${inputFile}`)

  const tmpDir = path.join(process.cwd(), 'tmp-pdf-images')
  const pageTimings: number[] = []

  try {
    // Create temporary directory
    const cleanupStartTime = performance.now()
    await cleanupTmpDir(tmpDir)
    await fs.mkdir(tmpDir, { recursive: true })
    const cleanupTime = performance.now() - cleanupStartTime
    console.log(`[PERF] Directory setup completed in ${cleanupTime.toFixed(2)}ms`)

    // Load PDF document
    const pdfLoadStartTime = performance.now()
    const document = await pdf(inputFile, { scale: 0.25 })
    const pdfLoadTime = performance.now() - pdfLoadStartTime
    console.log(`[PERF] PDF loading completed in ${pdfLoadTime.toFixed(2)}ms`)

    let pageCounter = 1
    let hasColoredContent = false

    // Process each page
    for await (const imageBuffer of document) {
      const pageStartTime = performance.now()

      // Write image to disk
      const writeStartTime = performance.now()
      const imagePath = path.join(tmpDir, `page${pageCounter}.jpeg`)
      await fs.writeFile(imagePath, imageBuffer)
      const writeTime = performance.now() - writeStartTime

      // Check if this page has colored pixels
      const colorCheckStartTime = performance.now()
      const pageHasColor = await isImageFullyWhite(imagePath)
      const colorCheckTime = performance.now() - colorCheckStartTime

      const totalPageTime = performance.now() - pageStartTime
      pageTimings.push(totalPageTime)

      console.log(
        `[PERF] Page ${pageCounter}: write=${writeTime.toFixed(2)}ms, color_check=${colorCheckTime.toFixed(2)}ms, total=${totalPageTime.toFixed(2)}ms`,
      )

      if (pageHasColor) {
        hasColoredContent = true
        console.log(`Page ${pageCounter} has no colored pixels`)
        break // Early exit when we find colored content
      }

      pageCounter++
    }

    const totalProcessingTime = performance.now() - startTime
    const avgPageTime = pageTimings.length > 0 ? pageTimings.reduce((a, b) => a + b, 0) / pageTimings.length : 0
    console.log(
      `[PERF] Processing completed: ${pageCounter - 1} pages in ${totalProcessingTime.toFixed(2)}ms (avg ${avgPageTime.toFixed(2)}ms/page)`,
    )

    return hasColoredContent
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Error checking for colored pages: ${errorMessage}`)
  } finally {
    // Clean up temporary files
    try {
      const cleanupStartTime = performance.now()
      await cleanupTmpDir(tmpDir)
      const cleanupTime = performance.now() - cleanupStartTime
      console.log(`[PERF] Final cleanup completed in ${cleanupTime.toFixed(2)}ms`)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary directory:', cleanupError)
    }

    const totalTime = performance.now() - startTime
    console.log(`[PERF] Total execution time: ${totalTime.toFixed(2)}ms`)
  }
}

export async function isImageFullyWhite(filePath: string): Promise<boolean> {
  const sharpStartTime = performance.now()
  const { data, info } = await sharp(filePath).resize(50, 50).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const sharpTime = performance.now() - sharpStartTime

  const channels = info.channels // usually 4 (RGBA)
  const length = data.length

  const pixelAnalysisStartTime = performance.now()
  for (let i = 0; i < length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = channels === 4 ? data[i + 3] : 255

    if (!(r === 255 && g === 255 && b === 255 && a === 255)) {
      const pixelAnalysisTime = performance.now() - pixelAnalysisStartTime
      const totalTime = performance.now() - sharpStartTime
      console.log(
        `[PERF] isImageFullyWhite: sharp=${sharpTime.toFixed(2)}ms, pixel_analysis=${pixelAnalysisTime.toFixed(2)}ms, total=${totalTime.toFixed(2)}ms (found color)`,
      )
      return false
    }
  }
  const pixelAnalysisTime = performance.now() - pixelAnalysisStartTime
  const totalTime = performance.now() - sharpStartTime
  console.log(
    `[PERF] isImageFullyWhite: sharp=${sharpTime.toFixed(2)}ms, pixel_analysis=${pixelAnalysisTime.toFixed(2)}ms, total=${totalTime.toFixed(2)}ms (fully white)`,
  )
  return true
}
async function cleanupTmpDir(tmpDir: string): Promise<void> {
  try {
    const files = await fs.readdir(tmpDir)

    // Delete all files in the directory
    for (const file of files) {
      await fs.unlink(path.join(tmpDir, file))
    }

    // Remove the directory itself
    await fs.rmdir(tmpDir)
  } catch (error) {
    // Directory might not exist or already be cleaned up
    // This is not a critical error
  }
}
