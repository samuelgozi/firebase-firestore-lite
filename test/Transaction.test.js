import Transaction from '../src/Transaction.ts';
import { Reference } from '../src/Reference.ts';
import Database from '../src/Database.ts';
import batchGetResponse from './mockBatchGetResponse.json';

const db = new Database({ projectId: 'projectId' });
const doc = { one: 'one', two: 2, three: 4.2 };
const rawDoc = {
	name: 'projects/projectId/databases/(default)/documents/col/doc',
	fields: {
		one: {
			stringValue: 'one'
		},
		two: {
			integerValue: '2'
		},
		three: {
			doubleValue: 4.2
		}
	}
};

describe('Transaction', () => {
	test('Reading documents saves the correct preconditions', async () => {
		fetch.resetMocks();
		fetch.mockResponse(JSON.stringify(batchGetResponse));

		const tx = new Transaction(db);
		await tx.get(['col/one', 'col/two']); // the last doesn't  exist.

		expect(tx.preconditions).toEqual({
			'projects/projectId/databases/(default)/documents/col/one': {
				updateTime: '2020-03-17T09:31:07.559644Z'
			},
			'projects/projectId/databases/(default)/documents/col/two': {
				exists: false
			}
		});
	});

	describe('Set', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const col = new Reference('col', db);
			const tx = new Transaction(db);

			tx.set(ref, doc);

			expect(tx.writes).toEqual([{ update: rawDoc }]);
			expect(() => tx.set(col)).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.set('col/doc', doc);

			expect(tx.writes).toEqual([{ update: rawDoc }]);
			expect(() => tx.set('col')).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Uses preconditions', () => {
			const tx = new Transaction(db);
			tx.preconditions[rawDoc.name] = { updateTime: 'test' };
			tx.set('col/doc', doc);

			tx.preconditions[rawDoc.name] = { exists: false };
			tx.set('col/doc', doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					currentDocument: {
						updateTime: 'test'
					}
				},
				{
					update: rawDoc,
					currentDocument: {
						exists: false
					}
				}
			]);
		});
	});

	describe('Update', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const col = new Reference('col', db);
			const tx = new Transaction(db);

			tx.update(ref, doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: true }
				}
			]);

			expect(() => tx.update(col, doc)).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.update('col/doc', doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: true }
				}
			]);

			expect(() => tx.update('col')).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Uses preconditions', () => {
			const tx = new Transaction(db);
			tx.preconditions[rawDoc.name] = { updateTime: 'test' };
			tx.update('col/doc', doc);

			tx.preconditions[rawDoc.name] = { exists: false };
			tx.update('col/doc', doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { updateTime: 'test' }
				},
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: false }
				}
			]);
		});
	});

	describe('Delete', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const col = new Reference('col', db);
			const tx = new Transaction(db);

			tx.delete(ref);

			expect(tx.writes).toEqual([{ delete: rawDoc.name }]);
			expect(() => tx.delete(col)).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.delete('col/doc');

			expect(tx.writes).toEqual([{ delete: rawDoc.name }]);
			expect(() => tx.delete('col')).toThrow(
				'Expected a Document, Reference or a string path pointing to a document.'
			);
		});

		test('Uses preconditions', () => {
			const tx = new Transaction(db);
			tx.preconditions[rawDoc.name] = { updateTime: 'test' };
			tx.delete('col/doc');

			tx.preconditions[rawDoc.name] = { exists: true };
			tx.delete('col/doc');

			expect(tx.writes).toEqual([
				{
					delete: rawDoc.name,
					currentDocument: { updateTime: 'test' }
				},
				{
					delete: rawDoc.name,
					currentDocument: { exists: true }
				}
			]);
		});
	});
});

describe('Commit', () => {
	test('Sends request to right endpoint', () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		new Transaction(db).commit();

		const endpoint = fetch.mock.calls[0][0];
		expect(endpoint).toEqual(db.endpoint + ':commit');
	});

	test('Sends correctly formatted request', () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		const tx = new Transaction(db);

		tx.set('col/doc', doc);
		tx.update('col/doc', doc);
		tx.delete('col/doc');
		tx.commit();

		const body = JSON.parse(fetch.mock.calls[0][1].body);
		expect(body).toEqual({
			writes: [
				{ update: rawDoc },
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: true }
				},
				{ delete: rawDoc.name }
			]
		});
	});
});
