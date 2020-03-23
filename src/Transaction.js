import { getKeyPaths, encode } from './utils.js';
import Reference from '../src/Reference.js';

export default class Transaction {
	constructor(db) {
		this.db = db;
		this.writes = [];
	}

	/**
	 * Not optimized way of generating a document name.
	 * Should be rewritten, but will require rewrite of reference
	 * to avoid repeating code.
	 * @private
	 */
	getName(ref) {
		ref = ref instanceof Reference ? ref : new Reference(ref, this.db);
		if (ref.isCollection) throw Error('The reference should point to a Document, but points to a Collection instead');
		return ref.name;
	}

	/**
	 * Adds a write instructions to the transaction.
	 * Works the same as regular "set" method.
	 * @param {Reference|string} ref Reference to a document, or a string path.
	 * @param {object} data An object with the data to write.
	 */
	set(ref, data) {
		const doc = encode(data);
		doc.name = this.getName(ref);

		this.writes.push({
			update: doc
		});
	}

	update(ref, data) {
		const doc = encode(data);
		doc.name = this.getName(ref);

		this.writes.push({
			update: doc,
			updateMask: { fieldPaths: getKeyPaths(data) },
			currentDocument: { exists: true }
		});
	}

	delete(ref) {
		this.writes.push({ delete: this.getName(ref) });
	}

	async commit() {
		return void (await this.db.fetch(this.endpoint + ':batchGet', {
			method: 'POST',
			body: JSON.stringify({ writes: this.writes })
		}));
	}
}
