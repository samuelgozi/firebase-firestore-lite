import Query from '../src/StructuredQuery.js';
import Reference from '../src/Reference.js';

const mockDB = { rootPath: 'root', endpoint: 'endpoint' };
const colRef = new Reference('col', mockDB);

describe('Constructor', () => {
	describe('from', () => {
		test('Invalid props throw', () => {
			expect(() => new Query({ from: colRef })).toThrow();
		});

		test('Array of references is copied as is', () => {
			const arrayOfReferences = [colRef];
			const query = new Query({ from: arrayOfReferences });
			expect(query.options.from).toBe(arrayOfReferences);
		});

		test('Throws when missing', () => {
			expect(() => new Query()).toThrow();
			expect(() => new Query({})).toThrow();
		});
	});

	describe('where', () => {
		test('Invalid props throw', () => {
			expect(() => {
				new Query({
					from: [colRef],
					where: ['life', '==', 42]
				});
			}).toThrow();
		});

		test('Valid prop is copied', () => {
			const where = [['life', '==', 42]];
			const query = new Query({ from: [colRef], where });

			expect(query.options.where).toEqual(where);
		});
	});

	describe('orderBy', () => {
		test('Invalid props throw', () => {
			expect(() => {
				new Query({
					from: [colRef],
					orderBy: 42
				});
			}).toThrow();
		});

		test('Valid prop', () => {
			const arrayOfReferences = [colRef];
			const query = new Query({
				from: arrayOfReferences,
				orderBy: 'field.path'
			});

			const fullFormat = {
				field: 'field.path',
				direction: 'ascending'
			};

			const queryFull = new Query({
				from: arrayOfReferences,
				orderBy: fullFormat
			});

			expect(query.options.orderBy).toEqual('field.path');
			expect(queryFull.options.orderBy).toEqual(fullFormat);
		});
	});

	describe('offset and limit', () => {
		test('Invalid props throw', () => {
			// Offset
			expect(() => new Query({ from: [colRef], offset: 'hi there' })).toThrow();
			expect(() => new Query({ from: [colRef], offset: -23 })).toThrow();
			expect(() => new Query({ from: [colRef], offset: {} })).toThrow();
			expect(() => new Query({ from: [colRef], offset: [] })).toThrow();

			// Limit
			expect(() => new Query({ from: [colRef], limit: 'hi there' })).toThrow();
			expect(() => new Query({ from: [colRef], limit: -23 })).toThrow();
			expect(() => new Query({ from: [colRef], limit: {} })).toThrow();
			expect(() => new Query({ from: [colRef], limit: [] })).toThrow();
		});

		test('Valid prop', () => {
			const arrayOfReferences = [colRef];

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
			from: [colRef]
		});

		const expected = {
			structuredQuery: {
				from: [
					{
						collectionId: colRef.id,
						allDescendants: false
					}
				]
			}
		};

		expect(query.encode()).toEqual(expected);
	});

	describe('where', () => {
		test('fieldFilter', () => {
			const query = new Query({
				from: [colRef],
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

			expect(query.encode().structuredQuery.where).toEqual(expected);
		});

		test('unaryFilter', () => {
			const queryNaN = new Query({
				from: [colRef],
				where: [['field.path', '==', NaN]]
			});

			const queryNull = new Query({
				from: [colRef],
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

			expect(queryNaN.encode().structuredQuery.where).toEqual(expectedNaN);
			expect(queryNull.encode().structuredQuery.where).toEqual(expectedNull);
		});

		test('compositeFilter', () => {
			const query = new Query({
				from: [colRef],
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

			expect(query.encode().structuredQuery.where).toEqual(expected);
		});
	});

	test('orderBy', () => {
		const queryShort = new Query({
			from: [colRef],
			orderBy: 'field.path'
		});

		const queryFull = new Query({
			from: [colRef],
			orderBy: {
				field: 'field.path',
				direction: 'descending'
			}
		});

		const expectedShort = {
			field: {
				fieldPath: 'field.path'
			},
			direction: 'ASCENDING'
		};

		const expectedFull = {
			field: {
				fieldPath: 'field.path'
			},
			direction: 'DESCENDING'
		};

		expect(queryShort.encode().structuredQuery.orderBy).toEqual(expectedShort);
		expect(queryFull.encode().structuredQuery.orderBy).toEqual(expectedFull);
	});

	test('startAt and endAt', () => {
		const startAtQuery = new Query({
			from: [colRef],
			startAt: colRef
		});

		const expectedStartAt = {
			values: [
				{
					__name__: colRef.id
				}
			],
			before: false
		};

		expect(startAtQuery.encode().structuredQuery.startAt).toEqual(expectedStartAt);
	});
});
