import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { pdf } from './convert-pdf-to-img'

export const hasColoredPagesVisual = async (inputFile: string): Promise<boolean> => {
  const startTime = performance.now()
  console.log(`[PERF] Starting hasColoredPagesVisual for file: ${inputFile}`)

  // Log initial memory usage
  const initialMemory = process.memoryUsage()
  console.log(
    `[PERF] Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB heap, ${Math.round(initialMemory.rss / 1024 / 1024)}MB RSS`,
  )

  const tmpDir = path.join(process.cwd(), 'tmp-pdf-images')
  const imagePaths: string[] = []

  try {
    // Create temporary directory
    const cleanupStartTime = performance.now()
    await cleanupTmpDir(tmpDir)
    await fs.mkdir(tmpDir, { recursive: true })
    const cleanupTime = performance.now() - cleanupStartTime
    console.log(`[PERF] Directory setup completed in ${cleanupTime.toFixed(2)}ms`)

    // Load PDF document with lower scale for memory efficiency
    const pdfLoadStartTime = performance.now()

    // Get file size to determine appropriate scale
    const fileStats = await fs.stat(inputFile)
    const fileSizeMB = fileStats.size / (1024 * 1024)

    // Use lower scale for larger files to reduce memory usage
    let scale = 0.25
    if (fileSizeMB > 50) {
      scale = 0.15 // Very large files
      console.log(`[PERF] Large file detected (${fileSizeMB.toFixed(1)}MB), using reduced scale: ${scale}`)
    } else if (fileSizeMB > 20) {
      scale = 0.2 // Large files
      console.log(`[PERF] Medium-large file detected (${fileSizeMB.toFixed(1)}MB), using reduced scale: ${scale}`)
    }

    const document = await pdf(inputFile, { scale })
    const pdfLoadTime = performance.now() - pdfLoadStartTime
    console.log(
      `[PERF] PDF loading completed in ${pdfLoadTime.toFixed(2)}ms (file: ${fileSizeMB.toFixed(1)}MB, scale: ${scale})`,
    )

    // PHASE 1: Generate all images first and save to disk
    console.log(`[PERF] Phase 1: Generating all page images...`)
    const imageGenerationStartTime = performance.now()
    let pageCounter = 1

    for await (const imageBuffer of document) {
      const imagePath = path.join(tmpDir, `page${pageCounter}.jpeg`)
      await fs.writeFile(imagePath, imageBuffer)
      imagePaths.push(imagePath)

      // Log progress every 100 pages
      if (pageCounter % 100 === 0) {
        const currentMemory = process.memoryUsage()
        console.log(
          `[PERF] Generated ${pageCounter} images, heap=${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
        )

        // Force garbage collection every 100 pages to manage memory
        if (global.gc) {
          global.gc()
          const afterGcMemory = process.memoryUsage()
          console.log(`[PERF] After GC: heap=${Math.round(afterGcMemory.heapUsed / 1024 / 1024)}MB`)
        }
      }

      pageCounter++
    }

    await document.destroy()

    const imageGenerationTime = performance.now() - imageGenerationStartTime
    console.log(
      `[PERF] Phase 1 completed: Generated ${imagePaths.length} images in ${imageGenerationTime.toFixed(2)}ms`,
    )

    // Log memory after image generation phase
    const afterGenerationMemory = process.memoryUsage()
    console.log(`[PERF] Memory after generation: ${Math.round(afterGenerationMemory.heapUsed / 1024 / 1024)}MB heap`)

    // PHASE 2: Process images sequentially for color detection
    console.log(`[PERF] Phase 2: Checking images for colored content...`)
    const colorCheckStartTime = performance.now()
    let hasColoredContent = false

    for (let i = 0; i < imagePaths.length; i++) {
      const pageStartTime = performance.now()
      const imagePath = imagePaths[i]
      if (!imagePath) continue // Skip if path is undefined (shouldn't happen)
      const pageNum = i + 1

      // Check if this page has colored pixels
      const pageHasColor = await isImageFullyWhite(imagePath)
      const totalPageTime = performance.now() - pageStartTime

      // Log memory usage periodically
      if (pageNum % 100 === 0) {
        const currentMemory = process.memoryUsage()
        console.log(
          `[PERF] Page ${pageNum}: color_check=${totalPageTime.toFixed(2)}ms, heap=${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
        )
      }

      if (pageHasColor) {
        hasColoredContent = true
        console.log(`[PERF] Page ${pageNum} has colored pixels - early exit`)
        break // Early exit when we find colored content
      }
    }

    const colorCheckTime = performance.now() - colorCheckStartTime
    console.log(`[PERF] Phase 2 completed: Color checking took ${colorCheckTime.toFixed(2)}ms`)

    const totalProcessingTime = performance.now() - startTime
    console.log(`[PERF] Processing completed: ${imagePaths.length} pages in ${totalProcessingTime.toFixed(2)}ms`)

    return hasColoredContent
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Error checking for colored pages: ${errorMessage}`)
  } finally {
    // PHASE 3: Clean up all temporary files
    console.log(`[PERF] Phase 3: Cleaning up ${imagePaths.length} temporary files...`)
    const cleanupStartTime = performance.now()

    try {
      await cleanupTmpDir(tmpDir)
      const cleanupTime = performance.now() - cleanupStartTime
      console.log(`[PERF] Final cleanup completed in ${cleanupTime.toFixed(2)}ms`)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary directory:', cleanupError)
    }

    // Final memory check
    const finalMemory = process.memoryUsage()
    console.log(`[PERF] Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB heap`)

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
