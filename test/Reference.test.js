import { Document } from '../src/Document.ts';
import { Reference } from '../src/Reference.ts';
import { List } from '../src/List.ts';
import Query from '../src/Query.ts';
import Database from '../src/Database.ts';
import Transform from '../src/Transform.ts';

const db = new Database({ projectId: 'projectId' });
const rawDoc = JSON.stringify({
	name: 'projects/projectId/databases/(default)/documents/public/types',
	fields: {},
	createTime: '2019-10-10T14:00:00.617973Z',
	updateTime: '2019-10-10T14:44:42.885653Z'
});

beforeEach(() => {
	fetch.resetMocks();
});

describe('Constructor', () => {
	test('Throws if database is missing', () => {
		expect(() => {
			new Reference('test');
		}).toThrow('Argument "db" is required but missing');
	});

	test('Path is normalized correctly', () => {
		expect(new Reference('test', db).id).toEqual('test');
		expect(new Reference('/test', db).id).toEqual('test');
		expect(new Reference('/test', db).id).toEqual('test');
		expect(new Reference('/test/', db).id).toEqual('test');

		expect(new Reference('col/doc/test', db).path).toEqual('col/doc/test');
		expect(new Reference('/col/doc/test', db).path).toEqual('col/doc/test');
		expect(new Reference('col/doc/test/', db).path).toEqual('col/doc/test');
		expect(new Reference('/col/doc/test/', db).path).toEqual('col/doc/test');
	});

	test('Path spaces are trimmed', () => {
		expect(new Reference('  test', db).id).toEqual('test');
		expect(new Reference('test  ', db).id).toEqual('test');
		expect(new Reference('  test  ', db).id).toEqual('test');
	});

	test('Id is correct', () => {
		expect(new Reference('test', db).id).toEqual('test');
		expect(new Reference('col/doc/test', db).id).toEqual('test');
		expect(new Reference('/col/doc/col/test', db).id).toEqual('test');
	});

	test('Name is correct', () => {
		expect(new Reference('test', db).name).toEqual(
			'projects/projectId/databases/(default)/documents/test'
		);
	});

	test('Endpoint is correct', () => {
		expect(new Reference('test', db).endpoint).toEqual(db.endpoint + '/test');
	});
});

describe('Static properties', () => {
	test('Root', () => {
		expect(new Reference('', db).isRoot).toEqual(true);
		expect(new Reference('/', db).isRoot).toEqual(true);
		expect(new Reference('  /  ', db).isRoot).toEqual(true);
		expect(new Reference('/col', db).isRoot).toEqual(false);
		expect(new Reference('col', db).isRoot).toEqual(false);
		expect(new Reference('/col/doc', db).isRoot).toEqual(false);
		expect(new Reference('col/doc', db).isRoot).toEqual(false);
	});

	describe('parent', () => {
		test('Throws when reference point to root', () => {
			expect(() => {
				new Reference('/', db).parent;
			}).toThrow("Can't get the parent of root");
		});

		test('Return reference to parent', () => {
			const ref = new Reference('/col/doc/col/doc', db);

			expect(ref.parent.path).toEqual('col/doc/col');
			expect(ref.parent.parent.path).toEqual('col/doc');
			expect(ref.parent.parent.parent.path).toEqual('col');
			expect(ref.parent.parent.parent.parent.path).toEqual('');
		});
	});

	describe('parentCollection', () => {
		test('Throws when reference point to root', () => {
			expect(() => {
				new Reference('/', db).parentCollection;
			}).toThrow("Can't get parent of a root collection");
		});

		test('Returns a reference to parent collection from a collection', () => {
			const ref = new Reference('/col/doc/col/doc/col/doc/col', db);

			expect(ref.parentCollection.path).toEqual('col/doc/col/doc/col');
			expect(ref.parentCollection.parentCollection.path).toEqual('col/doc/col');
			expect(
				ref.parentCollection.parentCollection.parentCollection.path
			).toEqual('col');
		});

		test('Returns a reference to the parent collection from a document', () => {
			const ref = new Reference('/col/doc/col/doc/col/doc', db);
			const ref2 = new Reference('/col/doc/col/doc', db);
			const ref3 = new Reference('/col/doc', db);

			expect(ref.parentCollection.path).toEqual('col/doc/col/doc/col');
			expect(ref2.parentCollection.path).toEqual('col/doc/col');
			expect(ref3.parentCollection.path).toEqual('col');
		});
	});

	test('isCollection', () => {
		const ref = new Reference('/col/doc/col/doc/col/doc', db);
		const ref2 = new Reference('/col/doc/col', db);
		const ref3 = new Reference('/col/doc', db);
		const ref4 = new Reference('/col', db);
		const ref5 = new Reference('/', db);

		expect(ref.isCollection).toEqual(false);
		expect(ref2.isCollection).toEqual(true);
		expect(ref3.isCollection).toEqual(false);
		expect(ref4.isCollection).toEqual(true);
		expect(ref5.isCollection).toEqual(false);
	});
});

