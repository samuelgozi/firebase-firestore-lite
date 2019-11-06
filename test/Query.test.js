import Query from '../src/Query.js';
import Reference from '../src/Reference.js';

const mockDB = { rootPath: 'root', endpoint: 'endpoint' };
const colRef = new Reference('col', mockDB);

describe('Constructor', () => {
	test('from', () => {
		// Valid argument
		expect(new Query({ from: colRef }).toJSON().structuredQuery.from).toEqual({ collectionId: 'col' });

		// Invalid arguments
		expect(() => new Query({ from: [colRef] })).toThrow('Invalid "from" argument');
		expect(() => new Query({ from: 42 })).toThrow('Invalid "from" argument');
		expect(() => new Query({ from: 'this is a reference!' })).toThrow('Invalid "from" argument');
		expect(() => new Query()).toThrow('"from" is required when building a new query');
		expect(() => new Query({})).toThrow('"from" is required when building a new query');
	});

	describe('where', () => {
		test('Invalid props throw', () => {
			expect(() => {
				new Query({
					from: colRef,
					where: ['life', '==', 42]
				});
			}).toThrow('Invalid argument "where[0]": Invalid filter');
		});

		test('Valid prop is copied', () => {
			const where = [['life', '==', 42]];
			const query = new Query({ from: colRef, where });

			expect(query.options.where).toEqual(where);
		});
	});

	describe('orderBy', () => {
		test('Invalid props throw', () => {
			expect(() => {
				new Query({
					from: colRef,
					orderBy: 42
				});
			}).toThrow('Invalid argument "orderBy": "field" property needs to be a string');
		});

		test('Valid prop', () => {
			const arrayOfReferences = colRef;
			const query = new Query({
				from: arrayOfReferences,
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

			const queryFull = new Query({
				from: arrayOfReferences,
				orderBy: {
					field: 'field.path',
					direction: 'ascending'
				}
			});

			expect(query.options.orderBy).toEqual(expected);
			expect(queryFull.options.orderBy).toEqual(expected);
		});
	});

	describe('offset and limit', () => {
		test('Invalid props throw', () => {
			// Offset
			expect(() => new Query({ from: colRef, offset: 'hi there' })).toThrow();
			expect(() => new Query({ from: colRef, offset: -23 })).toThrow();
			expect(() => new Query({ from: colRef, offset: {} })).toThrow();
			expect(() => new Query({ from: colRef, offset: [] })).toThrow();

			// Limit
			expect(() => new Query({ from: colRef, limit: 'hi there' })).toThrow();
			expect(() => new Query({ from: colRef, limit: -23 })).toThrow();
			expect(() => new Query({ from: colRef, limit: {} })).toThrow();
			expect(() => new Query({ from: colRef, limit: [] })).toThrow();
		});

		test('Valid prop', () => {
			const arrayOfReferences = colRef;

			const offset = new Query({
				from: arrayOfReferences,
				offset: 42
			});

			const limit = new Query({
				from: arrayOfReferences,
				limit: 42
			});

			expect(offset.options.offset).toEqual(42);
			expect(limit.options.limit).toEqual(42);
		});
	});
});

describe('Encode', () => {
	test('from', () => {
		const query = new Query({
			from: colRef
		});

		const expected = {
			collectionId: colRef.id,
			allDescendants: undefined
		};

		expect(query.toJSON().structuredQuery.from).toEqual(expected);
	});

	describe('where', () => {
		test('fieldFilter', () => {
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

		test('unaryFilter', () => {
			const queryNaN = new Query({
				from: colRef,
				where: [['field.path', '==', NaN]]
			});

			const queryNull = new Query({
				from: colRef,
				where: [['field.path', '==', null]]
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
				where: [['field.nan', '==', NaN], ['field.null', '==', null], ['field.path', '==', 42]]
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

	test('orderBy', () => {
		const queryShort = new Query({
			from: colRef,
			orderBy: 'field.path'
		});

		const queryFull = new Query({
			from: colRef,
			orderBy: {
				field: 'field.path',
				direction: 'descending'
			}
		});

		const defaultOrder = {
			field: {
				fieldPath: '__name__'
			},
			direction: 'ASCENDING'
		};

		const expectedShort = [
			{
				field: {
					fieldPath: 'field.path'
				},
				direction: 'ASCENDING'
			},
			defaultOrder
		];

		const expectedFull = [
			{
				field: {
					fieldPath: 'field.path'
				},
				direction: 'DESCENDING'
			},
			defaultOrder
		];

		expect(queryShort.toJSON().structuredQuery.orderBy).toEqual(expectedShort);
		expect(queryFull.toJSON().structuredQuery.orderBy).toEqual(expectedFull);
	});

	test('startAt and endAt', () => {
		const docRef = new Reference('col/doc', mockDB);

		const startAtQuery = new Query({
			from: colRef,
			startAt: docRef
		});

		const endAtQuery = new Query({
			from: colRef,
			endAt: docRef
		});

		const expected = {
			values: [
				{
					referenceValue: docRef.name
				}
			],
			before: true
		};

		expect(startAtQuery.toJSON().structuredQuery.startAt).toEqual(expected);
		expect(endAtQuery.toJSON().structuredQuery.endAt).toEqual(expected);
	});
});
