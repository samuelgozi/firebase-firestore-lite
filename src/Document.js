import { isDocumentPath, maskFromObject } from './utils.js';

export default class Document {
	constructor(path, db) {
		this.db = db;
		// Remove slashes
		this.path = path.replace(/^\/?/, '').replace(/\/?$/, '');
	}

	get() {
		return this.db.fetch(this.db.endpoint + this.path);
	}

	set(object) {
		this.db.fetch(this.db.endpoint + this.path, {
			// If this is a path to a specific document use
			// patch instead, else, create a new document.
			method: isDocumentPath ? 'PATCH' : 'POST',
			body: JSON.stringify(object)
		});
	}

	update(object) {
		const mask = `?updateMask=${maskFromObject(object).join(',')}`;

		this.db.fetch(this.db.endpoint + this.path + mask, {
			method: 'PATCH',
			body: JSON.stringify(object)
		});
	}

	delete() {
		this.db.fetch(this.db.endpoint + this.path, { method: 'DELETE' });
	}
}
