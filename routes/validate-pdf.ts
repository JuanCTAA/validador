import express, { type Request, type Response, type Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import { promisify } from 'util'
import { hasEmptyPagesVisual } from '../libs/hasEmptyPagesVisual.js'

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
 *          400:
 *             description: PDF is invalid or no PDF file uploaded
 *          500:
 *             description: An error occured while validating the PDF
 *
 */
router.post('/validate-pdf', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' })
      return
    }
    console.log('PDF file uploaded')

    if (!req.file.path) {
      res.status(400).json({ error: 'No PDF file uploaded' })
      return
    }

    const isInvalid = await hasEmptyPagesVisual(req.file.path)
    console.log(`The pdf is ${isInvalid ? 'invalid' : 'valid'}`)

    if (!isInvalid) {
      res.status(200).json({ message: 'PDF is valid' })
      return
    } else {
      res.status(400).json({ error: `PDF is invalid.` })
      return
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`An error occured while validating the PDF: ${errorMessage}`)
    res.status(500).json({
      error: 'An error occured while validating the PDF',
      message: errorMessage,
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
