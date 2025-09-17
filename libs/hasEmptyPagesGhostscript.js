const { execSync } = require('child_process');
const fs = require('fs');

exports.hasEmptyPagesGhostscript = async (inputFile) => {
	try {
		checkGhostscriptInstalled();
		console.log(`Checking for empty pages in ${inputFile}`);

		const emptyPages = getEmptyPages(inputFile);
		console.log(`The pdf has ${emptyPages.length} empty pages`);

		const trulyEmptyPages = checkPagesForText(inputFile, emptyPages);
		console.log('Final truly empty pages:', trulyEmptyPages);

		if (trulyEmptyPages.length > 0) {
			console.log(
				`These pages are truly empty: ${trulyEmptyPages.join(', ')}`
			);
			return true;
		} else {
			return false;
		}
	} catch (error) {
		console.error(`Error checking for empty pages: ${error.message}`);
		throw new Error(`Error checking for empty pages: ${error.message}`);
	}
};

function checkGhostscriptInstalled() {
	try {
		execSync('gs --version', { stdio: 'ignore' });
	} catch (error) {
		console.error(
			'This script requires Ghostscript, but it is not installed. Aborting.'
		);
		throw new Error('Ghostscript is not installed');
	}
}

function getEmptyPages(inputFile) {
	const emptyPagesCmd = `gs -o - -sDEVICE=inkcov "${inputFile}" | grep -B 1 "^ 0.000[01][[:digit:]]  0.000[01][[:digit:]]  0.000[01][[:digit:]]  0.000[01]" | grep 'Page' | awk '{print $2}'`;
	console.log('Executing emptyPagesCmd');
	return execSync(emptyPagesCmd, { encoding: 'utf8' })
		.trim()
		.split('\n')
		.filter((page) => page !== ''); // remove the ones that are empty spaces ''
}

function checkPagesForText(inputFile, emptyPages) {
	const trulyEmptyPages = [];
	for (const emptyPage of emptyPages) {
		console.log(`Checking if empty page ${emptyPage} has text`);
		const textOutput = getTextFromPage(inputFile, emptyPage);
		console.log(`Text output length is: ${textOutput.trim().length}`);

		if (textOutput.trim().length === 0) {
			trulyEmptyPages.push(emptyPage);
			console.log(`The empty page ${emptyPage} is truly empty`);
		}
	} 
	return trulyEmptyPages;
}

function getTextFromPage(inputFile, page) {
	const tempOutput = 'output.txt';
	execSync(
		`gs -dBATCH -dNOPAUSE -sDEVICE=txtwrite -sPageList=${page} -sOutputFile=${tempOutput} "${inputFile}"`
	);
	const textOutput = fs.readFileSync(tempOutput, { encoding: 'utf8' });
	fs.unlinkSync(tempOutput); // Clean up the temporary file
	return textOutput;
}
