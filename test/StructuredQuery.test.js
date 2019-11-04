import Query from '../src/StructuredQuery.js';
import Reference from '../src/Reference.js';

const mockDB = { rootPath: 'root', endpoint: 'endpoint' };
const colRef = new Reference('col', mockDB);

describe('Constructor', () => {
	describe('from', () => {
		test('Invalid prop throws', () => {
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
		test('Invalid prop throws', () => {
			expect(() => {
				new Query({
					from: colRef,
					where: ['life', '==', 42]
				});
			}).toThrow();
		});

		test('Array of references is copied as is', () => {
			const arrayOfReferences = [colRef];
			const query = new Query({
				from: arrayOfReferences
			});

			expect(query.options.from).toBe(arrayOfReferences);
		});
	});

	describe('orderBy', () => {
		test('Invalid prop throws', () => {
			expect(() => {
				new Query({
					from: colRef,
					orderBy: 42
				});
			}).toThrow();
		});

		test('valid prop', () => {
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
});
