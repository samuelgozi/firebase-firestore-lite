import Reference from './Reference.js';
import Document from './Document';

const ENDPOINT = 'https://firestore.googleapis.com/v1beta1/';

/*
 * The public API
 */
export default class Database {
	constructor({ projectId, auth, databaseName = '(default)' }) {
		if (projectId === undefined)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this.name = databaseName;
		this.rootPath = `projects/${projectId}/databases/${databaseName}/documents`;
		this.endpoint = ENDPOINT + this.rootPath;
		this.auth = auth;
	}

	/**
	 * Uses native fetch, but adds authorization headers
	 * if the Reference was instantiated with an auth instance.
	 * The API is exactly the same as native fetch.
	 * @param {Request|Object|string} resource the resource to send the request to, or an options object.
	 * @param {Object} init an options object.
	 */
	fetch(resource, init) {
		const request = resource instanceof Request ? resource : new Request(resource, init);
		const shouldAuthorize = this.auth && this.auth.authorizeRequest;

		if (shouldAuthorize) {
			this.auth.authorizeRequest(request);
		}

		return fetch(request.clone()).then(async response => {
			const data = await response.json();

			if (!response.ok) {
				const error = data.error;
				// If the request failed due to outdated auth credentials,
				// and authentication was used to make the request, then try to
				// refresh the credentials and then remake the request.
				if (shouldAuthorize && error.message === 'Missing or invalid permissions.') {
					await this.auth.refreshIdToken();
					return this.fetch(request);
				}

				if (Array.isArray[data]) {
					throw data.length === 1 ? Error(data[0].error.message) : data;
				}
				throw Error(data.error.message);
			}

			return data;
		});
	}

	/**
	 * Gets multiple documents.
	 * Documents returned are not guaranteed to be in th same order as requested.
	 * @param {Reference[]} referencesArray Array of references to retrieve.
	 * @returns {Promise}
	 */
	batchGet(referencesArray) {
		const documents = referencesArray.map(ref => {
			if ('path' in ref) throw Error('batchGet expects an array of references');
			return ref.path;
		});

		return this.fetch(this.endpoint + ':batchGet', {
			method: 'POST',
			body: JSON.stringify({ documents })
		});
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
}
