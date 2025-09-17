const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const router = new express.Router();


const options = {
	definition: {
		info: {
			title: 'PDF Validator API',
			version: '1.0.0',
			description:
				'This API checks whether a PDF file uploaded contains an empty page or not',
		},
	},
	apis: ['./routes/validate-pdf.js'],
};

const swaggerSpec = swaggerJSDoc(options);

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;
