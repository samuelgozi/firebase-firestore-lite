import Document from '../src/Document.js';
import { Reference, GeoPoint } from '../src/customTypes.js';

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
		expect(() => Document.decode(missingName)).toThrow('Document.Decode expect a valid Document');
		expect(() => Document.decode(missingCreate)).toThrow('Document.Decode expect a valid Document');
		expect(() => Document.decode(missingUpdate)).toThrow('Document.Decode expect a valid Document');
	});
});

describe('DecodeValue', () => {
	test('Throws on invalid value', () => {
		const invalid = {
			invalidType: 'eww...'
		};

		expect(() => Document.decodeValue(invalid)).toThrow('Invalid Firestore value_type "invalidType"');
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

		expect(Document.decodeValue(string)).toEqual('hello world!');
		expect(Document.decodeValue(integer)).toEqual(42);
		expect(Document.decodeValue(double)).toEqual(42.2);
		expect(Document.decodeValue(nullVal)).toEqual(null);
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

		expect(Document.decodeValue(array)).toEqual(['hey there!', 42]);
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

		expect(Document.decodeValue(map)).toEqual(expected);
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

		expect(Document.decodeMap({})).toEqual({});
		expect(Document.decodeMap(map)).toEqual(expected);
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

		expect(Document.encodeValue('hello world')).toEqual(string);
		expect(Document.encodeValue(42)).toEqual(integer);
		expect(Document.encodeValue(42.2)).toEqual(double);
		expect(Document.encodeValue(null)).toEqual(nullVal);
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

		expect(Document.encodeValue(['hello world', 42, 42.2, null])).toEqual(expected);
		expect(Document.encodeValue([])).toEqual({ arrayValue: { values: [] } });
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

		expect(Document.encodeValue(obj)).toEqual(expected);
	});

	test('Timestamps', () => {
		const time = new Date();
		const expected = {
			timestampValue: time.toISOString()
		};

		expect(Document.encodeValue(time)).toEqual(expected);
	});

	test('References', () => {
		const ref = new Reference('/path/to/document');
		const expected = {
			referenceValue: '/path/to/document'
		};

		expect(Document.encodeValue(ref)).toEqual(expected);
	});

	test('GeoPoints', () => {
		const geoPoint = new GeoPoint(50, 23);
		const expected = {
			geoPointValue: {
				latitude: 50,
				longitude: 23
			}
		};

		expect(Document.encodeValue(geoPoint)).toEqual(expected);
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

		expect(Document.encodeMap({})).toEqual({});
		expect(Document.encodeMap(obj)).toEqual(expected);
	});
});
