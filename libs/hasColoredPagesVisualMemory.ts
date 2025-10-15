import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fromPath } from 'pdf2pic'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import sharp from 'sharp'

export const hasColoredPagesVisual = async (inputFile: string): Promise<boolean> => {
  const startTime = performance.now()
  console.log(`[PERF] Starting hasColoredPagesVisual for file: ${inputFile}`)

  // Log initial memory usage
  const initialMemory = process.memoryUsage()
  console.log(
    `[PERF] Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB heap, ${Math.round(initialMemory.rss / 1024 / 1024)}MB RSS`,
  )

  const tmpDir = path.join(process.cwd(), 'tmp-pdf-images')
  const pageTimings: number[] = []

  try {
    // Create temporary directory
    const cleanupStartTime = performance.now()
    await cleanupTmpDir(tmpDir)
    await fs.mkdir(tmpDir, { recursive: true })
    const cleanupTime = performance.now() - cleanupStartTime
    console.log(`[PERF] Directory setup completed in ${cleanupTime.toFixed(2)}ms`)

    // Load PDF document with pdf2pic for better memory efficiency
    const pdfLoadStartTime = performance.now()

    // Get file size to determine appropriate density
    const fileStats = await fs.stat(inputFile)
    const fileSizeMB = fileStats.size / (1024 * 1024)

    // Use lower density for larger files to reduce memory usage
    let density = 72
    if (fileSizeMB > 50) {
      density = 50 // Very large files
    } else if (fileSizeMB > 20) {
      density = 60 // Large files
    }

    const options = {
      density,
      format: 'png' as const,
      width: 400,
      height: 400,
      preserveAspectRatio: true,
      saveFilename: 'page',
      savePath: tmpDir,
    }

    const convert = fromPath(inputFile, options)
    const pdfLoadTime = performance.now() - pdfLoadStartTime
    console.log(
      `[PERF] PDF converter initialized in ${pdfLoadTime.toFixed(2)}ms (file: ${fileSizeMB.toFixed(1)}MB, density: ${density})`,
    )

    let hasColoredContent = false

    // Get total page count using pdfjs-dist
    const pageCountStartTime = performance.now()
    const pdfBuffer = await fs.readFile(inputFile)
    const pdfDataArray = new Uint8Array(pdfBuffer)
    const pdfDocument = await pdfjsLib.getDocument({
      data: pdfDataArray,
      standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
    }).promise
    const totalPages = pdfDocument.numPages
    const pageCountTime = performance.now() - pageCountStartTime
    console.log(`[DEBUG] PDF has ${totalPages} pages (detected in ${pageCountTime.toFixed(2)}ms)`)

    // Process each page individually using page-by-page conversion
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const pageStartTime = performance.now()

      // Convert single page
      const convertStartTime = performance.now()
      const result = await convert(pageNumber, { responseType: 'image' })
      const convertTime = performance.now() - convertStartTime

      if (!result || !result.path) {
        console.log(`[DEBUG] No result or path for page ${pageNumber}, skipping`)
        continue
      }

      const imagePath = result.path

      // Check if this page has colored pixels
      const colorCheckStartTime = performance.now()
      const pageHasColor = await isImageFullyWhite(imagePath)
      const colorCheckTime = performance.now() - colorCheckStartTime

      const totalPageTime = performance.now() - pageStartTime
      pageTimings.push(totalPageTime)

      // Log memory usage and trigger garbage collection for memory management
      const currentMemory = process.memoryUsage()
      console.log(
        `[PERF] Page ${pageNumber}: convert=${convertTime.toFixed(2)}ms, color_check=${colorCheckTime.toFixed(2)}ms, total=${totalPageTime.toFixed(2)}ms, heap=${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
      )

      // Force garbage collection every 10 pages or if memory usage is high
      if (pageNumber % 10 === 0 || currentMemory.heapUsed > 500 * 1024 * 1024) {
        if (global.gc) {
          console.log(
            `[PERF] Triggering garbage collection at page ${pageNumber}, heap: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
          )
          global.gc()
          const afterGcMemory = process.memoryUsage()
          console.log(
            `[PERF] After GC: heap=${Math.round(afterGcMemory.heapUsed / 1024 / 1024)}MB (freed ${Math.round((currentMemory.heapUsed - afterGcMemory.heapUsed) / 1024 / 1024)}MB)`,
          )
        }
      }

      // Clean up the temporary image file immediately after processing
      try {
        await fs.unlink(imagePath)
      } catch (cleanupError) {
        console.warn(`Failed to cleanup page ${pageNumber} image:`, cleanupError)
      }

      if (pageHasColor) {
        hasColoredContent = true
        console.log(`Page ${pageNumber} has no colored pixels`)
        break // Early exit when we find colored content
      }
    }

    const totalProcessingTime = performance.now() - startTime
    const avgPageTime = pageTimings.length > 0 ? pageTimings.reduce((a, b) => a + b, 0) / pageTimings.length : 0
    console.log(
      `[PERF] Processing completed: ${pageTimings.length} pages in ${totalProcessingTime.toFixed(2)}ms (avg ${avgPageTime.toFixed(2)}ms/page)`,
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

  // Create Sharp instance with explicit memory management
  let sharpInstance: sharp.Sharp | null = null
  let data: Buffer | null = null

  try {
    sharpInstance = sharp(filePath)

    // Use smaller resize for memory efficiency and limit concurrent operations
    const result = await sharpInstance
      .resize(30, 30, { fit: 'inside' }) // Smaller size to reduce memory usage
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true })

    data = result.data
    const info = result.info
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
  } finally {
    // Explicitly destroy Sharp instance and clear references
    if (sharpInstance) {
      sharpInstance.destroy()
    }
    data = null
    sharpInstance = null
  }
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
