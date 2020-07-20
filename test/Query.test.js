import { Database } from '../src/Database';
import { Query } from '../src/Query';
import { Reference } from '../src/Reference';
import { Document } from '../src/Document';

const db = new Database({ projectId: 'projectId' });
const colRef = db.ref('col');

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

describe('Query', () => {
	describe('select', () => {
		test('Valid arguments', () => {
			const query = new Query({
				select: ['path'],
				from: colRef
			});

			const expected = {
				fields: [
					{
						fieldPath: 'path'
					}
				]
			};

			expect(query.toJSON().structuredQuery.select).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					select: 'path',
					from: colRef
				});
			}).toThrow(
				'Invalid argument "select": Expected argument to be an array of field paths'
			);

			expect(() => {
				new Query({
					select: [42],
					from: colRef
				});
			}).toThrow(
				'Invalid argument "select": Field path at index [0] is not a string'
			);
		});

		test('Is undefined when select arguments are empty', () => {
			const query = new Query({
				from: colRef
			});

			expect(query.toJSON().structuredQuery.select).toEqual(undefined);
		});
	});

	describe('from', () => {
		test('Valid arguments', () => {
			const query = new Query({
				from: colRef
			});

			const query2 = new Query({
				from: db.ref('col2')
			});

			// Overwrite the from value.
			query2.from(colRef);

			const expected = {
				collectionId: 'col',
				allDescendants: undefined
			};

			expect(query.toJSON().structuredQuery.from).toEqual(expected);
			expect(query2.toJSON().structuredQuery.from).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					from: db.ref('col/doc')
				});
			}).toThrow(
				'Invalid argument "from": Expected a reference to a collection'
			);

			expect(() => {
				new Query({
					from: 42
				});
			}).toThrow(
				'Invalid argument "from": Expected a reference to a collection'
			);
		});
	});

	describe('where', () => {
		test('Compound(filters array) syntax', () => {
			const query = new Query({
				from: colRef,
				where: [['field.path', '>=', 11]]
			});

			const expected = {
				fieldFilter: {
					field: {
						fieldPath: 'field.path'
					},
					op: 'GREATER_THAN_OR_EQUAL',
					value: {
						integerValue: '11'
					}
				}
			};

			expect(query.toJSON().structuredQuery.where).toEqual(expected);
		});

		test('Short(single filter) syntax', () => {
			const query = new Query({
				from: colRef,
				where: ['field.path', '>=', 11]
			});

			const expected = {
				fieldFilter: {
					field: {
						fieldPath: 'field.path'
					},
					op: 'GREATER_THAN_OR_EQUAL',
					value: {
						integerValue: '11'
					}
				}
			};

			expect(query.toJSON().structuredQuery.where).toEqual(expected);
		});

		test('Invalid argument', () => {
			expect(() => {
				new Query({
					from: colRef,
					where: [42, '>=', 11]
				});
			}).toThrow('Invalid argument "where": Invalid field path');

			expect(() => {
				new Query({
					from: colRef,
					where: ['path', '===', 11]
				});
			}).toThrow('Invalid argument "where": Invalid operator');

			expect(() => {
				new Query({
					from: colRef,
					where: ['path', '>=', null]
				});
			}).toThrow(
				'Invalid argument "where": Null and NaN can only be used with the == operator'
			);
		});

		describe('Filter types', () => {
			test('fieldFilter', () => {
				const query = new Query({
					from: colRef,
					where: ['field.path', '>=', 11]
				});

				const expected = {
					fieldFilter: {
						field: {
							fieldPath: 'field.path'
						},
						op: 'GREATER_THAN_OR_EQUAL',
						value: {
							integerValue: '11'
						}
					}
				};

				expect(query.toJSON().structuredQuery.where).toEqual(expected);
			});

			test('unaryFilter', () => {
				const queryNaN = new Query({
					from: colRef,
					where: ['field.path', '==', NaN]
				});

				const queryNull = new Query({
					from: colRef,
					where: ['field.path', '==', null]
				});

				const expectedNaN = {
					unaryFilter: {
						field: {
							fieldPath: 'field.path'
						},
						op: 'IS_NAN'
					}
				};

				const expectedNull = {
					unaryFilter: {
						field: {
							fieldPath: 'field.path'
						},
						op: 'IS_NULL'
					}
				};

				expect(queryNaN.toJSON().structuredQuery.where).toEqual(expectedNaN);
				expect(queryNull.toJSON().structuredQuery.where).toEqual(expectedNull);
			});

			test('compositeFilter', () => {
				const query = new Query({
					from: colRef,
					where: [
						['field.nan', '==', NaN],
						['field.null', '==', null],
						['field.path', '==', 42]
					]
				});

				const expected = {
					compositeFilter: {
						op: 'AND',
						filters: [
							{
								unaryFilter: {
									field: {
										fieldPath: 'field.nan'
									},
									op: 'IS_NAN'
								}
							},
							{
								unaryFilter: {
									field: {
										fieldPath: 'field.null'
									},
									op: 'IS_NULL'
								}
							},
							{
								fieldFilter: {
									field: {
										fieldPath: 'field.path'
									},
									op: 'EQUAL',
									value: {
										integerValue: '42'
									}
								}
							}
						]
					}
				};

				expect(query.toJSON().structuredQuery.where).toEqual(expected);
			});
		});
	});

	describe('orderBy', () => {
		test('Full syntax', () => {
			const query = new Query({
				from: colRef,
				orderBy: {
					field: 'field.path',
					direction: 'desc'
				}
			});

			const expected = [
				{
					field: {
						fieldPath: 'field.path'
					},
					direction: 'DESCENDING'
				}
			];

			expect(query.toJSON().structuredQuery.orderBy).toEqual(expected);
		});

		test('Short syntax', () => {
			const query = new Query({
				from: colRef,
				orderBy: 'field.path'
			});

			const expected = [
				{
					field: {
						fieldPath: 'field.path'
					},
					direction: 'ASCENDING'
				}
			];

			expect(query.toJSON().structuredQuery.orderBy).toEqual(expected);
		});

		test('Compound(array) full syntax', () => {
			const query = new Query({
				from: colRef,
				orderBy: [
					{
						field: 'field.path',
						direction: 'desc'
					},
					{
						field: 'second.path',
						direction: 'desc'
					}
				]
			});

			const expected = [
				{
					field: {
						fieldPath: 'field.path'
					},
					direction: 'DESCENDING'
				},
				{
					field: {
						fieldPath: 'second.path'
					},
					direction: 'DESCENDING'
				}
			];

			expect(query.toJSON().structuredQuery.orderBy).toEqual(expected);
		});

		test('Compound(array) short syntax', () => {
			const query = new Query({
				from: colRef,
				orderBy: ['field.path', 'second.path']
			});

			const expected = [
				{
					field: {
						fieldPath: 'field.path'
					},
					direction: 'ASCENDING'
				},
				{
					field: {
						fieldPath: 'second.path'
					},
					direction: 'ASCENDING'
				}
			];

			expect(query.toJSON().structuredQuery.orderBy).toEqual(expected);
		});

		test('Invalid direction', () => {
			expect(() => {
				new Query({
					from: colRef,
					orderBy: {
						field: 'field.path',
						direction: 'whats up?'
					}
				});
			}).toThrow(
				'Invalid argument "orderBy": "direction" property can only be "asc" or "desc"'
			);
		});
	});

	describe('startAt', () => {
		test('Valid arguments', () => {
			const query = new Query({
				from: colRef,
				startAt: ['abc', 123]
			});

			const expected = {
				values: [
					{ stringValue: 'abc' },
					{ integerValue: '123' }
				],
				before: true
			};

			expect(query.toJSON().structuredQuery.startAt).toEqual(expected);
		});

		test('Document as cursor', () => {
			const query = new Query({
				from: colRef,
				orderBy: ['one', 'two'],
				startAt: new Document(rawDoc, db)
			});

			const expected = {
				values: [
					{ stringValue: 'Hi!' },
					{ booleanValue: false }
				],
				before: true
			};

			expect(query.toJSON().structuredQuery.startAt).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					from: colRef,
					startAt: []
				});
			}).toThrow(
				'Invalid argument "startAt": Expected at least one value'
			);
		});

		test('Document without orderBy', () => {
			expect(() => {
				new Query({
					from: colRef,
					startAt: new Document(rawDoc, db)
				});
			}).toThrow(
				'Invalid argument "startAt": Cannot use document for cursor without orderBy set'
			);
		});
	});

	describe('startAfter', () => {
		test('Valid arguments', () => {
			const query = new Query({
				from: colRef,
				startAfter: ['abc', 123]
			});

			const expected = {
				values: [
					{ stringValue: 'abc' },
					{ integerValue: '123' }
				],
				before: false
			};

			expect(query.toJSON().structuredQuery.startAt).toEqual(expected);
		});

		test('Document as cursor', () => {
			const query = new Query({
				from: colRef,
				orderBy: ['one', 'two'],
				startAfter: new Document(rawDoc, db)
			});

			const expected = {
				values: [
					{ stringValue: 'Hi!' },
					{ booleanValue: false }
				],
				before: false
			};

			expect(query.toJSON().structuredQuery.startAt).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					from: colRef,
					startAfter: []
				});
			}).toThrow(
				'Invalid argument "startAfter": Expected at least one value'
			);
		});

		test('Document without orderBy', () => {
			expect(() => {
				new Query({
					from: colRef,
					startAfter: new Document(rawDoc, db)
				});
			}).toThrow(
				'Invalid argument "startAfter": Cannot use document for cursor without orderBy set'
			);
		});
	});

	describe('endAt', () => {
		test('Valid arguments', () => {
			const query = new Query({
				from: colRef,
				endAt: ['abc', 123]
			});

			const expected = {
				values: [
					{ stringValue: 'abc' },
					{ integerValue: '123' }
				],
				before: true
			};

			expect(query.toJSON().structuredQuery.endAt).toEqual(expected);
		});

		test('Document as cursor', () => {
			const query = new Query({
				from: colRef,
				orderBy: ['one', 'two'],
				endAt: new Document(rawDoc, db)
			});

			const expected = {
				values: [
					{ stringValue: 'Hi!' },
					{ booleanValue: false }
				],
				before: true
			};

			expect(query.toJSON().structuredQuery.endAt).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					from: colRef,
					endAt: []
				});
			}).toThrow(
				'Invalid argument "endAt": Expected at least one value'
			);
		});

		test('Document without orderBy', () => {
			expect(() => {
				new Query({
					from: colRef,
					endAt: new Document(rawDoc, db)
				});
			}).toThrow(
				'Invalid argument "endAt": Cannot use document for cursor without orderBy set'
			);
		});
	});

	describe('endAfter', () => {
		test('Valid arguments', () => {
			const query = new Query({
				from: colRef,
				endAfter: ['abc', 123]
			});

			const expected = {
				values: [
					{ stringValue: 'abc' },
					{ integerValue: '123' }
				],
				before: false
			};

			expect(query.toJSON().structuredQuery.endAt).toEqual(expected);
		});

		test('Document as cursor', () => {
			const query = new Query({
				from: colRef,
				orderBy: ['one', 'two'],
				endAfter: new Document(rawDoc, db)
			});

			const expected = {
				values: [
					{ stringValue: 'Hi!' },
					{ booleanValue: false }
				],
				before: false
			};

			expect(query.toJSON().structuredQuery.endAt).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Query({
					from: colRef,
					endAfter: []
				});
			}).toThrow(
				'Invalid argument "endAfter": Expected at least one value'
			);
		});

		test('Document without orderBy', () => {
			expect(() => {
				new Query({
					from: colRef,
					endAfter: new Document(rawDoc, db)
				});
			}).toThrow(
				'Invalid argument "endAfter": Cannot use document for cursor without orderBy set'
			);
		});
	});

	describe('offset', () => {
		test('Valid argument', () => {
			const query = new Query({
				from: colRef,
				offset: 51
			});

			expect(query.toJSON().structuredQuery.offset).toEqual(51);
		});

		test('Invalid argument', () => {
			expect(() => {
				new Query({
					from: colRef,
					offset: '51'
				});
			}).toThrow('Expected an integer that is greater than 0');
		});
	});

	describe('limit', () => {
		test('Valid argument', () => {
			const query = new Query({
				from: colRef,
				limit: 51
			});

			expect(query.toJSON().structuredQuery.limit).toEqual(51);
		});

		test('Invalid argument', () => {
			expect(() => {
				new Query({
					from: colRef,
					limit: '51'
				});
			}).toThrow('Expected an integer that is greater than 0');
		});
	});

	describe('run', () => {
		test('Sends request to the right endpoint', async () => {
			fetch.resetMocks();
			fetch.mockResponse('[]');

			await new Query({
				from: colRef
			}).run();

			expect(fetch.mock.calls.length).toEqual(1);
			expect(fetch.mock.calls[0][0]).toEqual(
				colRef.parent.endpoint + ':runQuery'
			);
		});

		test('Returns array of documents', async () => {
			fetch.resetMocks();
			fetch.mockResponse(`[
				{
					"document": {
						"name": "projects/projectId/databases/(default)/documents/col/AKoa",
						"fields": {},
						"createTime": "2019-10-17T16:33:41.217487Z",
						"updateTime": "2019-12-04T10:18:57.882392Z"
					},
					"readTime": "2020-03-29T00:17:46.518749Z"
				},
				{
					"document": {
						"name": "projects/projectId/databases/(default)/documents/col/q9YU",
						"fields": {},
						"createTime": "2019-11-13T21:38:41.443294Z",
						"updateTime": "2019-11-13T21:38:41.443294Z"
					},
					"readTime": "2020-03-29T00:17:46.518749Z"
				}
			]`);

			const response = await new Query({
				from: colRef
			}).run();

			response.map(doc => {
				expect(doc).toBeInstanceOf(Document);
			});
		});

		test('Returns an empty array for empty query results', async () => {
			fetch.resetMocks();
			fetch.mockResponse('[{"readTime": "2020-06-01T15:45:21.155041Z"}]');

			const response = await new Query({
				from: colRef
			}).run();

			expect(response).toEqual([]);
		});

		test('Returns array of documents when using an offset', async () => {
			const mockResponse = [
				{
					readTime: '2020-07-05T07:23:57.037160Z',
					skippedResults: 1
				},
				{
					document: {
						name: 'projects/projectId/databases/(default)/documents/col/AKoa',
						fields: {},
						createTime: '2019-10-17T16:33:41.217487Z',
						updateTime: '2019-12-04T10:18:57.882392Z'
					},
					readTime: '2020-03-29T00:17:46.518749Z'
				}
			];

			fetch.resetMocks();
			fetch.mockResponse(JSON.stringify(mockResponse));

			/*
			 * When results return starting from an offset,
			 * the first result object will not be a document,
			 * but an object with a "skippedResults" prop.
			 */
			const response = await new Query({
				from: colRef,
				offset: 1
			}).run();

			expect(response).toEqual([new Document(mockResponse[1].document, db)]);
		});
	});
});
