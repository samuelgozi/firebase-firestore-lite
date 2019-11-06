import {
	objectToQuery,
	isDocumentPath,
	maskFromObject,
	isRawDocument,
	encode,
	encodeValue,
	decode,
	decodeValue,
	decodeMap
} from '../src/utils.js';
import { GeoPoint } from '../src/customTypes.js';
import Reference from '../src/Reference.js';

describe('objectToQuery', () => {
	test('Returns an empty string when an empty object is passed', () => {
		expect(objectToQuery({})).toEqual('');
	});

	test('Returns an empty string when no nothing is passed', () => {
		expect(objectToQuery()).toEqual('');
	});

	test('Returns correct string for one argument', () => {
		expect(objectToQuery({ name: 'Samuel' })).toEqual('?name=Samuel');
	});

	test('Returns correct string for multiple argument', () => {
		expect(objectToQuery({ name: 'Samuel', address: 'somewhere' })).toEqual('?name=Samuel&address=somewhere');
		expect(objectToQuery({ name: 'Samuel', address: 'somewhere', color: 'green' })).toEqual(
			'?name=Samuel&address=somewhere&color=green'
		);
	});

	test('Skips over undefined values', () => {
		expect(objectToQuery({ name: 'Samuel', address: undefined })).toEqual('?name=Samuel');
	});

	test('Encodes characters to URI standards', () => {
		expect(objectToQuery({ path: 'such/path/much/escape?' })).toEqual('?path=such%2Fpath%2Fmuch%2Fescape%3F');
	});

	test('Encodes array into coma separated list', () => {
		expect(objectToQuery({ list: ['one', 'two', 'three'] })).toEqual('?list=one,two,three');
	});
});

test('isDocumentPath', () => {
	// slashes will be removed by the document constructor
	// from the beginning and the end of a path string.
	expect(isDocumentPath('users')).toEqual(false);
	expect(isDocumentPath('users/username')).toEqual(true);

	expect(isDocumentPath('users/username/posts')).toEqual(false);
	expect(isDocumentPath('users/username/posts/entry')).toEqual(true);
});

describe('maskFromObject', () => {
	test('Empty object', () => {
		const obj = {};
		const expected = [];

		expect(isDocumentPath('users')).toEqual(false);
		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Shallow object', () => {
		const obj = {
			one: 'one',
			two: 'two',
			three: 'three',
			four: 'four'
		};
		const expected = ['one', 'two', 'three', 'four'];

		expect(isDocumentPath('users')).toEqual(false);
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
		const expected = ['one', 'two.one', 'two.two', 'three.one.one'];

		expect(isDocumentPath('users')).toEqual(false);
		expect(maskFromObject(obj)).toEqual(expected);
	});
});

describe('isRawDocument', () => {
	test('Returns true for a valid document', () => {
		const raw = {
			name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
			fields: {},
			createTime: '2014-10-02T15:01:23.045123456Z',
			updateTime: '2014-10-02T15:01:23.045123456Z'
		};

		const obj = {
			test: 'testing...',
			other: 'prop'
		};

		expect(isRawDocument(raw)).toEqual(true);
		expect(isRawDocument(obj)).toEqual(false);
	});

	test('Returns false when a document has missing props', () => {
		const missingName = {
			fields: {},
			createTime: '2014-10-02T15:01:23.045123456Z',
			updateTime: '2014-10-02T15:01:23.045123456Z'
		};

		const missingCreate = {
			name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
			fields: {},
			updateTime: '2014-10-02T15:01:23.045123456Z'
		};

		const missingUpdate = {
			name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
			fields: {},
			createTime: '2014-10-02T15:01:23.045123456Z'
		};

		expect(isRawDocument(missingName)).toEqual(false);
		expect(isRawDocument(missingCreate)).toEqual(false);
		expect(isRawDocument(missingUpdate)).toEqual(false);
	});
});

describe('Decode', () => {
	test('Throws when the passed object is not a raw document', () => {
		const missingName = {
			fields: {},
			createTime: '2014-10-02T15:01:23.045123456Z',
			updateTime: '2014-10-02T15:01:23.045123456Z'
		};

		const missingCreate = {
			name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
			fields: {},
			updateTime: '2014-10-02T15:01:23.045123456Z'
		};

		const missingUpdate = {
			name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
			fields: {},
			createTime: '2014-10-02T15:01:23.045123456Z'
		};
		expect(() => decode(missingName)).toThrow('Decode expect a valid Document');
		expect(() => decode(missingCreate)).toThrow('Decode expect a valid Document');
		expect(() => decode(missingUpdate)).toThrow('Decode expect a valid Document');
	});
});

