import { isRawDocument, decode } from './utils.js';
import { Database } from './Database.js';

export interface FirebaseMap {
	/** The map's fields */
	name?: string;
	fields?: {
		[key: string]: any;
	};
}

export interface FirebaseDocument extends FirebaseMap {
	/** The full resource name of the document */
	name: string;
	/** A timestamp in RFC3339 UTC "Zulu" format, accurate to nanoseconds */
	createTime: string;
	/** A timestamp in RFC3339 UTC "Zulu" format, accurate to nanoseconds */
	updateTime: string;
}

export interface Meta {
	/** The database instance used to create this document */
	db: Database;
	/** The ID of the document inside the collection */
	id: string;
	/** The path to the document relative to the database root */
	path: string;
	/** The full resource name of the document */
	name: string;
	/** A timestamp in RFC3339 UTC "Zulu" format, accurate to nanoseconds */
	createTime: string;
	/** A timestamp in RFC3339 UTC "Zulu" format, accurate to nanoseconds */
	updateTime: string;
}

/**
 * Wrapper around a fetched objects that represent a Firestore document.
 * It is supposed to be used as a regular JS object but has a hidden
 * property that holds the meta data of the document.
 *
 * That property is called `__meta__`, it should not be modified, and is non-enumerable.
 * It is used internally to identify the document when writing the
 * data to the database.
 */
export class Document {
	[key: string]: any;
	// @ts-ignore
	__meta__: Meta;

	constructor(rawDoc: FirebaseDocument, db: Database) {
		if (db === undefined) throw Error('Argument "db" is required but missing');
		if (!isRawDocument(rawDoc)) throw Error('Invalid Firestore Document');

		const { name, createTime, updateTime } = rawDoc;
		const meta = {
			db,
			name,
			createTime,
			updateTime,
			path: name.replace(db.rootPath, ''),
			id: name.split('/').pop()
		};

		Object.defineProperty(this, '__meta__', { value: meta });
		Object.assign(this, decode(rawDoc, db));
	}
}
