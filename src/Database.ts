import { Reference } from './Reference';
import { Document } from './Document';
import { restrictTo } from './utils';
import { Transaction } from './Transaction';

/** @private */
async function handleApiResponse(res: Response) {
	if (!res.ok) {
		const data = await res.json();
		throw Array.isArray(data) ? data : Object.assign(new Error(), data.error);
	}

	return res.json();
}

interface Auth {
	authorizedRequest(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

export interface DatabaseOptions {
	/** Firebase's project ID */
	projectId: string;
	/** The name to use for this database instance */
	name?: string;
	/** Auth instance */
	auth?: Auth;

	/**
	 * Host to use as the firebase endpoint, intended for use with emulators.
	 * Don't include trailing slashes.
	 */
	host?: String;
	/** Whether to use the HTTPS protocol or not. Set to false for emulators.*/
	ssl?: boolean;
}

interface UpdateFunction {
	(tx?: Transaction): Promise<void> | void;
}

/** Database Instance */
export class Database {
	name: string;
	rootPath: string;
	endpoint: string;
	auth?: Auth;

	constructor({
		projectId,
		auth,
		name = '(default)',
		host = 'firestore.googleapis.com',
		ssl = true
	}: DatabaseOptions) {
		if (projectId === undefined)
			throw Error(
				'Database constructor expected the "config" argument to have a valid "projectId" property'
			);

		this.name = name;
		this.auth = auth;
		this.rootPath = `projects/${projectId}/databases/${name}/documents`;
		this.endpoint = `http${ssl ? 's' : ''}://${host}/v1/${this.rootPath}`;
	}

	/**
	 * For internal use only.
	 * Uses native fetch, but adds authorization headers
	 * if the Reference was instantiated with an auth instance.
	 * The API is exactly the same as native fetch.
	 * @private
	 */
	fetch(input: RequestInfo, init?: RequestInit) {
		if (this.auth && this.auth.authorizedRequest)
			return this.auth.authorizedRequest(input, init).then(handleApiResponse);

		return fetch(input, init).then(handleApiResponse);
	}

	/**
	 * Returns a reference to a document or a collection.
	 * @param {(string|Document)} path Path to the collection or document.
	 * @returns {Reference} instance of a reference.
	 */
	ref(path: string | Document): Reference {
		if (path instanceof Document) path = path.__meta__.path;
		return new Reference(path as string, this);
	}

	async batchGet(refs: Array<Reference | string>) {
		const response = await this.fetch(this.endpoint + ':batchGet', {
			method: 'POST',
			body: JSON.stringify({
				documents: refs.map(ref => {
					const path = restrictTo('doc', ref);
					return `${this.rootPath}/${path}`;
				})
			})
		});

		return response.map((entry: any) =>
			entry.found
				? new Document(entry.found, this)
				: Object.defineProperty({}, '__missing__', { value: entry.missing })
		);
	}

	/** Returns a new transaction instance */
	transaction() {
		return new Transaction(this);
	}

	/**
	 * Executes the given `updateFunction` and attempts to commit
	 * the changes applied within it as a Transaction. If any document
	 * read within the transaction has changed, Cloud Firestore retries
	 * the updateFunction. If it fails to commit after 5 attempts, the
	 * transaction fails and throws.
	 *
	 * Will not re-attempt if an error is thrown inside the `updateFunction`
	 * or if any error that is not related to the transaction is received
	 * like a network error etc.
	 */
	async runTransaction(fn: UpdateFunction, attempts = 5) {
		const tx = new Transaction(this);

		while (attempts > 0) {
			await fn(tx);

			// Only retry on transaction errors.
			try {
				await tx.commit();
				break; // Stop trying if it succeeded.
			} catch (e) {
				// Only throw if the error is not related to the transaction, or it is the last attempt.
				if (
					attempts === 0 ||
					(e.status !== 'NOT_FOUND' && e.status !== 'FAILED_PRECONDITION')
				)
					throw Error(e);
			}
			attempts--;
		}
	}
}
