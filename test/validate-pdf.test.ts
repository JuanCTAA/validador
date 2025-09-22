import fs from 'fs'
import path from 'path'
import request from 'supertest'
import { describe, test } from 'vitest'
import app from '../app.js'

test('Should check if file uploaded is NOT a PDF file', async () => {
  await request(app).post('/validate-pdf').attach('pdf', 'test/fixtures/profile-pic.jpg').expect(500)
})

test('Should throw error if NO file is uploaded', async () => {
  await request(app).post('/validate-pdf').attach('pdf', '').expect(400)
})

// Function to get PDF files from a folder
function getPdfFilesFromFolder(folderPath: string): string[] {
  return fs
    .readdirSync(folderPath)
    .filter((file) => path.extname(file).toLowerCase() === '.pdf')
    .map((file) => path.join(folderPath, file))
}

// Get valid and invalid PDF files
const testFiles = {
  valids: getPdfFilesFromFolder('test/fixtures/valids'),
  invalids: getPdfFilesFromFolder('test/fixtures/invalids'),
}

describe('single PDF test', () => {
  test('', async () => {
    const file = fs.readFileSync('test/fixtures/valids/valid_006_22mbs.pdf')
    await request(app).post('/validate-pdf').attach('pdf', file).expect(200) // Expecting success status code
  })
})

describe('PDF Validation Tests', () => {
  test.each(testFiles.valids.map((filePath) => ({ filePath, expectedStatus: 200 })))(
    'Should successfully validate a valid PDF: $filePath',
    async ({ filePath, expectedStatus }) => {
      try {
        await request(app).post('/validate-pdf').attach('pdf', filePath).expect(expectedStatus) // Expecting success status code
      } catch (error) {
        console.error(`Failed validation for a valid PDF: ${filePath}`)
        throw error // Re-throw the error to keep the test failed status
      }
    },
  )

  test.each(testFiles.invalids.map((filePath) => ({ filePath, expectedStatus: 400 })))(
    'Should reject an invalid PDF: $filePath',
    async ({ filePath, expectedStatus }) => {
      try {
        await request(app).post('/validate-pdf').attach('pdf', filePath).expect(expectedStatus) // Expecting error status code
      } catch (error) {
        console.error(`Failed rejection for an invalid PDF: ${filePath}`)
        throw error // Re-throw the error to keep the test failed status
      }
    },
  )
})
