import express, { type Application } from 'express'
import swaggerApi from './routes/swagger-ui'
import validatePdf from './routes/validate-pdf'

const app: Application = express()

const port: string | number = process.env.PORT ?? 3000

app.use(swaggerApi)

app.use(validatePdf)

app.listen(port, () => {
  console.log('Server is up on port ' + port)
})

export default app
