import Query from './Query.js';
import Document from './Document';
import { objectToQuery, maskFromObject } from './utils.js';
import List from './List.js';

export default class Reference {
	constructor(path, db) {
		// Normalize the path by removing slashes from
		// the beginning or the end.
		path = path.replace(/^\/?/, '').replace(/\/?$/, '');

		this.id = path.split('/').pop();
		this.db = db;
		this.path = path;
		this.name = `${db.rootPath}/${path}`;
		this.endpoint = `${db.endpoint}/${path}`;
		this.isRoot = path === '';
	}

	get parent() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		return new Reference(this.path.replace(/\/([^/]+)\/?$/, ''), this.db);
	}

	get parentCollection() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		if (this.isCollection) return new Reference(this.path.replace(/(\/([^/]+)\/?){2}$|^([^/]+)$/, ''), this.db);
		return this.parent();
	}

	get isCollection() {
		return this.path.split('/').length % 2 === 1;
	}

	child(path) {
		// Remove starting forward slash
		path = path.replace(/^\/?/, '');

		// Return a newly created document with the new sub path.
		return new Reference(`${this.path}/${path}`, this.db);
	}

	get(options) {
		return this.db.fetch(this.endpoint + objectToQuery(options)).then(data => {
			return this.isCollection ? new List(data, this, options) : new Document(data, this.db);
		});
	}

	set(object) {
		return this.db
			.fetch(this.endpoint, {
				// If this is a path to a specific document use
				// patch instead, else, create a new document.
				method: this.isCollection ? 'POST' : 'PATCH',
				body: JSON.stringify(Document.encode(object))
			})
			.then(rawDoc => new Document(rawDoc, this.db));
	}

	update(object) {
		if (this.isCollection) throw Error("Can't update a collection");

		return this.db
			.fetch(`${this.endpoint}?${maskFromObject(object)}`, {
				method: 'PATCH',
				body: JSON.stringify(Document.encode(object))
			})
			.then(rawDoc => new Document(rawDoc, this.db));
	}

	delete() {
		if (this.isCollection) throw Error("Can't delete a collection");
		return this.db.fetch(this.endpoint, { method: 'DELETE' });
	}

	query(options = {}) {
		return new Query({
			from: [this],
			...options
		});
	}

	toJSON() {
		return {
			referenceValue: this.name
		};
	}
}
