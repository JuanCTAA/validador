import express, { type Request, type Response, type Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import { performance } from 'perf_hooks'
import { promisify } from 'util'
import { hasColoredPagesVisual } from '../libs/hasColoredPagesVisualMemory'

const router: Router = express.Router()

const unlinkAsync = promisify(fs.unlink)

const calculateProcessingTime = (startTime: number): number => {
  return Math.round((performance.now() - startTime) * 100) / 100
}

const sendErrorResponse = (
  res: Response,
  statusCode: number,
  error: string,
  processingTimeMs: number,
  message?: string,
): void => {
  const responseBody: any = { error, processingTimeMs }
  if (message) {
    responseBody.message = message
  }
  res.status(statusCode).json(responseBody)
}

const sendSuccessResponse = (res: Response, message: string, processingTimeMs: number): void => {
  res.status(200).json({ message, processingTimeMs })
}

const validateUploadedFile = (file: Express.Multer.File | undefined): string | null => {
  if (!file) {
    return 'No PDF file uploaded'
  }
  if (!file.path) {
    return 'No PDF file uploaded'
  }
  return null
}

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
    // Validate uploaded file
    const validationError = validateUploadedFile(req.file)
    if (validationError) {
      const processingTime = calculateProcessingTime(startTime)
      sendErrorResponse(res, 400, validationError, processingTime)
      return
    }

    console.log('PDF file uploaded')

    // Process the PDF
    const isInvalid = await hasColoredPagesVisual(req.file!.path)
    const processingTime = calculateProcessingTime(startTime)
    console.log(`The pdf is ${isInvalid ? 'invalid' : 'valid'} (processed in ${Math.round(processingTime)} ms)`)

    // Send appropriate response
    if (!isInvalid) {
      sendSuccessResponse(res, 'PDF is valid', processingTime)
    } else {
      sendErrorResponse(res, 400, 'PDF is invalid.', processingTime)
    }
  } catch (error) {
    const processingTime = calculateProcessingTime(startTime)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`An error occured while validating the PDF: ${errorMessage}`)
    sendErrorResponse(res, 500, 'An error occured while validating the PDF', processingTime, errorMessage)
  } finally {
    if (req.file?.path) {
      console.log('Deleting the file')
      await unlinkAsync(req.file.path)
      console.log('File deleted')
    }
  }
})

export default router
