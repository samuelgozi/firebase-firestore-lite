import List from '../src/List.js';
import Reference from '../src/Reference.js';
import Database from '../src/index.js';
import Document from '../src/Document.js';

const db = new Database({ projectId: 'projectId' });
const rawDoc = {
	name: 'projects/projectId/databases/(default)/documents/public/types',
	fields: {
		one: {
			stringValue: 'one'
		}
	},
	createTime: '2019-10-10T14:00:00.617973Z',
	updateTime: '2019-10-10T14:44:42.885653Z'
};

const rawList = {
	documents: [rawDoc],
	nextPageToken: 'token'
};

describe('List', () => {
	test('Throws when a reference is missing', () => {
		expect(() => {
			new List(rawList);
		}).toThrow('The "reference" argument is required when creating a List');
	});

	test('Throws when the reference points to a Document', () => {
		expect(() => {
			const ref = new Reference('col/doc', db);

			new List(rawList, ref);
		}).toThrow('The reference in a list should point to a collection');
	});

	test('Correctly parses the response into an array of documents', () => {
		const ref = new Reference('col', db);
		const list = new List(rawList, ref);

		expect(list.documents).toEqual([{ one: 'one' }]);
		expect(list.documents[0]).toBeInstanceOf(Document);
	});
});
