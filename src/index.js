import Document from './Document';

/*
 * The REST API reference for the firestore database can be found here:
 * https://firebase.google.com/docs/firestore/reference/rest/
 */


/*
 * The Fetch API throws only when there is a network connection issue, therefore
 * we need to manually check for the response status and throw an error ourselves.
 *
 * This function checkes that that the response object returns with the 'ok' boolean set to true,
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
	constructor({ config, auth, databaseName = '(default)'}) {
		this._rootPath = '/projects/' + config.projectId + '/databases/' + databaseName + '/documents/';
		this._endpoint = 'https://firestore.googleapis.com/v1beta1' + this._rootPath;
		this._sessionKey = config.projectId + ':' + config.apiKey;
		this._auth = auth;
	}

	/*
	 * Helper function for making requests and handleing them.
	 * returns a promise.
	 */
	async request(url, method = 'GET', body) {
		// Validate the the method is valid.
		if(!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw Error('Invalid method');
		// Validate that the body argument is an object.
		if( body && Object.prototype.toString.call(body) !== '[object Object]') throw Error("The request 'body' argument should be an object");

		// Try to make the request and hope for a good response.
		try {
			let response = await fetch(url, {
				method: method,
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': 'Bearer ' + this._auth.session.idToken
				},
				// If the body was passed as an argument then stringify it, else use undefined.
				body: body ? JSON.stringify(body) : undefined

			// Check that the response is OK.(fetch doesnt throw on 404s or other respose errors, it throws only when there is a connection issue.)
			}).then(handleRequestErrors).then(response => response.json());

			return response;

		} catch(error) {
			// Try to get a "human readable" error.
			throw Error(error);
		}
	}

	/*
	 * Read documents from the database.
	 */
	get(documentPath) {
		return this.request(this._endpoint + documentPath, 'GET').then(response => response.documents.map(({name, fields, createTime, updateTime}) => {
			return {
				$name: name,
				$id: name.split('/').pop(),
				$createTime: Date.parse(createTime),
				$updateTime: Date.parse(updateTime),
				...Document.parse(fields)
			};
		}));
	}

	/*
	 * Add a document to the database.
	 */
	async add(documentPath, fields) {
		this.request(this._endpoint + documentPath, 'POST', Document.from(fields)).then(response => response);
	}
}
