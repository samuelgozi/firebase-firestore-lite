import Database from '../src/index.js';
import Reference from '../src/Reference.js';
import Document from '../src/Document.js';

describe('Constructor', () => {
	test('Throws when `projectId` is missing', () => {
		expect(() => new Database({ auth: {}, name: 'test' })).toThrow();
	});

	test('Constructs the correct endpoint', () => {
		const db = new Database({ projectId: 'test-project' });
		const customName = new Database({ projectId: 'test-project', name: 'db-name' });

		expect(db.endpoint).toEqual(
			'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents'
		);
		expect(customName.endpoint).toEqual(
			'https://firestore.googleapis.com/v1/projects/test-project/databases/db-name/documents'
		);
	});
});

describe('batchGet', () => {
	const db = new Database({ projectId: 'projectId' });

	test('Throws when the array contains anything else than a doc', async () => {
		const message = 'Array contains something other then References to documents';
		expect(db.batchGet([123])).rejects.toThrow(message);
		expect(db.batchGet(['123'])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc'), 123])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc/col'), 123])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc/col')])).rejects.toThrow(message);
	});

	test('Makes correct request', async () => {
		const refs = [db.reference('col/doc'), db.reference('col/doc2'), db.reference('col/doc3')];

		fetch.mockResponseOnce('[]');
		await db.batchGet(refs);

		const endpoint = fetch.mock.calls[0][0];
		const req = fetch.mock.calls[0][1];

		expect(endpoint).toEqual(
			'https://firestore.googleapis.com/v1/projects/projectId/databases/(default)/documents:batchGet'
		);
		expect(req).toEqual({
			method: 'POST',
			body: JSON.stringify({
				documents: [
					'projects/projectId/databases/(default)/documents/col/doc',
					'projects/projectId/databases/(default)/documents/col/doc2',
					'projects/projectId/databases/(default)/documents/col/doc3'
				]
			})
		});
	});
});

describe('Reference', () => {
	const db = new Database({ projectId: 'projectId' });
	test('Creates a reference for a Document instance', () => {
		const doc = new Document(
			// Mock raw document
			{
				name: 'projects/projectId/databases/(default)/documents/col/doc',
				createTime: '2019-12-07T17:08:59.481109Z',
				updateTime: '2019-12-09T16:36:12.282927Z'
			},
			db
		);
		const ref = new Reference('col/doc', db);

		expect(db.reference(doc)).toEqual(ref);
	});
});
