import Database from '../src/index.js';
import Reference from '../src/Reference.js';
import Document from '../src/Document.js';
import batchGetResponse from './mockBatchGetResponse.json';

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
		const message = 'The array can only contain References or paths pointing to documents';
		expect(db.batchGet([123])).rejects.toThrow(message);
		expect(db.batchGet(['123'])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc'), 123])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc/col'), 123])).rejects.toThrow(message);
		expect(db.batchGet([db.reference('col/doc/col')])).rejects.toThrow(message);
	});

	test('Makes correct request', async () => {
		const refs = [db.reference('col/doc'), db.reference('col/doc2'), db.reference('col/doc3')];

		fetch.mockResponse('[]');
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

describe('RunTransactions', () => {
	const db = new Database({ projectId: 'projectId' });

	test('Sends request to correct endpoint', async () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		await db.runTransaction(() => {});

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][0]).toEqual(db.endpoint + ':commit');
	});

	test('Callback is called', () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		const callback = jest.fn(() => {});
		db.runTransaction(callback);

		expect(callback.mock.calls.length).toEqual(1);
	});

	test('Callbacks receive all the necessary methods', () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		const callback = jest.fn(() => {});
		db.runTransaction(callback);

		expect(callback.mock.calls[0][0]).toHaveProperty('get');
		expect(callback.mock.calls[0][0]).toHaveProperty('set');
		expect(callback.mock.calls[0][0]).toHaveProperty('update');
		expect(callback.mock.calls[0][0]).toHaveProperty('remove');
	});

	test('Callback methods work correctly on write-only mode', async () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		await db.runTransaction(({ set, update, remove }) => {
			set('col/doc', { one: 'one' });
			update('col/doc', { one: 'one' });
			remove('col/doc');
		});

		const body = JSON.parse(fetch.mock.calls[0][1].body);

		expect(body).toEqual({
			writes: [
				{
					update: {
						fields: { one: { stringValue: 'one' } },
						name: 'projects/projectId/databases/(default)/documents/col/doc'
					}
				},
				{
					update: {
						fields: { one: { stringValue: 'one' } },
						name: 'projects/projectId/databases/(default)/documents/col/doc'
					},
					updateMask: { fieldPaths: ['one'] },
					currentDocument: { exists: true }
				},
				{ delete: 'projects/projectId/databases/(default)/documents/col/doc' }
			]
		});
	});

	test('Reading documents adds correct preconditions', async () => {
		fetch.resetMocks();
		fetch.mockResponse(JSON.stringify(batchGetResponse));

		await db.runTransaction(async ({ get, set, remove }) => {
			await get(['col/one', 'col/two']); // the last doesn't  exist.
			remove('col/one');
			set('col/two', { one: 'one' });

			// Rock response for the commit response.
			fetch.mockResponse('{}');
		});

		const body = JSON.parse(fetch.mock.calls[1][1].body);

		expect(body).toEqual({
			writes: [
				{
					delete: 'projects/projectId/databases/(default)/documents/col/one',
					currentDocument: {
						updateTime: '2020-03-17T09:31:07.559644Z'
					}
				},
				{
					update: {
						fields: { one: { stringValue: 'one' } },
						name: 'projects/projectId/databases/(default)/documents/col/two'
					},
					currentDocument: { exists: false }
				}
			]
		});
	});
});
