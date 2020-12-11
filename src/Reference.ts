import { Database } from './Database';
import { Query, QueryOptions } from './Query';
import { Document } from './Document';
import { List } from './List';
import { trimPath, isPath, objectToQuery, restrictTo } from './utils';

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
		if (typeof path !== 'string')
			throw Error('The "path" argument should be a string');

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
		return isPath('col', this.path);
	}

	/** Returns a reference to the specified child path */
	child(path: string) {
		// Remove starting forward slash
		path = path.replace(/^\/?/, '');

		// Return a newly created document with the new sub path.
		return new Reference(`${this.path}/${path}`, this.db);
	}

	private async transact(
		method: 'add' | 'set' | 'update' | 'delete',
		obj: object,
		options: CrudOptions = {}
	) {
		const tx = this.db.transaction();
		const res = tx[method](this, obj, options);
		return await tx.commit().then(() => res);
	}

	/** Returns all documents in the collection */
	async list(options?: object) {
		restrictTo('col', this);
		return new List(
			await this.db.fetch(this.endpoint + objectToQuery(options)),
			this,
			options
		);
	}

	/** Returns the document of this reference. */
	async get(options: CrudOptions = {}) {
		restrictTo('doc', this);

		return new Document(
			await this.db.fetch(this.endpoint + objectToQuery(options)),
			this.db
		);
	}

	/** Create a new document with a randomly generated id */
	async add(obj: object, options: CrudOptions = {}) {
		restrictTo('col', this);
		return this.transact('add', obj, options);
	}

	/** Create a new document or overwrites an existing one matching this reference. */
	async set(obj: object, options: CrudOptions = {}) {
		restrictTo('doc', this);
		return this.transact('set', obj, options);
	}

	/** Updates a document while ignoring all missing fields in the provided object. */
	async update(obj: object, options: CrudOptions = {}) {
		restrictTo('doc', this);
		return this.transact('update', obj, options);
	}

	/** Deletes the referenced document from the database. */
	async delete(options: CrudOptions = {}) {
		restrictTo('doc', this);
		return this.transact('delete', options);
	}

	/** Queries the child documents/collections of this reference. */
	query(options: QueryOptions = {}) {
		restrictTo('col', this);

		return new Query(this.parent, {
			from: {
				collectionId: this.id
			},
			...options
		});
	}

	toJSON() {
		return {
			referenceValue: this.name
		};
	}
}
