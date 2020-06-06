import { Document } from '../src/Document.ts';
import Reference from '../src/Reference.ts';
import { List } from '../src/List.ts';
import Query from '../src/Query.ts';
import Database from '../src/mod.ts';
import Transform from '../src/Transform.ts';

const db = new Database({ projectId: 'projectId' });
const rawDoc = JSON.stringify({
	name: 'projects/projectId/databases/(default)/documents/public/types',
	fields: {},
	createTime: '2019-10-10T14:00:00.617973Z',
	updateTime: '2019-10-10T14:44:42.885653Z'
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

	describe('Parent', () => {
		test('Throws when reference point to root', () => {
			expect(() => {
				new Reference('/', db).parent;
			}).toThrow();
		});

		test('Return reference to parent', () => {
			const ref = new Reference('/col/doc/col/doc', db);

			expect(ref.parent.path).toEqual('col/doc/col');
			expect(ref.parent.parent.path).toEqual('col/doc');
			expect(ref.parent.parent.parent.path).toEqual('col');
			expect(ref.parent.parent.parent.parent.path).toEqual('');
		});
	});

	describe('ParentCollection', () => {
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

	test('IsCollection', () => {
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

describe('Child', () => {
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

describe('Get', () => {
	describe('Document', () => {
		test('Requests the correct endpoint', async () => {
			fetch.mockResponse(rawDoc);

			await new Reference('/col/doc', db).get();
			await new Reference('/col/doc/col/doc', db).get();

			const endpoint = fetch.mock.calls[0][0];
			const endpoint2 = fetch.mock.calls[1][0];

			expect(endpoint).toEqual(`${db.endpoint}/col/doc`);
			expect(endpoint2).toEqual(`${db.endpoint}/col/doc/col/doc`);
		});

		test('Returns an instance of Document', async () => {
			const ref = new Reference('/col/doc', db);
			fetch.mockResponse(rawDoc);
			const doc = await ref.get();

			expect(doc).toBeInstanceOf(Document);
		});
	});

	describe('Collection', () => {
		const mockFirestoreList = JSON.stringify({
			documents: [JSON.parse(rawDoc)],
			nextPageToken: 'token'
		});

		test('Requests the correct endpoint', async () => {
			fetch.resetMocks();
			fetch.mockResponse(mockFirestoreList);

			await new Reference('/col', db).get();
			await new Reference('/col/doc/col', db).get();

			const endpoint = fetch.mock.calls[0][0];
			const endpoint2 = fetch.mock.calls[1][0];

			expect(endpoint).toEqual(`${db.endpoint}/col`);
			expect(endpoint2).toEqual(`${db.endpoint}/col/doc/col`);
		});

		test('Returns an instance of List', async () => {
			const col = await new Reference('/col', db).get();
			const col2 = await new Reference('/col/doc/col', db).get();

			expect(col).toBeInstanceOf(List);
			expect(col2).toBeInstanceOf(List);
		});
	});
});

describe('Set', () => {
	describe('Requests the correct endpoint', () => {
		test('Throws when no argument is provided', async () => {
			await expect(new Reference('col/doc', db).set()).rejects.toThrow(
				'"set" received no arguments'
			);
		});

		test('New document(collection endpoint)', async () => {
			fetch.resetMocks();
			fetch.mockResponse(rawDoc);

			await new Reference('col/doc/col', db).set({});
			const mockCall = fetch.mock.calls[0];

			expect(mockCall[0]).toEqual(`${db.endpoint}/col/doc/col`);
			expect(mockCall[1].method).toEqual('POST');
		});

		test('Patching a document', async () => {
			fetch.resetMocks();
			fetch.mockResponse(rawDoc);

			await new Reference('col/doc', db).set({});
			const mockCall = fetch.mock.calls[0];

			expect(mockCall[0]).toEqual(`${db.endpoint}/col/doc`);
			expect(mockCall[1].method).toEqual('PATCH');
		});
	});

	describe('Requests body includes the encoded object', () => {
		test('New document(collection endpoint)', async () => {
			fetch.resetMocks();
			fetch.mockResponse(rawDoc);

			await new Reference('col/doc', db).set({ one: 'one' });
			const body = fetch.mock.calls[0][1].body;

			expect(body).toEqual('{"fields":{"one":{"stringValue":"one"}}}');
		});

		test('Patching a document', async () => {
			fetch.resetMocks();
			fetch.mockResponse(rawDoc);

			await new Reference('col/doc/col', db).set({ one: 'one' });
			const body = fetch.mock.calls[0][1].body;

			expect(body).toEqual('{"fields":{"one":{"stringValue":"one"}}}');
		});
	});

	describe('Transforms', () => {
		test('Throws when called on collection with a Transform', async () => {
			fetch.resetMocks();
			fetch.mockResponses('{}', rawDoc);

			const promise = new Reference('col', db).set({
				one: 'one',
				two: 'two',
				tran: new Transform('serverTimestamp')
			});

			await expect(promise).rejects.toThrow(
				"Transforms can't be used when creating documents with server generated IDs"
			);
		});

		test('Makes the correct requests', async () => {
			fetch.resetMocks();
			fetch.mockResponses('{}', rawDoc);

			await new Reference('col/doc', db).set({
				one: 'one',
				two: 'two',
				tran: new Transform('serverTimestamp')
			});

			expect(fetch.mock.calls.length).toEqual(2);
			expect(fetch.mock.calls[0][0]).toEqual(db.endpoint + ':commit');
		});

		test('Transaction includes correct body', async () => {
			fetch.resetMocks();
			fetch.mockResponses('{}', rawDoc);

			const ref = new Reference('col/doc', db);

			await ref.set({
				one: 'one',
				two: 'two',
				tran: new Transform('serverTimestamp')
			});

			const given = JSON.parse(fetch.mock.calls[0][1].body);
			const expected = {
				writes: [
					{
						update: {
							name: ref.name,
							fields: {
								one: {
									stringValue: 'one'
								},
								two: {
									stringValue: 'two'
								}
							}
						}
					},
					{
						transform: {
							document: ref.name,
							fieldTransforms: [
								{
									fieldPath: 'tran',
									setToServerValue: 'REQUEST_TIME'
								}
							]
						}
					}
				]
			};

			expect(given).toEqual(expected);
		});
	});
});

describe('Update', () => {
	test('Throws when no argument is provided', async () => {
		await expect(new Reference('col/doc', db).update()).rejects.toThrow(
			'"update" received no arguments'
		);
	});

	test('Throws when the reference points to a collection', async () => {
		await expect(new Reference('/col', db).update({})).rejects.toThrow(
			"Can't update a collection"
		);
	});

	test('Requests the correct endpoint', async () => {
		fetch.resetMocks();
		fetch.mockResponse(rawDoc);

		await new Reference('/col/doc', db).update({});
		await new Reference('/col/doc', db).update({ one: 'one', two: 'two' });

		expect(fetch.mock.calls[0][0]).toEqual(
			`${db.endpoint}/col/doc?currentDocument.exists=true`
		);
		expect(fetch.mock.calls[0][1].method).toEqual('PATCH');
		expect(fetch.mock.calls[1][0]).toEqual(
			`${db.endpoint}/col/doc?fieldPaths=one&fieldPaths=two&currentDocument.exists=true`
		);
	});

	test('Requests body includes the encoded object', async () => {
		fetch.resetMocks();
		fetch.mockResponse(rawDoc);

		await new Reference('col/doc', db).update({ one: 'one' });
		const body = fetch.mock.calls[0][1].body;

		expect(body).toEqual(
			JSON.stringify({
				fields: {
					one: { stringValue: 'one' }
				}
			})
		);
	});

	describe('Transforms', () => {
		test('Makes the correct requests', async () => {
			fetch.resetMocks();
			fetch.mockResponses('{}', rawDoc);

			await new Reference('col/doc', db).update({
				one: 'one',
				two: 'two',
				tran: new Transform('serverTimestamp')
			});

			expect(fetch.mock.calls.length).toEqual(2);
			expect(fetch.mock.calls[0][0]).toEqual(db.endpoint + ':commit');
		});

		test('Transaction includes correct body', async () => {
			fetch.resetMocks();
			fetch.mockResponses('{}', rawDoc);

			const ref = new Reference('col/doc', db);

			await ref.update({
				one: 'one',
				two: 'two',
				tran: new Transform('serverTimestamp')
			});

			const given = JSON.parse(fetch.mock.calls[0][1].body);
			const expected = {
				writes: [
					{
						update: {
							name: ref.name,
							fields: {
								one: {
									stringValue: 'one'
								},
								two: {
									stringValue: 'two'
								}
							}
						},
						currentDocument: {
							exists: true
						},
						updateMask: {
							fieldPaths: ['one', 'two']
						}
					},
					{
						transform: {
							document: ref.name,
							fieldTransforms: [
								{
									fieldPath: 'tran',
									setToServerValue: 'REQUEST_TIME'
								}
							]
						}
					}
				]
			};

			expect(given).toEqual(expected);
		});
	});
});

describe('Remove', () => {
	test('Throws when the reference points to a collection', () => {
		expect(() => {
			new Reference('/col', db).delete();
		}).toThrow("Can't delete a collection");
	});

	test('Requests the correct endpoint', async () => {
		fetch.resetMocks();
		fetch.mockResponse('{}');

		await new Reference('/col/doc', db).delete();

		const mockCall = fetch.mock.calls[0];

		expect(mockCall[0]).toEqual(`${db.endpoint}/col/doc`);
		expect(mockCall[1].method).toEqual('DELETE');
	});
});

describe('Query', () => {
	test('Returns a Query instance', () => {
		expect(new Reference('/col', db).query()).toBeInstanceOf(Query);
	});
});
