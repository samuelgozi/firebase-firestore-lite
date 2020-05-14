import { List } from '../src/List.ts';
import Reference from '../src/Reference.ts';
import Database from '../src/Database.ts';
import { Document } from '../src/Document.ts';

const db = new Database({ projectId: 'projectId' });

const rawList = {
	documents: [
		{
			name: 'projects/projectId/databases/(default)/documents/public/1',
			fields: {
				one: {
					stringValue: 'one'
				}
			},
			createTime: '2019-10-10T14:00:00.617973Z',
			updateTime: '2019-10-10T14:44:42.885653Z'
		},
		{
			name: 'projects/projectId/databases/(default)/documents/public/2',
			fields: {
				two: {
					stringValue: 'two'
				}
			},
			createTime: '2019-10-10T14:00:00.617973Z',
			updateTime: '2019-10-10T14:44:42.885653Z'
		},
		{
			name: 'projects/projectId/databases/(default)/documents/public/3',
			fields: {
				three: {
					stringValue: 'three'
				}
			},
			createTime: '2019-10-10T14:00:00.617973Z',
			updateTime: '2019-10-10T14:44:42.885653Z'
		}
	],
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

		expect(list.documents).toEqual([
			{ one: 'one' },
			{ two: 'two' },
			{ three: 'three' }
		]);
		expect(list.documents[0]).toBeInstanceOf(Document);
	});

	test('Implements iterator protocol', () => {
		const ref = new Reference('col', db);
		const list = new List(rawList, ref);

		const ids = [];

		for (const doc of list) {
			ids.push(doc.__meta__.id);
		}

		expect(ids).toEqual(['1', '2', '3']);
	});
});
