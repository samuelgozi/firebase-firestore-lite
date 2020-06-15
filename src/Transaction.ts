import {
	compileOptions,
	trimPath,
	isDocPath,
	encode,
	isDocReference
} from './utils';
import { Document, FirebaseDocument } from './Document';
import { Reference, CrudOptions } from './Reference';
import { Database } from './Database';
import Transform from './Transform';

type Ref = Reference | Document | string;

export class Transaction {
	writes: any[] = [];
	preconditions: any = {};

	constructor(private db: Database) {}

	/**
	 * Creates a write instruction and adds it into the
	 * transaction writes array.
	 * @private
	 */
	private write(ref: Ref, data = {}, options: CrudOptions = {}) {
		const transforms: Transform[] = [];
		const isDoc = ref instanceof Document;

		if (!isDocPath(ref) && !isDocReference(ref) && !isDoc)
			throw Error(
				'Expected a Document, Reference or a string path pointing to a document.'
			);

		if (typeof data !== 'object')
			throw Error('The data object should be an object');

		// Compile the JS Object into a Firebase Document.
		const doc = encode(isDoc ? ref : data, transforms) as FirebaseDocument;
		// Compile the options object into Firebase API arguments.
		options = compileOptions(options, data);
		// Check if there is any precondition created by getting a document
		// as part of this transaction, and if there is then use it.
		this.preconditions[doc.name] &&
			(options.currentDocument = this.preconditions[doc.name]);

		// Get the document's name
		doc.name = isDoc
			? (ref as Document).__meta__.name
			: (ref as Reference).name ||
			  `${this.db.rootPath}/${trimPath(ref as string)}`;

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

	set(ref: Ref, data: any) {
		this.write(ref, data);
	}

	update(ref: Ref, data: any) {
		this.write(ref, data, { exists: true });
	}

	/**
	 * Adds a delete operation to the transaction.
	 */
	delete(ref: Ref) {
		const isDoc = ref instanceof Document;
		const name = isDoc
			? (ref as Document).__meta__.name
			: (ref as Reference).name ||
			  `${this.db.rootPath}/${trimPath(ref as string)}`;

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
