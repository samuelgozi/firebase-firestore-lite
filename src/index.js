import { handleRequest } from './utils.js';
import Reference from './Reference.js';
const ENDPOINT = 'https://firestore.googleapis.com/v1beta1/';

/*
 * The public API
 */
export default class Database {
	constructor({ projectId, auth, databaseName = '(default)' }) {
		if (projectId === undefined)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this.name = databaseName;
		this.endpoint = `${ENDPOINT}projects/${projectId}/databases/${databaseName}/documents/`;
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

		if (this.auth && this.auth.authorizeRequest) {
			this.auth.authorizeRequest(request);
		}

		return fetch(request).then(handleRequest);
	}

	ref(path) {
		return new Reference(path, this);
	}
}
