import { isDocumentPath, isValidPath, maskFromObject } from './utils.js';

export default class Reference {
	constructor(path, db) {
		// Normalize the path by removing slashes from
		// the beginning or the end.
		path = path.replace(/^\/?/, '').replace(/\/?$/, '');

		if (!isValidPath(path)) {
			throw Error('The path must point to a document or a collection');
		}

		this.db = db;
		this.path = path;
		this.isRoot = path.split('/').length === 1;
		this.isCollection = !isDocumentPath(path);
	}

	child(path) {
		// Remove starting forward slash
		path = path.replace(/^\/?/, '');

		// Return a newly created document with the new sub path.
		return new Reference(`${this.path}/${path}`, this.db);
	}

	parent() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		return new Reference(this.path.replace(/\/([^/]+)\/?$/, ''), this.db);
	}

	parentCollection() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		if (this.isCollection) return new Reference(this.path.replace(/(\/([^/]+)\/?){2}$/, ''), this.db);
		return this.parent();
	}

	get() {
		if (this.isCollection) throw Error("Can't get a collection");
		return this.db.fetch(this.db.endpoint + this.path);
	}

	set(object) {
		this.db.fetch(this.db.endpoint + this.path, {
			// If this is a path to a specific document use
			// patch instead, else, create a new document.
			method: this.isCollection ? 'POST' : 'PATCH',
			body: JSON.stringify(object)
		});
	}

	update(object) {
		if (this.isCollection) throw Error("Can't update a collection");
		const mask = `?updateMask=${maskFromObject(object).join(',')}`;

		this.db.fetch(this.db.endpoint + this.path + mask, {
			method: 'PATCH',
			body: JSON.stringify(object)
		});
	}

	delete() {
		if (this.isCollection) throw Error("Can't delete a collection");
		this.db.fetch(this.db.endpoint + this.path, { method: 'DELETE' });
	}
}
