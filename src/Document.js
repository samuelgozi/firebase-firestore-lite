import { isRawDocument, decode } from './utils.js';

export default class Document {
	constructor(rawDoc, db) {
		if (db === undefined) throw Error('Argument "db" is required but missing');
		if (!isRawDocument(rawDoc)) throw Error('Invalid Firestore Document');

		const { name, createTime, updateTime } = rawDoc;
		const meta = {
			db,
			name,
			createTime: new Date(createTime),
			updateTime: new Date(updateTime),
			path: name.replace(db.rootPath, ''),
			id: name.split('/').pop()
		};

		Object.defineProperty(this, '__meta__', { value: meta });
		Object.assign(this, decode(rawDoc, db));
	}
}
