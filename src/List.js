import Document from './Document.js';
/**
 * Represents a collection list response, with functionality
 * for getting the next page when available.
 * @param {Object} rawList The response "raw" list object.
 * @param {Reference} ref A reference to the collection.
 * @param {Object} options Any options that were passed at first to the get request.
 */
export default class List {
	constructor(rawList, ref, options = {}) {
		const { documents, nextPageToken } = rawList;
		this.ref = ref;
		this.options = options;
		this.documents = documents ? rawList.documents.map(rawDoc => new Document(rawDoc, ref.db)) : [];
		this.options.pageToken = nextPageToken;
	}

	getNextPage() {
		return this.ref.get(this.options);
	}
}
