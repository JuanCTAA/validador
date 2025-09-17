#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

interface FileInfo {
  oldPath: string
  newName: string
  sizeBytes: number
  sizeMB: number
}

function getFileSizeInMB(filePath: string): number {
  const stats = fs.statSync(filePath)
  return Math.round(stats.size / (1024 * 1024))
}

function renameFixtureFiles(): void {
  console.log('🔄 Starting PDF fixture file renaming...')

  const validDir = 'test/fixtures/valids'
  const invalidDir = 'test/fixtures/invalids'

  // Process valid files
  const validFiles: FileInfo[] = []
  if (fs.existsSync(validDir)) {
    const files = fs.readdirSync(validDir).filter((file) => file.endsWith('.pdf'))
    files.forEach((file, index) => {
      const filePath = path.join(validDir, file)
      const sizeMB = getFileSizeInMB(filePath)
      const paddedIndex = String(index + 1).padStart(3, '0')
      const newName = `valid_${paddedIndex}_${sizeMB}mbs.pdf`

      validFiles.push({
        oldPath: filePath,
        newName: newName,
        sizeBytes: fs.statSync(filePath).size,
        sizeMB: sizeMB,
      })
    })
  }

  // Process invalid files
  const invalidFiles: FileInfo[] = []
  if (fs.existsSync(invalidDir)) {
    const files = fs.readdirSync(invalidDir).filter((file) => file.endsWith('.pdf'))
    files.forEach((file, index) => {
      const filePath = path.join(invalidDir, file)
      const sizeMB = getFileSizeInMB(filePath)
      const paddedIndex = String(index + 1).padStart(3, '0')
      const newName = `invalid_${paddedIndex}_${sizeMB}mbs.pdf`

      invalidFiles.push({
        oldPath: filePath,
        newName: newName,
        sizeBytes: fs.statSync(filePath).size,
        sizeMB: sizeMB,
      })
    })
  }

  // Show rename plan
  console.log('\n📋 Rename Plan:')
  console.log('\nValid files:')
  validFiles.forEach((file) => {
    const oldName = path.basename(file.oldPath)
    console.log(`  ${oldName} -> ${file.newName} (${file.sizeMB}MB)`)
  })

  console.log('\nInvalid files:')
  invalidFiles.forEach((file) => {
    const oldName = path.basename(file.oldPath)
    console.log(`  ${oldName} -> ${file.newName} (${file.sizeMB}MB)`)
  })

  // Perform renames
  console.log('\n🔄 Executing renames...')

  validFiles.forEach((file) => {
    const newPath = path.join(validDir, file.newName)
    fs.renameSync(file.oldPath, newPath)
    console.log(`✅ Renamed: ${path.basename(file.oldPath)} -> ${file.newName}`)
  })

  invalidFiles.forEach((file) => {
    const newPath = path.join(invalidDir, file.newName)
    fs.renameSync(file.oldPath, newPath)
    console.log(`✅ Renamed: ${path.basename(file.oldPath)} -> ${file.newName}`)
  })

  console.log(`\n🎉 Successfully renamed ${validFiles.length} valid and ${invalidFiles.length} invalid PDF files!`)
}

// Main execution
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  renameFixtureFiles()
}

export { renameFixtureFiles }
