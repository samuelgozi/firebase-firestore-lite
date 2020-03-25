import Reference from './Reference.js';
import Document from './Document';
import { isDocPath, isDocReference } from './utils.js';
import Transaction from './Transaction.js';

/**
 * Database Instance.
 * Encapsulates the Firestore service interface.
 */
export default class Database {
	/**
	 * @param {object} settings Settings object.
	 * @param {string} settings.projectId Firebase's project ID.
	 * @param {object} settings.name The name of the database to use in this instance.
	 * @param {object} settings.auth Auth instance to use for authorization with this instance.
	 */
	constructor({ projectId, auth, name = '(default)' }) {
		if (projectId === undefined)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this.name = name;
		this.rootPath = `projects/${projectId}/databases/${name}/documents`;
		this.endpoint = 'https://firestore.googleapis.com/v1/' + this.rootPath;
		this.auth = auth;
	}

	/**
	 * For internal use only.
	 * Uses native fetch, but adds authorization headers
	 * if the Reference was instantiated with an auth instance.
	 * The API is exactly the same as native fetch.
	 * @param {Request|Object|string} resource the resource to send the request to, or an options object.
	 * @param {Object} init an options object.
	 * @private
	 */
	fetch() {
		if (this.auth && this.auth.authorizedRequest)
			return this.auth.authorizedRequest(...arguments).then(response => response.json());

		return fetch(...arguments).then(response => response.json());
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

	/**
	 * Gets multiple documents.
	 * Documents returned are not guaranteed to be in th same order as requested.
	 * @param {Array.<Reference|string>} refs Array of references or string paths to retrieve.
	 * @returns {Promise}
	 */
	async batchGet(refs) {
		const response = await this.fetch(this.endpoint + ':batchGet', {
			method: 'POST',
			body: JSON.stringify({
				documents: refs.map(ref => {
					if (!isDocPath(ref) && !isDocReference(ref))
						throw Error('The array can only contain References or paths pointing to documents');
					return ref.name || `${this.rootPath}/${ref}`;
				})
			})
		});

		return response.map(entry =>
			entry.found ? new Document(entry.found, this) : Object.defineProperty({}, '__missing__', { value: entry.missing })
		);
	}

	/**
	 * Returns a new transaction instance.
	 * @returns {Transaction} A new transaction instance.
	 */
	transaction() {
		return new Transaction(this);
	}

	/**
	 * Executes the given `updateFunction` and attempts to commit
	 * the changes applied within it as a Transaction. If any document
	 * read within the transaction has changed, Cloud Firestore retries
	 * the updateFunction.
	 *
	 * @param {function} fn A function that will receive an object with methods to describe the transaction.
	 */
	async runTransaction(fn) {
		const tx = new Transaction(this);
		await fn(tx);
		await tx.commit();
	}
}
