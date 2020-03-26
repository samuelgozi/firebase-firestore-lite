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
	 * Adds a write instructions to the transaction.
	 * Works the same as regular "set" method.
	 * @param {Reference|string} ref Reference to a document, or a string path.
	 * @param {object} data An object with the data to write.
	 */
	set(ref, data) {
		const doc = this.handleArguments(ref, data);

		this.writes.push({
			update: doc,
			currentDocument: this.preconditions[doc.name]
		});
	}

	update(ref, data) {
		const doc = this.handleArguments(ref, data);

		this.writes.push({
			update: doc,
			updateMask: { fieldPaths: getKeyPaths(data) },
			currentDocument: this.preconditions[doc.name] || { exists: true }
		});
	}

	delete(ref) {
		const name = this.handleArguments(ref).name;

		this.writes.push({
			delete: name,
			currentDocument: this.preconditions[name]
		});
	}

	async commit() {
		this.preconditions = {};

		return void (await this.db.fetch(this.db.endpoint + ':commit', {
			method: 'POST',
			body: JSON.stringify({ writes: this.writes })
		}));
	}
}
