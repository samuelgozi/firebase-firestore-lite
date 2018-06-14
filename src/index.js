import Document from './Document';

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

/*
 * The public API
 */
export default class {
	constructor({ config, auth, databaseName = '(default)' }) {
		const { projectId, apiKey } = config;

		this._rootPath = `projects/${projectId}/databases/${databaseName}/documents/`;
		this._endpoint = 'https://firestore.googleapis.com/v1beta1/';
		this._sessionKey = projectId + ':' + apiKey;
		this._auth = auth;
	}

	/*
	 * Helper function for making requests and handling them.
	 * returns a promise.
	 */
	async request(url, method = 'GET', body) {
		// Validate the the method is valid.
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method))
			throw Error('Invalid method');
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
		return this.request(
			this._endpoint + this._rootPath + path,
			'GET'
		).then(response => new Document(response));
	}

	/*
	 * Add a document to the database.
	 */
	add(path, document) {
		if (!(document instanceof Document)) throw Error('The document passed must be an instance of the Document Object');

		this.request(
			this._endpoint + this._rootPath + path,
			'POST',
			Document.compose(document)
		);
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
			this._endpoint + document.__meta__.name + '?' + docMaskQuery,
			'PATCH',
			JSON.stringify(Document.compose(modifiedDoc))
		);
	}

	delete(document) {
		if (!(document instanceof Document)) throw Error('The document passed must be an instance of the Document Object');

		this.request(
			this._endpoint + document.__meta__.name,
			'DELETE'
		);
	}

	/*
	 * Export the Document class
	 */

	static get Document() {
		return Document;
	}
}
