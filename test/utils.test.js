import { maskFromObject, isDocReference } from '../src/utils.js';
import GeoPoint from '../src/GeoPoint.js';
import Reference from '../src/Reference.js';

const db = { rootPath: 'root', endpoint: 'endpoint' };

describe('isDocReference', () => {
	test('Should throw when the value is not a document', () => {
		// random types.
		expect(isDocReference(123)).toEqual(false);
		expect(isDocReference("I'm a reference!!!")).toEqual(false);
		expect(isDocReference({ reference: '???' })).toEqual(false);
		expect(isDocReference([])).toEqual(false);

		// References to collections
		expect(isDocReference(new Reference('col', db))).toEqual(false);
		expect(isDocReference(new Reference('col/doc/col', db))).toEqual(false);

		// References to documents.
		expect(isDocReference(new Reference('col/doc', db))).toEqual(true);
		expect(isDocReference(new Reference('col/doc/col/doc', db))).toEqual(true);
	});
});

describe('maskFromObject', () => {
	test('Empty object', () => {
		const obj = {};
		const expected = '';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Shallow object', () => {
		const obj = {
			one: 'one',
			two: 'two',
			three: 'three',
			four: 'four'
		};
		const expected =
			'updateMask.fieldPaths=one&updateMask.fieldPaths=two&updateMask.fieldPaths=three&updateMask.fieldPaths=four';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Nested object', () => {
		const obj = {
			one: 'one',
			two: {
				one: 'one',
				two: 'two'
			},
			three: {
				one: {
					one: 'one'
				}
			}
		};
		const expected =
			'updateMask.fieldPaths=one&updateMask.fieldPaths=two.one&updateMask.fieldPaths=two.two&updateMask.fieldPaths=three.one.one';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Arrays', () => {
		const obj = {
			one: ['one'],
			two: {
				one: 'one',
				two: []
			}
		};
		const expected = 'updateMask.fieldPaths=one&updateMask.fieldPaths=two.one&updateMask.fieldPaths=two.two';

		expect(maskFromObject(obj)).toEqual(expected);
	});
});
