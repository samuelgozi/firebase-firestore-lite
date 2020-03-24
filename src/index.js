import Reference from './Reference.js';
import Document from './Document';
import { isDocPath, trimPath, isDocReference } from './utils.js';
import Transaction from './Transaction.js';

const ENDPOINT = 'https://firestore.googleapis.com/v1/';

/*
 * The public API
 */
export default class Database {
	constructor({ projectId, auth, name = '(default)' }) {
		if (projectId === undefined)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this.name = name;
		this.rootPath = `projects/${projectId}/databases/${name}/documents`;
		this.endpoint = ENDPOINT + this.rootPath;
		this.auth = auth;
	}

	/**
	 * For internal use only.
	 * Uses native fetch, but adds authorization headers
	 * if the Reference was instantiated with an auth instance.
	 * The API is exactly the same as native fetch.
	 * @param {Request|Object|string} resource the resource to send the request to, or an options object.
	 * @param {Object} init an options object.
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

	async runTransaction(fn) {
		const tx = new Transaction(this);

		/**
		 * Wraps batch get with additional functionality needed in transactions.
		 * Transactions need to be atomic. So in order to know that the document
		 * wasn't changed concurrently then we save the updateTime of each document.
		 *
		 * Later we tell the database to use that as a precondition for the write.
		 * In other words, if the update time of a document changed, then abort
		 * the transaction. However, if a document didn't exist, then we use that
		 * as a precondition, telling the database that if it was created concurrently
		 * then it should abort the operation.
		 * @param {Array.<Reference|string>} refs Array of references or string paths to retrieve.
		 */
		async function get(refs) {
			const docs = await this.db.batchGet(refs);

			docs.forEach(doc => {
				const { name, updateTime } = doc.__meta__ || { name: doc.__missing__ };
				this.preconditions[name] = updateTime ? { updateTime } : { exists: false };
			});
		}

		await fn({
			get: get.bind(tx),
			set: tx.set.bind(tx),
			update: tx.update.bind(tx),
			remove: tx.remove.bind(tx)
		});

		// Remove all the preconditions, since if the transaction fails
		// we will need new ones anyways.
		this.preconditions = {};

		tx.commit();
	}
}
