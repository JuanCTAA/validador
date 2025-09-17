const express = require('express');
const multer = require('multer');
const router = new express.Router();
const {
	hasEmptyPagesGhostscript,
} = require('../libs/hasEmptyPagesGhostscript');

const fs = require('fs');

const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Define storage using multer.diskStorage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		let path = './';
		fs.mkdirSync(path, { recursive: true }); // Create the directory if it doesn't exist
		cb(null, path);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});
const upload = multer({
	storage,
	fileFilter(req, file, cb) {
		if (!file.originalname.match(/\.(pdf)$/)) {
			return cb(new Error('Please upload a valid PDF file. '));
		}

		cb(undefined, true);
	},
});

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
router.post('/validate-pdf', upload.single('pdf'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No PDF file uploaded' });
		}
		console.log('PDF file uploaded');

		if (!req.file.path) {
			return res.status(400).json({ error: 'No PDF file uploaded' });
		}

		const isInvalid = await hasEmptyPagesGhostscript(req.file.path);
		console.log(`The pdf is ${isInvalid ? 'invalid' : 'valid'}`);

		if (!isInvalid) {
			return res.status(200).json({ message: 'PDF is valid' });
		} else {
			return res.status(400).json({ error: `PDF is invalid.` }); 
		}

	} catch (error) { 
		console.error(
			`An error occured while validating the PDF: ${error.message}`
		);
		res.status(500).json({
			error: 'An error occured while validating the PDF',
			message: error.message,
		});
	} finally {
		if (req.file?.path) {
			console.log('Deleting the file');
			await unlinkAsync(req.file.path);
			console.log('File deleted');
		}
	}
});

module.exports = router;
