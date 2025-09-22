import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pdf } from 'pdf-to-img'
import sharp from 'sharp'

export const hasColoredPagesVisual = async (inputFile: string): Promise<boolean> => {
  const tmpDir = path.join(process.cwd(), 'tmp-pdf-images')

  try {
    // Create temporary directory
    await cleanupTmpDir(tmpDir)
    await fs.mkdir(tmpDir, { recursive: true })

    const document = await pdf(inputFile, { scale: 0.25 })
    let pageCounter = 1
    let hasColoredContent = false

    // Process each page
    for await (const imageBuffer of document) {
      const imagePath = path.join(tmpDir, `page${pageCounter}.jpeg`)
      await fs.writeFile(imagePath, imageBuffer)

      // Check if this page has colored pixels
      const pageHasColor = await isImageFullyWhite(imagePath)
      if (pageHasColor) {
        hasColoredContent = true
        console.log(`Page ${pageCounter} has no colored pixels`)
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

export async function isImageFullyWhite(filePath: string): Promise<boolean> {
  const { data, info } = await sharp(filePath).resize(50, 50).raw().ensureAlpha().toBuffer({ resolveWithObject: true })

  const channels = info.channels // usually 4 (RGBA)
  const length = data.length

  for (let i = 0; i < length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = channels === 4 ? data[i + 3] : 255

    if (!(r === 255 && g === 255 && b === 255 && a === 255)) {
      return false
    }
  }
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
