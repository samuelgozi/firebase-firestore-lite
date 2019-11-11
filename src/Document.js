import { decode } from './utils.js';

export default class Document {
	constructor(rawDocument, db) {
		const { name, createTime, updateTime } = rawDocument;
		const meta = {
			db,
			name,
			createTime,
			updateTime,
			path: name.replace(db.endpoint, ''),
			id: name.split('/').pop()
		};

		Object.defineProperty(this, '__meta__', {
			value: meta
		});

		Object.assign(this, decode(rawDocument));
	}
}
