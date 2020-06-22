import { Document } from '../src/Document.ts';

// Mock database instance
const db = {
	rootPath: 'projects/projectId/databases/(default)/documents',
	endpoint: 'endpoint'
};

// Mock Firestore Document
const rawDoc = {
	name: 'projects/projectId/databases/(default)/documents/public/types',
	fields: {
		one: {
			stringValue: 'Hi!'
		},
		two: {
			booleanValue: false
		},
		three: {
			integerValue: '42'
		}
	},
	createTime: '2019-10-10T14:00:00.617973Z',
	updateTime: '2019-10-10T14:44:42.885653Z'
};

describe('Document instance', () => {
	test('Throws when db is missing', () => {
		expect(() => new Document(rawDoc)).toThrow(
			'Argument "db" is required but missing'
		);
	});

	test('Metadata is embeded in the document', () => {
		const doc = new Document(rawDoc, db);

		expect(doc.__meta__).toBeDefined();
		expect(doc.__meta__.db).toEqual(db);
		expect(doc.__meta__.createTime).toEqual(rawDoc.createTime);
		expect(doc.__meta__.updateTime).toEqual(rawDoc.updateTime);
		expect(doc.__meta__.path).toEqual('/public/types');
		expect(doc.__meta__.id).toEqual('types');
	});

	test('Metadata is hidden', () => {
		const doc = new Document(rawDoc, db);

		expect(Object.keys(doc).includes('__meta__')).toEqual(false);
	});

	test('All object properties are copied', () => {
		const doc = new Document(rawDoc, db);

		expect(doc).toEqual({
			one: 'Hi!',
			two: false,
			three: 42
		});
	});
});
