import Database from './Database';
import Transform from './Transform';
import Query from './Query';
import { Document, FirebaseMap } from './Document';
import { List } from './List';
import {
	compileOptions,
	trimPath,
	isDocPath,
	objectToQuery,
	encode,
	getKeyPaths,
	fid
} from './utils';

export interface CrudOptions {
	[key: string]: any;
	/**
	 * When set to true, the update will only patch the given
	 * object properties instead of overwriting the whole document.
	 */
	updateMask?: boolean;
	/** An array of the key paths to return back after the operation */
	mask?: string[];
	/**
	 * When set to true, the target document must exist.
	 * When set to false, the target document must not exist.
	 * When undefined, it doesn't matter.
	 */
	exists?: boolean;
	/**
	 * When set, the target document must exist and have been last updated at that time.
	 * A timestamp in RFC3339 UTC "Zulu" format, accurate to nanoseconds.
	 */
	updateTime?: string;
}

export class Reference {
	/** The ID of the document inside the collection */
	id: string;
	/** The path to the document relative to the database root */
	path: string;
	/** Whether or not this reference points to the root of the database */
	isRoot: boolean;

	readonly name: string;
	readonly endpoint: string;

	constructor(path: string, readonly db: Database) {
		if (db === undefined) throw Error('Argument "db" is required but missing');

		// Normalize the path by removing slashes from
		// the beginning or the end and trimming spaces.
		path = trimPath(path);

		this.id = path.split('/').pop() ?? '';
		this.path = path;
		this.name = `${db.rootPath}/${path}`;
		this.endpoint = `${db.endpoint}/${path}`;
		this.isRoot = path === '';
	}

	/** Returns a reference to the parent document/collection */
	get parent() {
		if (this.isRoot) throw Error("Can't get the parent of root");
		return new Reference(this.path.replace(/\/?([^/]+)\/?$/, ''), this.db);
	}

	/** Returns a reference to the parent collection */
	get parentCollection() {
		if (this.isRoot) throw Error("Can't get parent of a root collection");
		if (this.isCollection)
			return new Reference(
				this.path.replace(/(\/([^/]+)\/?){2}$|^([^/]+)$/, ''),
				this.db
			);
		return this.parent;
	}

	/** Returns true if this reference is a collection */
	get isCollection() {
		return this.path !== '' && !isDocPath(this.path);
	}

	/** Returns a reference to the specified child path */
	child(path: string) {
		// Remove starting forward slash
		path = path.replace(/^\/?/, '');

		// Return a newly created document with the new sub path.
		return new Reference(`${this.path}/${path}`, this.db);
	}

	/**
	 * Helper that handles Transforms in objects.
	 * If the object has a transform then a transaction will be made,
	 * and a promise for the resulting document will be returned.
	 * Else, if it doesn't have any Transforms then we return the parsed
	 * document and let the caller handle the request.
	 */
	private transact(obj: object, options = {}): FirebaseMap | Promise<Document> {
		if (typeof obj !== 'object')
			throw Error(`The document argument is missing`);

		const transforms: Transform[] = [];
		const doc = encode(obj, transforms);
		let ref: Reference = this;

		// If this is a collections, then generate a name,
		// and also make sure the doc doesn't exist.
		if (this.isCollection) {
			options = { ...options, currentDocument: { exists: false } };
			ref = this.child(fid());
		}

		if (transforms.length === 0) return doc;

		const tx = this.db.transaction();
		// In 'createDocument' operations, the server computes the document ID.
		// Transactions don't support 'createDocument' operations, therefore
		// we need to generate it on the client.
		// If you, like me, think this is a bad idea, the worry not(or less),
		// its "virtually" impossible to have a clash.
		doc.name = ref.name;
		tx.writes.push(
			{
				update: doc,
				...options
			},
			{
				transform: {
					document: ref.name,
					fieldTransforms: transforms
				}
			}
		);
		tx.commit();
		return ref.get();
	}

	private restrict(colOrDoc: boolean) {
		if (this.isCollection !== colOrDoc)
			throw Error(
				`Tried to access a ${colOrDoc ? 'collection' : 'document'} method`
			);
	}

	/** Create a new document with a randomly generated id */
	async add(obj: object, options = {}) {
		this.restrict(true);
		const doc = this.transact(obj, options);
		if (doc instanceof Promise) return await doc;

		return new Document(
			await this.db.fetch(this.endpoint + objectToQuery(options), {
				// If this is a path to a specific document use
				// patch instead, else, create a new document.
				method: 'POST',
				body: JSON.stringify(doc)
			}),
			this.db
		);
	}

	/** returns all documents in the collection */
	async list(options?: object) {
		this.restrict(true);
		return new List(
			await this.db.fetch(this.endpoint + objectToQuery(options)),
			this,
			options
		);
	}

	/** Returns the document of this reference. */
	async get(options?: object) {
		this.restrict(false);
		return new Document(
			await this.db.fetch(this.endpoint + objectToQuery(options)),
			this.db
		);
	}

	/** Create a new document or overwrites an existing one matching this reference. */
	async set(obj: object, options = {}) {
		this.restrict(false);
		return this.update(obj, {
			updateMask: false,
			exists: undefined,
			...options
		});
	}

	/** Updates a document while ignoring all missing fields in the provided object. */
	async update(obj: object, options = {}): Promise<Document> {
		this.restrict(false);
		options = compileOptions(
			{
				updateMask: true,
				exists: true,
				...options
			},
			obj
		);

		const doc = this.transact(obj, options);
		if (doc instanceof Promise) return await doc;

		return new Document(
			await this.db.fetch(this.endpoint + objectToQuery(options), {
				method: 'PATCH',
				body: JSON.stringify(doc)
			}),
			this.db
		);
	}

	/** Deletes the referenced document from the database. */
	delete() {
		this.restrict(false);
		return this.db.fetch(this.endpoint, { method: 'DELETE' });
	}

	/** Queries the child documents/collections of this reference. */
	query(options = {}) {
		this.restrict(true);

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
