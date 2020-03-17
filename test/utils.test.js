import { maskFromObject, isDocReference, isRawDocument, encode, decode } from '../src/utils.js';
import Reference from '../src/Reference.js';
import firestoreDocument from './mockDocument.json';
import decodedDocument from './decodedMockedDocument.js';

const db = { rootPath: 'projects/projectId/databases/(default)/documents', endpoint: 'endpoint' };

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

describe('isRawDocument', () => {
	test('Returns false when object is not a firebase doc', () => {
		expect(
			isRawDocument({
				hi: 'there!'
			})
		).toEqual(false);

		expect(
			isRawDocument({
				name: 'testing'
			})
		).toEqual(false);

		expect(isRawDocument(new Date())).toEqual(false);
		expect(isRawDocument([])).toEqual(false);
		expect(isRawDocument('string')).toEqual(false);
		expect(isRawDocument(123)).toEqual(false);
	});

	test('Returns true when the object has the required props', () => {
		expect(
			isRawDocument({
				name: 'test',
				createTime: 'test',
				updateTime: 'test'
			})
		).toEqual(true);

		expect(
			isRawDocument({
				name: 'test',
				fields: '',
				createTime: 'test',
				updateTime: 'test'
			})
		).toEqual(true);
	});
});

describe('Decode', () => {
	test('Throw when database argument is missing', () => {
		expect(() => decode(firestoreDocument)).toThrow();
	});

	test('Types', () => {
		expect(decode(firestoreDocument, db)).toEqual(decodedDocument);
	});
});
