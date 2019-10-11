import Document from './Document.old';
import Query from './Query';

/*
 * The REST API reference for the firestore database can be found here:
 * https://firebase.google.com/docs/firestore/reference/rest/
 */

/*
 * The Fetch API throws only when there is a network connection issue, therefore
 * we need to manually check for the response status and throw an error ourselves.
 *
 * This function checks that that the response object returns with the 'ok' boolean set to true,
 * thats Fetch API's way of telling us that the response status is in the "successful" range.
 */
async function handleRequestErrors(response) {
	if (!response.ok) {
		throw (await response.json()).error.message;
	}
	return response;
}

const APIEndpoint = 'https://firestore.googleapis.com/v1beta1/';

/*
 * The public API
 */
export default class Database {
	constructor({ config, auth, databaseName = '(default)' }) {
		if (!('projectId' in config) && !config.projectId)
			throw Error('Database constructor expected the "config" argument to have a valid "projectId" property');

		this._rootPath = `projects/${config.projectId}/databases/${databaseName}/documents/`;
		this._auth = auth;
	}

	/*
	 * Helper function for making requests and handling them.
	 * returns a promise.
	 */
	async request(url, method = 'GET', body) {
		// Validate the HTTP Method.
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw Error('Invalid method');

		// Validate that the body argument is an object.
		if (body && Object.prototype.toString.call(body) !== '[object Object]')
			throw Error("The request 'body' argument should be an object");

		// Try to make the request and hope for a good response.
		try {
			let response = await fetch(url, {
				method: method,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: 'Bearer ' + this._auth.session.idToken
				},
				// If the body was passed as an argument then stringify it, else use undefined.
				body: body ? JSON.stringify(body) : undefined

				/*
				 * Check that the response is OK.(fetch doesn't throw on 404s or other response errors,
				 * it throws only when there is a connection issue.)
				 */
			})
				.then(handleRequestErrors)
				.then(response => response.json());

			return response;
		} catch (error) {
			// Try to get a "human readable" error.
			throw Error(error);
		}
	}

	/*
	 * Read documents from the database.
	 */
	get(path) {
		return this.request(APIEndpoint + this._rootPath + path, 'GET').then(response => {
			// If there are multiple results.
			if (Array.isArray(response.documents)) {
				return response.documents.map(doc => new Document(doc));
			}

			// It it is a single document
			return new Document(response);
		});
	}

	/*
	 * Add a document to the database.
	 */
	add(path, document) {
		if (!(document instanceof Document)) throw Error('The document passed must be an instance of the Document Object');

		this.request(APIEndpoint + this._rootPath + path, 'POST', Document.compose(document));
	}

	patch(document) {
		if (!(document instanceof Document)) throw Error('The document passed must be an instance of the Document Object');

		// Create a new document that includes only the modified properties.
		const modifiedDoc = Document.diff(document);
		// Create a DocumentMap of the changed fields.
		const docMask = Document.mask(modifiedDoc);
		// Create a query string from the document mask.
		const docMaskQuery = docMask.map(fieldMask => 'updateMask.fieldPaths=' + fieldMask).join('&');

		this.request(
			APIEndpoint + document.__meta__.name + '?' + docMaskQuery,
			'PATCH',
			JSON.stringify(Document.compose(modifiedDoc))
		);
	}

	delete(document) {
		if (!(document instanceof Document)) throw Error('The document passed must be an instance of the Document Object');

		this.request(APIEndpoint + document.__meta__.name, 'DELETE');
	}

	get query() {
		const db = this;

		// Add a 'send' method class.
		Query.prototype.send = function() {
			return db.request(APIEndpoint + db._rootPath + ':runQuery', 'POST', this.compose());
		};

		return new Query();
	}

	/*
	 * Export the Document class
	 */

	static get Document() {
		return Document;
	}
}
