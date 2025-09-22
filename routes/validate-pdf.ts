import express, { type Request, type Response, type Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import { performance } from 'perf_hooks'
import { promisify } from 'util'
import { hasColoredPagesVisual } from '../libs/hasColoredPagesVisual'

const router: Router = express.Router()

const unlinkAsync = promisify(fs.unlink)

// Define storage using multer.diskStorage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const path = './'
    fs.mkdirSync(path, { recursive: true }) // Create the directory if it doesn't exist
    cb(null, path)
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname)
  },
})
const upload = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (!file.originalname.match(/\.(pdf)$/)) {
      return cb(new Error('Please upload a valid PDF file. '))
    }

    cb(null, true)
  },
})

/**
 * @swagger
 * /validate-pdf:
 *  post:
 *      summary: Validate PDF file
 *      description: This API checks whether a PDF file uploaded contains a blank page or not
 *      consumes:
 *        - multipart/form-data
 *      parameters:
 *        - in: formData
 *          name: pdf
 *          type: file
 *          description: The PDF file to upload.
 *          required: true
 *      responses:
 *          200:
 *             description: PDF is valid
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PDF is valid"
 *                 processingTimeMs:
 *                   type: number
 *                   example: 150.25
 *                   description: Time taken to process the PDF in milliseconds
 *          400:
 *             description: PDF is invalid or no PDF file uploaded
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "PDF is invalid."
 *                 processingTimeMs:
 *                   type: number
 *                   example: 250.75
 *                   description: Time taken to process the PDF in milliseconds
 *          500:
 *             description: An error occured while validating the PDF
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "An error occured while validating the PDF"
 *                 message:
 *                   type: string
 *                   example: "Error details"
 *                 processingTimeMs:
 *                   type: number
 *                   example: 75.50
 *                   description: Time taken before the error occurred in milliseconds
 *
 */
router.post('/validate-pdf', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
  const startTime = performance.now()

  try {
    if (!req.file) {
      const processingTime = performance.now() - startTime
      res.status(400).json({
        error: 'No PDF file uploaded',
        processingTimeMs: Math.round(processingTime * 100) / 100,
      })
      return
    }
    console.log('PDF file uploaded')

    if (!req.file.path) {
      const processingTime = performance.now() - startTime
      res.status(400).json({
        error: 'No PDF file uploaded',
        processingTimeMs: Math.round(processingTime * 100) / 100,
      })
      return
    }

    const isInvalid = await hasColoredPagesVisual(req.file.path)
    const processingTime = performance.now() - startTime
    console.log(`The pdf is ${isInvalid ? 'invalid' : 'valid'} (processed in ${Math.round(processingTime)} ms)`)

    if (!isInvalid) {
      res.status(200).json({
        message: 'PDF is valid',
        processingTimeMs: Math.round(processingTime * 100) / 100,
      })
      return
    } else {
      res.status(400).json({
        error: `PDF is invalid.`,
        processingTimeMs: Math.round(processingTime * 100) / 100,
      })
      return
    }
  } catch (error) {
    const processingTime = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`An error occured while validating the PDF: ${errorMessage}`)
    res.status(500).json({
      error: 'An error occured while validating the PDF',
      message: errorMessage,
      processingTimeMs: Math.round(processingTime * 100) / 100,
    })
  } finally {
    if (req.file?.path) {
      console.log('Deleting the file')
      await unlinkAsync(req.file.path)
      console.log('File deleted')
    }
  }
})

export default router
