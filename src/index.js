import Reference from './Reference.js';
import Document from './Document';
import { isDocReference } from './utils.js';

const ENDPOINT = 'https://firestore.googleapis.com/v1beta1/';

/*
 * The public API
 */
export default class Database {
	constructor({ projectId, auth, databaseName = '(default)' }) {
		if (projectId === undefined)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this.name = databaseName;
		this.rootPath = `projects/${projectId}/databases/${databaseName}/documents`;
		this.endpoint = ENDPOINT + this.rootPath;
		this.auth = auth;
	}

	/**
	 * Uses native fetch, but adds authorization headers
	 * if the Reference was instantiated with an auth instance.
	 * The API is exactly the same as native fetch.
	 * @param {Request|Object|string} resource the resource to send the request to, or an options object.
	 * @param {Object} init an options object.
	 */
	fetch() {
		if (this.auth && this.auth.authorizedRequest) {
			return this.auth.authorizedRequest(...arguments).then(response => response.json());
		}

		return fetch(...arguments).then(response => response.json());
	}

	/**
	 * Gets multiple documents.
	 * Documents returned are not guaranteed to be in th same order as requested.
	 * @param {Reference[]} references Array of references to retrieve.
	 * @returns {Promise}
	 */
	async batchGet(references) {
		const documents = references.map(ref => {
			if (!isDocReference(ref)) throw Error('Array contains something other then References to documents');
			return ref.name;
		});

		const response = await this.fetch(this.endpoint + ':batchGet', {
			method: 'POST',
			body: JSON.stringify({ documents })
		});

		return response.map(entry => ('found' in entry ? new Document(entry.found, this) : entry));
	}

	/**
	 * Returns a reference to a document or a collection.
	 * @param {(string|Document)} path Path to the collection or document.
	 * @returns {Reference} instance of a reference.
	 */
	reference(path) {
		if (path instanceof Document) path = path.__meta__.path;
		return new Reference(path, this);
	}
}
