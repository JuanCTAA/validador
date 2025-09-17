import express, { type Router } from 'express'
import swaggerJSDoc, { type Options } from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const router: Router = express.Router()

const options: Options = {
  definition: {
    info: {
      title: 'PDF Validator API',
      version: '1.0.0',
      description: 'This API checks whether a PDF file uploaded contains an empty page or not',
    },
  },
  apis: ['./routes/validate-pdf.ts'],
}

const swaggerSpec: object = swaggerJSDoc(options)

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

export default router