describe('child()', () => {
	test('Returns a reference', () => {
		const ref = new Reference('/', db);
		expect(ref.child('/')).toBeInstanceOf(Reference);
		expect(ref.child('/col')).toBeInstanceOf(Reference);
		expect(ref.child('/col/doc')).toBeInstanceOf(Reference);
	});

	test('Returned reference points to the right path', () => {
		const ref = new Reference('/', db);

		expect(ref.child('/').path).toEqual('');
		expect(ref.child('/col').path).toEqual('col');
		expect(ref.child('/col/').path).toEqual('col');
		expect(ref.child('col/').path).toEqual('col');

		expect(ref.child('/col/doc').path).toEqual('col/doc');
		expect(ref.child('col/doc/').path).toEqual('col/doc');
		expect(ref.child('/col/doc/').path).toEqual('col/doc');
	});
});

describe('add()', () => {
	test('throws when called on a document', async () => {
		await expect(new Reference('col/doc', db).add()).rejects.toThrow(
			'Tried to access a collection method'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col', db).add({});

		/* Todo: add test with options */

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][1].method).toEqual('POST');
		expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}/col`);
	});

	test('body', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col', db).add({ test: 'test' });

		expect(fetch.mock.calls[0][1].body).toEqual(
			JSON.stringify({
				fields: {
					test: {
						stringValue: 'test'
					}
				}
			})
		);
	});

	test('returns an instance of Document', async () => {
		fetch.mockResponse(rawDoc);
		const doc = await new Reference('col', db).add({});
		expect(doc).toBeInstanceOf(Document);
	});
});

describe('list()', () => {
	const mockFirestoreList = JSON.stringify({
		documents: [JSON.parse(rawDoc)],
		nextPageToken: 'token'
	});

	test('throws when called on a document', async () => {
		await expect(new Reference('col/doc', db).list()).rejects.toThrow(
			'Tried to access a collection method'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(mockFirestoreList);
		await new Reference('/col', db).list();
		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}/col`);
	});

	test('body', async () => {
		fetch.mockResponse(mockFirestoreList);
		await new Reference('/col', db).list();
		expect(fetch.mock.calls[0][1]).toEqual(undefined);
	});

	test('returns an instance of List', async () => {
		fetch.mockResponse(mockFirestoreList);
		const col = await new Reference('/col', db).list();
		expect(col).toBeInstanceOf(List);
	});
});

describe('get()', () => {
	test('throws when called on a collection', async () => {
		await expect(new Reference('col', db).get()).rejects.toThrow(
			'Tried to access a document method'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).get();

		/* Todo: add test with options */

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][1]).toEqual(undefined);
		expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}/col/doc`);
	});

	test('body', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).get();

		expect(fetch.mock.calls[0][1]).toEqual(undefined);
	});

	test('Returns an instance of Document', async () => {
		fetch.mockResponse(rawDoc);
		const doc = await new Reference('col/doc', db).get();

		expect(doc).toBeInstanceOf(Document);
	});
});

describe('set()', () => {
	test('throws when called on a collection', async () => {
		await expect(new Reference('col', db).set()).rejects.toThrow(
			'Tried to access a document method'
		);
	});

	test('throws when there are missing arguments', async () => {
		await expect(new Reference('col/doc', db).set()).rejects.toThrow(
			'The document argument is missing'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).set({});

		/* Todo: add test with options */

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][1].method).toEqual('PATCH');
		expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}/col/doc`);
	});

	test('body', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).set({ test: 'test' });

		expect(fetch.mock.calls[0][1].body).toEqual(
			JSON.stringify({
				fields: {
					test: {
						stringValue: 'test'
					}
				}
			})
		);
	});

	test('Returns an instance of Document', async () => {
		fetch.mockResponse(rawDoc);
		const doc = await new Reference('col/doc', db).set({});

		expect(doc).toBeInstanceOf(Document);
	});
});

describe('update()', () => {
	test('throws when called on a collection', async () => {
		await expect(new Reference('col', db).update()).rejects.toThrow(
			'Tried to access a document method'
		);
	});

	test('throws when there are missing arguments', async () => {
		await expect(new Reference('col/doc', db).update()).rejects.toThrow(
			'The document argument is missing'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).update({});

		/* Todo: add test with options */

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][1].method).toEqual('PATCH');
		expect(fetch.mock.calls[0][0]).toEqual(
			`${db.endpoint}/col/doc?currentDocument.exists=true`
		);
	});

	test('body', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).update({ test: 'test' });

		expect(fetch.mock.calls[0][1].body).toEqual(
			JSON.stringify({
				fields: {
					test: {
						stringValue: 'test'
					}
				}
			})
		);
	});

	test('Returns an instance of Document', async () => {
		fetch.mockResponse(rawDoc);
		const doc = await new Reference('col/doc', db).update({});

		expect(doc).toBeInstanceOf(Document);
	});
});

