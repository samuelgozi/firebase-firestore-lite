import { trimPath, isDocPath, getKeyPaths, encode, isDocReference } from './utils.js';
import Document from './Document.js';

export default class Transaction {
	constructor(db) {
		this.db = db;
		this.writes = [];
		this.preconditions = {};
	}

	/**
	 * Validates that the arguments are of the correct types,
	 * and that the documents are valid for this transaction.
	 * Lastly we will return reliable data about the document.
	 * @private
	 */
	handleArguments(ref, data = {}) {
		const isDoc = ref instanceof Document;

		if (!isDocPath(ref) && !isDocReference(ref) && !isDoc)
			throw Error('Expected a Document, Reference or a string path pointing to a document.');

		if (typeof data !== 'object') throw Error('The data object should be an object');

		const doc = encode(isDoc ? ref : data);
		doc.name = isDoc ? ref.__meta__.name : ref.name || `${this.db.rootPath}/${trimPath(ref)}`;
		return doc;
	}

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
	async get(refs) {
		const docs = await this.db.batchGet(refs);

		docs.forEach(doc => {
			const { name, updateTime } = doc.__meta__ || { name: doc.__missing__ };
			this.preconditions[name] = updateTime ? { updateTime } : { exists: false };
		});

		return docs;
	}

	/**
	 * Adds a write operation to the transaction, will create a document if
	 * it didn't exist before, and overwrite all fo the data if it did.
	 * @param {Reference|Document|string} ref Reference, Document instance or a string path to the document.
	 * @param {object} data An object with the data.
	 */
	set(ref, data) {
		const doc = this.handleArguments(ref, data);

		this.writes.push({
			update: doc,
			currentDocument: this.preconditions[doc.name]
		});
	}

	/**
	 * Adds a write operation to the transaction, will create a document if
	 * it didn't exist before, and merge the data if it does exist.
	 * @param {Reference|Document|string} ref Reference, Document instance or a string path to the document.
	 * @param {object} data An object with the data.
	 */
	update(ref, data) {
		const doc = this.handleArguments(ref, data);

		this.writes.push({
			update: doc,
			updateMask: { fieldPaths: getKeyPaths(data) },
			currentDocument: this.preconditions[doc.name] || { exists: true }
		});
	}

	/**
	 * Adds a delete operation to the transaction.
	 * @param {Reference|Document|string} ref Reference, Document instance or a string path to the document.
	 */
	delete(ref) {
		const name = this.handleArguments(ref).name;

		this.writes.push({
			delete: name,
			currentDocument: this.preconditions[name]
		});
	}

	/**
	 * Commits the transaction.
	 * Will throw if the transaction failed.
	 */
	async commit() {
		this.preconditions = {};

		return void (await this.db.fetch(this.db.endpoint + ':commit', {
			method: 'POST',
			body: JSON.stringify({ writes: this.writes })
		}));
	}
}
