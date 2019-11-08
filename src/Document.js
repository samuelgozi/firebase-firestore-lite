import { decode, metaSymbol } from './utils.js';
import Reference from './Reference.js';

export default class Document {
	static metadata(document) {
		if (!(document instanceof Document)) throw Error('"metadata" expects its argument to be an instance of a Document');
		return document[metaSymbol];
	}

	constructor(rawDocument, db) {
		const { name, createTime, updateTime } = rawDocument;
		this[metaSymbol] = {
			db,
			name,
			createTime,
			updateTime,
			path: name.replace(db.endpoint, ''),
			id: name.split('/').pop()
		};

		this.data = decode(rawDocument);
	}

	get ref() {
		return new Reference(this.path, this.db);
	}
}
