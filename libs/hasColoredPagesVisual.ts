import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pdf } from 'pdf-to-img'

export const hasColoredPagesVisual = async (inputFile: string): Promise<boolean> => {
  const tmpDir = path.join(process.cwd(), 'tmp-pdf-images')

  try {
    // Create temporary directory
    await fs.mkdir(tmpDir, { recursive: true })

    const document = await pdf(inputFile, { scale: 1 })
    let pageCounter = 1
    let hasColoredContent = false

    // Process each page
    for await (const imageBuffer of document) {
      const imagePath = path.join(tmpDir, `page${pageCounter}.jpeg`)
      await fs.writeFile(imagePath, imageBuffer)

      // Check if this page has colored pixels
      const pageHasColor = await hasColoredPixels(imageBuffer)
      if (pageHasColor) {
        hasColoredContent = true
        break // Early exit when we find colored content
      }

      pageCounter++
    }

    return hasColoredContent
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Error checking for colored pages: ${errorMessage}`)
  } finally {
    // Clean up temporary files
    try {
      await cleanupTmpDir(tmpDir)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary directory:', cleanupError)
    }
  }
}

async function hasColoredPixels(imageBuffer: Buffer): Promise<boolean> {
  // Simple check for colored pixels by analyzing the image data
  // This is a basic implementation - in a production environment,
  // you might want to use a more sophisticated image processing library

  // For JPEG images, we'll do a simple sampling approach
  // Check if there are significant variations in RGB values that indicate color

  const sampleSize = Math.min(1000, Math.floor(imageBuffer.length / 10))
  const step = Math.max(3, Math.floor(imageBuffer.length / sampleSize))

  for (let i = 0; i < imageBuffer.length - 2; i += step) {
    // Ensure we don't go beyond buffer bounds
    if (i + 2 >= imageBuffer.length) break

    const r = imageBuffer[i] || 0
    const g = imageBuffer[i + 1] || 0
    const b = imageBuffer[i + 2] || 0

    // Check if RGB values are significantly different (indicating color)
    // Allow some tolerance for compression artifacts
    const tolerance = 30
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

    if (maxDiff > tolerance) {
      return true // Found colored content
    }
  }

  return false // No significant color variation found
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
