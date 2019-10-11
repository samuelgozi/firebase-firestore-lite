/**
 * Returns true if an object is a "raw" firebase document.
 * @param {Object} document the object/document to test
 * @returns {boolean}
 */
export function isRawDocument(document) {
	// A Firestore document must have these three keys.
	// The fields key is optional.
	// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents
	for (let fieldName of ['name', 'fields', 'createTime', 'updateTime']) {
		if (!(fieldName in document)) return false;
	}

	return true;
}
