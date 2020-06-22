import {
	trimPath,
	isPath,
	isRef,
	isRawDocument,
	isPositiveInteger,
	encodeValue,
	encode,
	decode,
	objectToQuery,
	compileOptions
} from '../src/utils.ts';
import { Reference } from '../src/Reference.ts';
import GeoPoint from '../src/GeoPoint.ts';
import Transform from '../src/Transform.ts';
import firestoreDocument from './mockDocument.json';
import decodedDocument from './decodedMockedDocument';

const db = {
	rootPath: 'projects/projectId/databases/(default)/documents',
	endpoint: 'endpoint'
};

test('trimPath', () => {
	expect(trimPath('/')).toEqual('');
	expect(trimPath('col')).toEqual('col');
	expect(trimPath('/col')).toEqual('col');
	expect(trimPath('/col/')).toEqual('col');
	expect(trimPath('col/')).toEqual('col');
	expect(trimPath('col  ')).toEqual('col');
	expect(trimPath('  col  ')).toEqual('col');
	expect(trimPath('  col')).toEqual('col');

	expect(trimPath('col/doc')).toEqual('col/doc');
	expect(trimPath('/col/doc')).toEqual('col/doc');
	expect(trimPath('/col/doc/')).toEqual('col/doc');
	expect(trimPath('col/doc/')).toEqual('col/doc');
	expect(trimPath('col/doc  ')).toEqual('col/doc');
	expect(trimPath('  col/doc  ')).toEqual('col/doc');
	expect(trimPath('  col/doc')).toEqual('col/doc');
});

describe('isPath()', () => {
	test('document', () => {
		expect(isPath('doc', '')).toEqual(false);
		expect(isPath('doc', 'col')).toEqual(false);
		expect(isPath('doc', 'col/doc/col')).toEqual(false);
		expect(isPath('doc', 'col/doc/col/doc/col')).toEqual(false);

		expect(isPath('doc', 'col/doc')).toEqual(true);
		expect(isPath('doc', 'col/doc/col/doc')).toEqual(true);
		expect(isPath('doc', 'col/doc/col/doc/col/doc')).toEqual(true);
	});

	test('collections', () => {
		expect(isPath('col', '')).toEqual(false);
		expect(isPath('col', 'col')).toEqual(true);
		expect(isPath('col', 'col/doc/col')).toEqual(true);
		expect(isPath('col', 'col/doc/col/doc/col')).toEqual(true);

		expect(isPath('col', 'col/doc')).toEqual(false);
		expect(isPath('col', 'col/doc/col/doc')).toEqual(false);
		expect(isPath('col', 'col/doc/col/doc/col/doc')).toEqual(false);
	});
});

describe('isRef()', () => {
	test('Documents', () => {
		// random types.
		expect(isRef('doc', 123)).toEqual(false);
		expect(isRef('doc', "I'm a reference!!!")).toEqual(false);
		expect(isRef('doc', { reference: '???' })).toEqual(false);
		expect(isRef('doc', [])).toEqual(false);

		// References to collections
		expect(isRef('doc', new Reference('col', db))).toEqual(false);
		expect(isRef('doc', new Reference('col/doc/col', db))).toEqual(false);

		// References to documents.
		expect(isRef('doc', new Reference('col/doc', db))).toEqual(true);
		expect(isRef('doc', new Reference('col/doc/col/doc', db))).toEqual(true);
	});

	test('IsColReference', () => {
		// random types.
		expect(isRef('col', 123)).toEqual(false);
		expect(isRef('col', "I'm a reference!!!")).toEqual(false);
		expect(isRef('col', { reference: '???' })).toEqual(false);
		expect(isRef('col', [])).toEqual(false);

		// References to collections
		expect(isRef('col', new Reference('col', db))).toEqual(true);
		expect(isRef('col', new Reference('col/doc/col', db))).toEqual(true);
		expect(isRef('col', new Reference('col/doc/col/doc/col', db))).toEqual(
			true
		);

		// References to documents.
		expect(isRef('col', new Reference('col/doc', db))).toEqual(false);
		expect(isRef('col', new Reference('col/doc/col/doc', db))).toEqual(false);
		expect(isRef('col', new Reference('col/doc/col/doc/col/doc', db))).toEqual(
			false
		);
	});
});

test('IsPositiveInteger', () => {
	expect(isPositiveInteger(-1)).toEqual(false);
	expect(isPositiveInteger(-1.1)).toEqual(false);
	expect(isPositiveInteger(1.1)).toEqual(false);
	expect(isPositiveInteger(4.2)).toEqual(false);
	expect(isPositiveInteger(11111.001)).toEqual(false);

	// Valid
	expect(isPositiveInteger(1)).toEqual(true);
	expect(isPositiveInteger(42)).toEqual(true);
	expect(isPositiveInteger(1000000)).toEqual(true);
});

describe('ObjectToQuery', () => {
	test('Normal properties and arrays', () => {
		expect(
			objectToQuery({
				one: 'one',
				two: 'two',
				three: 'three',
				array: ['one', 'two', 'three']
			})
		).toEqual('?one=one&two=two&three=three&array=one&array=two&array=three');
	});

	test('Ignores undefined', () => {
		expect(
			objectToQuery({
				one: 'one',
				two: undefined,
				three: 'three',
				array: ['one', 'two', 'three']
			})
		).toEqual('?one=one&three=three&array=one&array=two&array=three');
	});

	test('Nested objects', () => {
		expect(
			objectToQuery({
				one: 'one',
				two: undefined,
				three: 'three',
				four: {
					one: 'one',
					two: undefined,
					three: 'three'
				}
			})
		).toEqual('?one=one&three=three&four.one=one&four.three=three');
	});

	test('Nested array in object', () => {
		expect(
			objectToQuery({
				one: {
					two: ['three', 'four']
				}
			})
		).toEqual('?one.two=three&one.two=four');
	});
});

