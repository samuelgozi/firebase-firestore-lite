const fs = require('fs').promises;
const path = require('path');

// Remove file or directory containing files.
async function rm(filePath) {
	const absolutePath = path.join(__dirname, '../', filePath);
	try {
		const stats = await fs.lstat(absolutePath);
		if (stats.isDirectory()) {
			const files = await fs.readdir(absolutePath);
			const promisesArray = files.map(subFilePath => {
				return rm(path.join(filePath, subFilePath));
			});

			return Promise.all(promisesArray).then(() => fs.rmdir(absolutePath));
		}

		// Else it is a file.
		return fs.unlink(absolutePath);
	} catch (error) {
		// Don't throw if the error is for a file not found.
		if (error.code !== 'ENOENT' && error.syscall !== 'lstat') throw error;
	}
}

const pathsToDelete = process.argv.slice(2);
pathsToDelete.map(path => rm(path));
