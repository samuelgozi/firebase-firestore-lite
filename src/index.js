import errors from './errors';

/*
 * The REST API reference for the firestore database can be found here:
 * https://firebase.google.com/docs/firestore/reference/rest/
 */

function getHumanReadableError(error) {
	// First check if the user is connected to the internet(this check does not fully reflect the user connection status).
	if(!navigator.onLine) return 'You are not connected to the Internet.';

	// Try to get the correct message(sometimes in different places).
	let errorMessage = error.error ? error.error.message : error.message;

	/*
	 * Check if we have a more readable error for this error code in our language files.
	 * If we do have one, return it, else return what we have.
	 */
	return errors[errorMessage] || errorMessage;
}

/*
 * The Fetch API throws only when there is a network connection issue, therefore
 * we need to manually check for the response status and throw an error ourselves.
 *
 * This function checkes that that the response object returns with the 'ok' boolean set to true,
 * thats Fetch API's way of telling us that the response status is in the "successful" range.
 */
function handleRequestErrors(response) {
	if (!response.ok) {
		throw Error(response.statusText);
	}
	return response;
}

/*
 * The public API
 */
export default class {
	constructor({ config, auth, databaseName = '(default)'}) {
		this._endpoint = 'https://firestore.googleapis.com/v1beta1/projects/' + config.projectId + '/databases/' + databaseName + '/documents/';
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
			throw Error(getHumanReadableError(error));
		}
	}

	/*
	 * Read documents from the database.
	 */
	get(documentPath) {
		return this.request(this._endpoint + documentPath, 'GET');
	}

	/*
	 * Add a document to the database.
	 */
	// async add(documentPath, documentBody) {
	// 	let request = this.request(this._endpoint + documentPath, 'POST', documentBody).then(response => {
	// 		console.log(response);
	// 	});
	// }
}
