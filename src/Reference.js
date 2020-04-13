import Query from './Query.js';
import Document from './Document.js';
import List from './List.js';
import { trimPath, isDocPath, objectToQuery, maskFromObject, encode, getKeyPaths } from './utils.js';

export default class Reference {
	constructor(path, db) {
		if (db === undefined) throw Error('Argument "db" is required but missing');

		// Normalize the path by removing slashes from
		// the beginning or the end and trimming spaces.
		path = trimPath(path);

		this.id = path.split('/').pop();
		this.db = db;
		this.path = path;
		this.name = `${db.rootPath}/${path}`;
		this.endpoint = `${db.endpoint}/${path}`;
		this.isRoot = path === '';
	}

	/**
	 * Returns a reference to the parent document/collection.
	 * @returns {Reference}
	 */
	get parent() {
		if (this.isRoot) throw Error("Can't get the parent of root");
		return new Reference(this.path.replace(/\/?([^/]+)\/?$/, ''), this.db);
	}

	/**
	 * Returns a reference to the parent collection.
	 * @returns {Reference}
	 */
	get parentCollection() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		if (this.isCollection) return new Reference(this.path.replace(/(\/([^/]+)\/?){2}$|^([^/]+)$/, ''), this.db);
		return this.parent;
	}

	/**
	 * Returns true if this reference is a collection.
	 * @returns {boolean}
	 */
	get isCollection() {
		return this.path !== '' && !isDocPath(this.path);
	}

	/**
	 * Returns a reference to the specified child path.
	 * @returns {Reference}
	 */
	child(path) {
		// Remove starting forward slash
		path = path.replace(/^\/?/, '');

		// Return a newly created document with the new sub path.
		return new Reference(`${this.path}/${path}`, this.db);
	}

	/**
	 * Fetches the collection/document that this reference refers to.
	 * Will return a Document instance if it is a document, and a List instance if it is a collection.
	 * @returns {Document|List}
	 */
	async get(options) {
		const data = await this.db.fetch(this.endpoint + objectToQuery(options));
		return this.isCollection ? new List(data, this, options) : new Document(data, this.db);
	}

	/**
	 * Helper that handles Transforms in objects.
	 * If the object has a transform then a transaction will be made,
	 * and a promise for the resulting document will be returned.
	 * Else, if it doesn't have any Transforms then we return the parsed
	 * document and let the caller handle the request.
	 *
	 * @param {object} obj The object representing the Firebase document.
	 * @param {boolean} update True if intended to update an existing document.
	 * @private
	 */
	handleTransforms(obj, update = false) {
		if (typeof obj !== 'object') throw Error(`"${update ? 'update' : 'set'}" received no arguments`);
		const transforms = [];
		const doc = encode(obj, transforms);

		if (transforms.length === 0) return doc;

		if (this.isCollection && transforms.length)
			throw Error("Transforms can't be used when creating documents with server generated IDs");

		const tx = this.db.transaction();
		doc.name = this.name;
		tx.writes.push(
			{
				update: doc,
				updateMask: update ? { fieldPaths: getKeyPaths(obj) } : undefined,
				currentDocument: update ? { exists: true } : undefined
			},
			{
				transform: {
					document: this.name,
					fieldTransforms: transforms
				}
			}
		);
		return tx.commit().then(() => this.get());
	}

	/**
	 * Create a new document or overwrites an existing one matching this reference.
	 * Will throw is the reference points to a collection.
	 * @returns {Document} The newly created/updated document.
	 */
	async set(obj) {
		const doc = this.handleTransforms(obj);
		if (doc instanceof Promise) return await doc;

		return new Document(
			await this.db.fetch(this.endpoint, {
				// If this is a path to a specific document use
				// patch instead, else, create a new document.
				method: this.isCollection ? 'POST' : 'PATCH',
				body: JSON.stringify(doc)
			}),
			this.db
		);
	}

	/**
	 * Updates a document.
	 * Will throw is the reference points to a collection.
	 * @returns {Document} The updated document.
	 */
	async update(obj, existsOptional) {
		if (this.isCollection) throw Error("Can't update a collection");

		const doc = this.handleTransforms(obj, true);

		if (doc instanceof Promise) return await doc;
		if (!existsOptional) doc.currentDocument = { exists: true };

		return new Document(
			await this.db.fetch(this.endpoint + maskFromObject(obj), {
				method: 'PATCH',
				body: JSON.stringify(doc)
			}),
			this.db
		);
	}

	/**
	 * Deletes the referenced document.
	 */
	delete() {
		if (this.isCollection) throw Error("Can't delete a collection");
		return this.db.fetch(this.endpoint, { method: 'DELETE' });
	}

	/**
	 * Queries the child documents/collections of this reference.
	 * @returns {List} The results of the query.
	 */
	query(options = {}) {
		if (!this.isCollection) throw Error('Query can only be called on collections');

		return new Query({
			from: this,
			...options
		});
	}

	toJSON() {
		return {
			referenceValue: this.name
		};
	}
}
