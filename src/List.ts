import { Document, FirebaseDocument } from './Document';
import Reference from './Reference';

interface FirebaseList {
	documents: FirebaseDocument[];
	nextPageToken: string;
}

export interface FirebaseListOptions {
	pageSize?: number;
	pageToken?: string;
	orderBy?: string;
	showMissing?: boolean;
}

/**
 * Represents a collection list response, with functionality
 * for getting the next page when available.
 * @param {Object} rawList The response "raw" list object.
 * @param {Reference} ref A reference to the collection.
 * @param {Object} options Any options that were passed at first to the get request.
 */
export class List {
	ref: Reference;
	options: any;
	documents: Document[];

	constructor(rawList: FirebaseList, ref: Reference, options: FirebaseListOptions = {}) {
		if (ref === undefined) throw Error('The "reference" argument is required when creating a List');
		if (!ref.isCollection) throw Error('The reference in a list should point to a collection');

		const { documents, nextPageToken } = rawList;
		this.ref = ref;
		this.options = options;
		this.documents = documents ? documents.map(rawDoc => new Document(rawDoc, ref.db)) : [];
		this.options.pageToken = nextPageToken;
	}

	/** Fetches the next page in the query */
	getNextPage(): List {
		return this.ref.get(this.options);
	}
}