describe('delete()', () => {
	test('throws when called on a collection', async () => {
		await expect(new Reference('col', db).delete()).rejects.toThrow(
			'Tried to access a document method'
		);
	});

	test('endpoint', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).delete();

		expect(fetch.mock.calls.length).toEqual(1);
		expect(fetch.mock.calls[0][1].method).toEqual('DELETE');
		expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}/col/doc`);
	});

	test('body', async () => {
		fetch.mockResponse(rawDoc);
		await new Reference('col/doc', db).delete({ test: 'test' });

		expect(fetch.mock.calls[0][1]).toEqual({ method: 'DELETE' });
	});

	test('Returns nothing', async () => {
		fetch.mockResponse('{}');
		const ref = new Reference('col/doc', db);

		expect(await ref.delete()).toEqual(undefined);
	});
});

describe('transact()', () => {
	describe('add()', () => {
		test('endpoint', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col', db).add({
				test: new Transform('serverTimestamp')
			});

			/* Todo: add test with options */

			// Two requests
			expect(fetch.mock.calls.length).toEqual(2);
			// One for committing a transaction
			expect(fetch.mock.calls[0][1].method).toEqual('POST');
			expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}:commit`);
			// And one for reading the result
			expect(fetch.mock.calls[1][1]).toEqual(undefined);
			expect(fetch.mock.calls[1][0]).toEqual(
				`${db.endpoint}/col/abcdefghijklmnopqrstuv`
			);
		});

		test('body', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col', db).add({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(fetch.mock.calls[0][1].body).toEqual(
				JSON.stringify({
					writes: [
						{
							update: {
								fields: {
									str: {
										stringValue: 'string'
									}
								},
								name:
									'projects/projectId/databases/(default)/documents/col/abcdefghijklmnopqrstuv'
							},
							currentDocument: { exists: false }
						},
						{
							transform: {
								document:
									'projects/projectId/databases/(default)/documents/col/abcdefghijklmnopqrstuv',
								fieldTransforms: [
									{ setToServerValue: 'REQUEST_TIME', fieldPath: 'tra' }
								]
							}
						}
					]
				})
			);
		});

		test('Returns an instance of Document', async () => {
			fetch.mockResponse(rawDoc);
			const doc = await new Reference('col', db).add({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(doc).toBeInstanceOf(Document);
		});
	});

	describe('set()', () => {
		test('endpoint', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col/doc', db).set({
				test: new Transform('serverTimestamp')
			});

			/* Todo: add test with options */

			// Two requests
			expect(fetch.mock.calls.length).toEqual(2);
			// One for committing a transaction
			expect(fetch.mock.calls[0][1].method).toEqual('POST');
			expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}:commit`);
			// And one for reading the result
			expect(fetch.mock.calls[1][1]).toEqual(undefined);
			expect(fetch.mock.calls[1][0]).toEqual(`${db.endpoint}/col/doc`);
		});

		test('body', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col/doc', db).set({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(fetch.mock.calls[0][1].body).toEqual(
				JSON.stringify({
					writes: [
						{
							update: {
								fields: {
									str: {
										stringValue: 'string'
									}
								},
								name: 'projects/projectId/databases/(default)/documents/col/doc'
							}
						},
						{
							transform: {
								document:
									'projects/projectId/databases/(default)/documents/col/doc',
								fieldTransforms: [
									{ setToServerValue: 'REQUEST_TIME', fieldPath: 'tra' }
								]
							}
						}
					]
				})
			);
		});

		test('Returns an instance of Document', async () => {
			fetch.mockResponse(rawDoc);
			const doc = await new Reference('col/doc', db).set({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(doc).toBeInstanceOf(Document);
		});
	});

	describe('update()', () => {
		test('endpoint', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col/doc', db).update({
				test: new Transform('serverTimestamp')
			});

			/* Todo: add test with options */

			// Two requests
			expect(fetch.mock.calls.length).toEqual(2);
			// One for committing a transaction
			expect(fetch.mock.calls[0][1].method).toEqual('POST');
			expect(fetch.mock.calls[0][0]).toEqual(`${db.endpoint}:commit`);
			// And one for reading the result
			expect(fetch.mock.calls[1][1]).toEqual(undefined);
			expect(fetch.mock.calls[1][0]).toEqual(`${db.endpoint}/col/doc`);
		});

		test('body', async () => {
			fetch.mockResponse(rawDoc);
			await new Reference('col/doc', db).update({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(fetch.mock.calls[0][1].body).toEqual(
				JSON.stringify({
					writes: [
						{
							update: {
								fields: {
									str: {
										stringValue: 'string'
									}
								},
								name: 'projects/projectId/databases/(default)/documents/col/doc'
							},
							updateMask: { fieldPaths: ['str'] },
							currentDocument: { exists: true }
						},
						{
							transform: {
								document:
									'projects/projectId/databases/(default)/documents/col/doc',
								fieldTransforms: [
									{ setToServerValue: 'REQUEST_TIME', fieldPath: 'tra' }
								]
							}
						}
					]
				})
			);
		});

		test('Returns an instance of Document', async () => {
			fetch.mockResponse(rawDoc);
			const doc = await new Reference('col/doc', db).update({
				tra: new Transform('serverTimestamp'),
				str: 'string'
			});

			expect(doc).toBeInstanceOf(Document);
		});
	});
});

describe('Query', () => {
	test('Returns a Query instance', () => {
		expect(new Reference('/col', db).query()).toBeInstanceOf(Query);
	});
});
