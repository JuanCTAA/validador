import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

export const isInvalid_text_ghostscriptV2 = async (inputFile: string): Promise<boolean> => {
  try {
    checkGhostscriptInstalled()
    console.log(`Checking for empty pages in ${inputFile}`)

    // Use a single comprehensive command to check all pages efficiently
    const hasEmptyPages = checkAllPagesForEmptyContent(inputFile)

    if (hasEmptyPages) {
      console.log('Found empty pages in PDF')
      return true
    } else {
      console.log('No empty pages found')
      return false
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error checking for empty pages: ${errorMessage}`)
    throw new Error(`Error checking for empty pages: ${errorMessage}`)
  }
}

function checkGhostscriptInstalled(): void {
  try {
    execSync('gs --version', { stdio: 'ignore' })
  } catch (error) {
    console.error('This script requires Ghostscript, but it is not installed. Aborting.')
    throw new Error('Ghostscript is not installed')
  }
}

function checkAllPagesForEmptyContent(inputFile: string): boolean {
  try {
    // Use ink coverage analysis to check all pages at once - much faster
    console.log('Running ink coverage analysis...')
    const inkOutput = execSync(`gs -q -o - -sDEVICE=inkcov "${inputFile}"`, {
      encoding: 'utf8',
      timeout: 15000, // Reduced to 15 seconds
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    })

    const lines = inkOutput.split('\n').filter((line) => line.trim().length > 0)

    for (const line of lines) {
      // Skip page headers and processing messages
      if (line.includes('Page') || line.includes('Processing') || !line.includes('CMYK')) {
        continue
      }

      // Check for lines indicating EXACTLY zero ink coverage (truly empty pages)
      // Must be exactly 0.00000 for all four color channels to be considered empty
      if (line.match(/^\s*0\.00000\s+0\.00000\s+0\.00000\s+0\.00000\s+CMYK\s+OK\s*$/)) {
        console.log(`Found empty page with zero ink coverage`)
        return true
      }
    }

    console.log('No empty pages found via ink coverage analysis')
    return false
  } catch (error) {
    console.warn('Ink coverage analysis failed, falling back to text-based check:', error)
    return checkAllPagesForText(inputFile)
  }
}

function checkAllPagesForText(inputFile: string): boolean {
  const tempFile = path.join(path.dirname(inputFile), `temp_all_text_${randomUUID()}.txt`)
  try {
    // Extract all text at once
    execSync(`gs -q -dBATCH -dNOPAUSE -sDEVICE=txtwrite -sOutputFile="${tempFile}" "${inputFile}"`, {
      timeout: 20000,
      stdio: 'ignore',
    })

    if (!fs.existsSync(tempFile)) {
      return true // No text file created suggests empty content
    }

    const textContent = fs.readFileSync(tempFile, { encoding: 'utf8' })

    // Split by form feeds (page breaks) to analyze per page
    const pages = textContent.split('\f')

    for (let i = 0; i < pages.length; i++) {
      if (pages[i]?.trim().length === 0) {
        console.log(`Found empty page: ${i + 1}`)
        return true
      }
    }

    return false
  } catch (error) {
    console.warn('Text extraction fallback failed:', error)
    return false // If all methods fail, assume no empty pages to avoid false positives
  } finally {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}