describe('Decode', () => {
	test('Throw when database argument is missing', () => {
		expect(() => decode(firestoreDocument)).toThrow();
	});

	test('All types are converted correctly', () => {
		expect(decode(firestoreDocument, db)).toEqual(decodedDocument);
	});

	test('Invalid types throw', () => {
		const badValue = {
			fields: {
				bad: {
					badValue: 'this value does not exist'
				}
			}
		};

		expect(() => {
			decode(badValue, db);
		}).toThrow('Invalid Firestore value_type "badValue"');
	});
});

describe('EncodeValue', () => {
	test('Null', () => {
		expect(encodeValue(null)).toEqual({ nullValue: null });
	});

	test('Booleans', () => {
		expect(encodeValue(true)).toEqual({ booleanValue: true });
		expect(encodeValue(false)).toEqual({ booleanValue: false });
	});

	test('Integers', () => {
		expect(encodeValue(42)).toEqual({ integerValue: '42' });
	});

	test('Doubles', () => {
		expect(encodeValue(4.2)).toEqual({ doubleValue: 4.2 });
	});

	test('Dates', () => {
		const date = new Date();
		expect(encodeValue(date)).toEqual({ timestampValue: date.toISOString() });
	});

	test('String', () => {
		expect(encodeValue('This is a string')).toEqual({
			stringValue: 'This is a string'
		});
	});

	test('References', () => {
		expect(encodeValue(new Reference('col/doc', db))).toEqual({
			referenceValue: 'projects/projectId/databases/(default)/documents/col/doc'
		});
	});

	test('GeoPoints', () => {
		expect(encodeValue(new GeoPoint(30, 30))).toEqual({
			geoPointValue: {
				latitude: 30,
				longitude: 30
			}
		});
	});

	test('Arrays', () => {
		const date = new Date();

		expect(encodeValue([null, false, 42, 4.2, date, 'string'])).toEqual({
			arrayValue: {
				values: [
					{
						nullValue: null
					},
					{
						booleanValue: false
					},
					{
						integerValue: '42'
					},
					{
						doubleValue: 4.2
					},
					{
						timestampValue: date.toISOString()
					},
					{
						stringValue: 'string'
					}
				]
			}
		});
	});
});

describe('encode', () => {
	test('Maps without transforms', () => {
		expect(encode(decodedDocument)).toEqual({
			fields: firestoreDocument.fields
		});
	});

	test('Maps with transforms', () => {
		const expectedDoc = {
			fields: {
				one: {
					stringValue: '1'
				},
				two: {
					integerValue: '2'
				},
				three: {
					doubleValue: 4.2
				},
				four: {
					mapValue: {
						fields: {
							five: {
								stringValue: 'five'
							}
						}
					}
				}
			}
		};

		const expectedTransforms = [
			{
				fieldPath: 'four.nested',
				setToServerValue: 'REQUEST_TIME'
			},
			{
				fieldPath: 't1',
				setToServerValue: 'REQUEST_TIME'
			},
			{
				fieldPath: 't2',
				increment: {
					integerValue: '1'
				}
			},
			{
				fieldPath: 't3',
				maximum: {
					integerValue: '4'
				}
			},
			{
				fieldPath: 't4',
				minimum: {
					doubleValue: 4.2
				}
			},
			{
				fieldPath: 't5',
				appendMissingElements: {
					values: [{ stringValue: 'hello' }]
				}
			},
			{
				fieldPath: 't6',
				removeAllFromArray: {
					values: [{ stringValue: 'good bye' }]
				}
			}
		];

		const given = {
			one: '1',
			two: 2,
			three: 4.2,
			four: {
				five: 'five',
				nested: new Transform('serverTimestamp')
			},
			t1: new Transform('serverTimestamp'),
			t2: new Transform('increment', 1),
			t3: new Transform('max', 4),
			t4: new Transform('min', 4.2),
			t5: new Transform('appendToArray', ['hello']),
			t6: new Transform('removeFromArray', ['good bye'])
		};

		const transforms = [];

		expect(encode(given, transforms)).toEqual(expectedDoc);
		expect(transforms).toMatchObject(expectedTransforms);
	});
});

describe('compileOptions()', () => {
	test('Outputs correct options', () => {
		const withUpdateMask = compileOptions(
			{
				exists: false,
				updateTime: 'utf-date-here',
				updateMask: true
			},
			{ one: '1', two: null, three: undefined }
		);

		const expectedWithUpdateMask = {
			currentDocument: {
				exists: false,
				updateTime: 'utf-date-here'
			},
			updateMask: {
				fieldPaths: ['one', 'two', 'three']
			}
		};

		const withoutPreconditions = compileOptions(
			{ updateMask: ['one', 'two', 'three'] },
			{ one: '1', two: null, three: undefined }
		);

		const expectedWithoutPreconditions = {
			updateMask: {
				fieldPaths: ['one', 'two', 'three']
			}
		};

		expect(withUpdateMask).toEqual(expectedWithUpdateMask);
		expect(withoutPreconditions).toEqual(expectedWithoutPreconditions);
	});
});