describe('DecodeValue', () => {
	test('Throws on invalid value', () => {
		const invalid = {
			invalidType: 'eww...'
		};

		expect(() => decodeValue(invalid)).toThrow('Invalid Firestore value_type "invalidType"');
	});

	test('Simple Types', () => {
		const string = {
			stringValue: 'hello world!'
		};

		const integer = {
			integerValue: 42
		};

		const double = {
			integerValue: 42.2
		};

		const nullVal = {
			nullValue: null
		};

		expect(decodeValue(string)).toEqual('hello world!');
		expect(decodeValue(integer)).toEqual(42);
		expect(decodeValue(double)).toEqual(42.2);
		expect(decodeValue(nullVal)).toEqual(null);
	});

	test('Array', () => {
		const array = {
			arrayValue: {
				values: [
					{
						stringValue: 'hey there!'
					},
					{
						integerValue: '42'
					}
				]
			}
		};

		expect(decodeValue(array)).toEqual(['hey there!', 42]);
	});

	test('Map', () => {
		const map = {
			mapValue: {
				fields: {
					hello: {
						stringValue: 'world'
					},

					meaningOfLife: {
						integerValue: '42'
					}
				}
			}
		};

		const expected = {
			hello: 'world',
			meaningOfLife: 42
		};

		expect(decodeValue(map)).toEqual(expected);
	});
});

describe('DecodeMap', () => {
	test('Decodes a valid map', () => {
		const map = {
			fields: {
				hello: {
					stringValue: 'world'
				},

				meaningOfLife: {
					integerValue: '42'
				}
			}
		};

		const expected = {
			hello: 'world',
			meaningOfLife: 42
		};

		expect(decodeMap({})).toEqual({});
		expect(decodeMap(map)).toEqual(expected);
	});
});

describe('EncodeValue', () => {
	test('Encodes simple values', () => {
		const string = {
			stringValue: 'hello world'
		};

		const integer = {
			integerValue: '42'
		};

		const double = {
			doubleValue: '42.2'
		};

		const nullVal = {
			nullValue: null
		};

		expect(encodeValue('hello world')).toEqual(string);
		expect(encodeValue(42)).toEqual(integer);
		expect(encodeValue(42.2)).toEqual(double);
		expect(encodeValue(null)).toEqual(nullVal);
	});

	test('Arrays', () => {
		const expected = {
			arrayValue: {
				values: [
					{
						stringValue: 'hello world'
					},
					{
						integerValue: '42'
					},
					{
						doubleValue: '42.2'
					},
					{
						nullValue: null
					}
				]
			}
		};

		expect(encodeValue(['hello world', 42, 42.2, null])).toEqual(expected);
		expect(encodeValue([])).toEqual({ arrayValue: { values: [] } });
	});

	test('Maps', () => {
		const obj = {
			string: 'hello world',
			integer: 42,
			double: 42.2,
			nullVal: null
		};

		const expected = {
			mapValue: {
				fields: {
					string: {
						stringValue: 'hello world'
					},
					integer: {
						integerValue: '42'
					},
					double: {
						doubleValue: '42.2'
					},
					nullVal: {
						nullValue: null
					}
				}
			}
		};

		expect(encodeValue(obj)).toEqual(expected);
	});

	test('Timestamps', () => {
		const time = new Date();
		const expected = {
			timestampValue: time.toISOString()
		};

		expect(encodeValue(time)).toEqual(expected);
	});

	test('References', () => {
		const ref = new Reference('/path/to/document', { rootPath: '' });
		const expected = {
			referenceValue: '/path/to/document'
		};

		expect(encodeValue(ref)).toEqual(expected);
	});

	test('GeoPoints', () => {
		const geoPoint = new GeoPoint(50, 23);
		const expected = {
			geoPointValue: {
				latitude: 50,
				longitude: 23
			}
		};

		expect(encodeValue(geoPoint)).toEqual(expected);
	});
});

describe('EncodeMap', () => {
	test('Encodes a valid map', () => {
		const obj = {
			hello: 'world',
			meaningOfLife: 42
		};

		const expected = {
			fields: {
				hello: {
					stringValue: 'world'
				},

				meaningOfLife: {
					integerValue: '42'
				}
			}
		};

		expect(encode({})).toEqual({});
		expect(encode(obj)).toEqual(expected);
	});
});
