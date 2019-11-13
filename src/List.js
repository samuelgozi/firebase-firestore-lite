export default class List {
	static isRawList(data) {
		return 'documents' in data && 'nextPageToken' in data;
	}

	constructor(rawList, ref, options) {
		this.ref = ref;
		this.options = options;
		this.documents = rawList.documents.map(rawDoc => new Document(rawDoc), ref.db);
	}

	getNextPage() {
		return this.ref.get(this.options);
	}
}
