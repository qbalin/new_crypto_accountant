const fs = require('fs');
const madge = require('madge');

const imagePath = 'circular_dependencies.svg';

madge('./src/index.ts', { tsConfig: './tsconfig.json' }).then((res) => {
	if (res.circular().length === 0) {
		return;
	}
	return res.image(imagePath, true);
}).then(writtenImagePathOrNothing => {
	if (writtenImagePathOrNothing) {
		throw new Error(`Circular dependency detected. See it at ${writtenImagePathOrNothing}`);
	}
});