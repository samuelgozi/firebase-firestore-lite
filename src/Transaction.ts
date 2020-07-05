import {
	compileOptions,
	encode,
	fid,
	getPathFromRef,
	Ref,
	restrictTo
} from './utils';
import { Document, FirebaseDocument } from './Document';
import { Reference, CrudOptions } from './Reference';
import { Database } from './Database';
import Transform from './Transform';

export class Transaction {
	writes: any[] = [];
	preconditions: any = {};

	constructor(private db: Database) {}

	/**
	 * Creates a write instruction and adds it into the
	 * transaction writes array.
	 * @private
	 */
	private write(ref: Ref, data: any, options: CrudOptions = {}) {
		if (typeof data !== 'object') throw Error('The data argument is missing');

		const transforms: Transform[] = [];
		const name = `${this.db.rootPath}/${getPathFromRef(ref)}`;
		const precondition = this.preconditions[name];
		// Compile the JS Object into a Firebase Document.
		const doc = encode(
			ref instanceof Document ? ref : data,
			transforms
		) as FirebaseDocument;
		// Compile the options object into Firebase API arguments.
		options = compileOptions(options, data);
		// Check if there is any precondition created by getting a document
		// as part of this transaction, and if there is then use it.
		precondition && (options.currentDocument = precondition);
		// Set the document's name
		doc.name = name;

		// Add the static properties.
		this.writes.push({
			update: doc,
			...options
		});

		// Add the Transforms if available.
		transforms.length &&
			this.writes.push({
				transform: {
					document: doc.name,
					fieldTransforms: transforms
				}
			});
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
	 */
	async get(refs: Array<Reference | string>) {
		const docs = await this.db.batchGet(refs);

		docs.forEach((doc: any) => {
			const { name, updateTime } = doc.__meta__ || { name: doc.__missing__ };
			this.preconditions[name] = updateTime
				? { updateTime }
				: { exists: false };
		});

		return docs;
	}

	add(ref: string | Reference, data: any, options: CrudOptions = {}) {
		const path = `${restrictTo('col', ref)}/${fid()}`;
		this.write(path, data, { exists: false, ...options });
		return this.db.ref(path);
	}

	set(ref: Ref, data: any, options: CrudOptions = {}) {
		restrictTo('doc', ref);
		this.write(ref, data, options);
	}

	update(ref: Ref, data: any, options: CrudOptions = {}) {
		restrictTo('doc', ref);
		this.write(ref, data, { exists: true, updateMask: true, ...options });
	}

	/**
	 * Adds a delete operation to the transaction.
	 */
	delete(ref: Ref, options: CrudOptions = {}) {
		const name = `${this.db.rootPath}/${restrictTo('doc', ref)}`;

		options = compileOptions(options);
		// Check if there is any precondition created by getting a document
		// as part of this transaction, and if there is then use it.
		this.preconditions[name] &&
			(options.currentDocument = this.preconditions[name]);

		this.writes.push({
			delete: name,
			...options
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
