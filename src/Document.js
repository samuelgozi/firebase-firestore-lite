import { isRawDocument, decode } from './utils.js';

/**
 * Wrapper around a fetched objects that represent a Firestore document.
 * It is supposed to be used as a regular JS object but has a hidden
 * property that holds the meta data of the document.
 *
 * That property is called `__meta__`, it should not be modified, and is non-enumerable.
 * It is used internally to identify the document when writing the
 * data to the database.
 */
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
