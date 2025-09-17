const request = require('supertest')
const app = require('../app');
const fs = require('fs');
const path = require('path');

test('Should check if file uploaded is NOT a PDF file',async()=>{
        await request(app)
        .post('/validate-pdf')
        .attach('pdf','test/fixtures/profile-pic.jpg')
        .expect(500)

})


test('Should throw error if NO file is uploaded',async()=>{
    await request(app)
        .post('/validate-pdf')
        .attach('pdf','')
        .expect(400)

})

// Function to get PDF files from a folder
function getPdfFilesFromFolder(folderPath) {
    return fs.readdirSync(folderPath)
        .filter(file => path.extname(file).toLowerCase() === '.pdf')
        .map(file => path.join(folderPath, file));
}

// Get valid and invalid PDF files
const testFiles = {
    valids: getPdfFilesFromFolder('test/fixtures/valids'),
    invalids: getPdfFilesFromFolder('test/fixtures/invalids')
};

describe('PDF Validation Tests', () => {
	// Test for valid PDF files
	testFiles.valids.forEach((filePath) => {
		test(`Should successfully validate a valid PDF: ${filePath}`, async () => {
			try {
				await request(app)
					.post('/validate-pdf')
					.attach('pdf', filePath)
					.expect(200); // Expecting success status code
			} catch (error) {
				console.error(`Failed validation for a valid PDF: ${filePath}`);
				throw error; // Re-throw the error to keep the test failed status
			}
		}, 300000); // 5 minutes timeout
	});

	// Test for invalid PDF files
	testFiles.invalids.forEach((filePath) => {
		test(`Should reject an invalid PDF: ${filePath}`, async () => {
			try {
				await request(app)
					.post('/validate-pdf')
					.attach('pdf', filePath)
					.expect(400); // Expecting error status code
			} catch (error) {
				console.error(
					`Failed rejection for an invalid PDF: ${filePath}`
				);
				throw error; // Re-throw the error to keep the test failed status
			}
		}, 300000); // 5 minutes timeout
	});
});
