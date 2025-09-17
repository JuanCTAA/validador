import express from 'express'
import swaggerApi from './routes/swagger-ui.js'
import validatePdf from './routes/validate-pdf.js'

const app = express()

const port = process.env.PORT || 3000

app.use(swaggerApi)

app.use(validatePdf)

app.listen(port, () => {
  console.log('Server is up on port ' + port)
})

export default app
