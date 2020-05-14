// @ts-ignore
import { Document, FirebaseDocument } from './Document.ts';
// @ts-ignore
import Reference from './Reference.ts';

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

	constructor(
		rawList: FirebaseList,
		ref: Reference,
		options: FirebaseListOptions = {}
	) {
		if (ref === undefined)
			throw Error('The "reference" argument is required when creating a List');
		if (!ref.isCollection)
			throw Error('The reference in a list should point to a collection');

		const { documents, nextPageToken } = rawList;
		this.ref = ref;
		this.options = options;
		this.documents = documents
			? documents.map(rawDoc => new Document(rawDoc, ref.db))
			: [];
		this.options.pageToken = nextPageToken;
	}

	/** Fetches the next page in the query */
	getNextPage() {
		return this.ref.list(this.options);
	}

	[Symbol.iterator]() {
		// Use a new index for each iterator. This makes multiple
		// iterations over the iterable safe for non-trivial cases,
		// such as use of break or nested looping over the same iterable.
		let index = 0;

		return {
			next: () => {
				if (index < this.documents.length) {
					return { value: this.documents[index++], done: false };
				} else {
					return { done: true };
				}
			}
		};
	}
}
