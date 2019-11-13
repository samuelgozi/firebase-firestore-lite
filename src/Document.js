import Reference from './Reference.js';
import GeoPoint from './GeoPoint.js';

export default class Document {
	/**
	 * Returns true if an object is a "raw" firebase document.
	 * @param {Object} document the object/document to test
	 * @returns {boolean}
	 */
	static isRawDocument(document) {
		// A Firestore document must have these three keys.
		// The fields key is optional.
		// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents
		for (let fieldName of ['name', 'createTime', 'updateTime']) {
			if (!(fieldName in document)) return false;
		}

		return true;
	}

	/**
	 * Decodes a map into a JS object
	 * @param {Object} map The map value to decode
	 * @returns {Object}
	 */
	static decode(map) {
		const object = {};

		for (const key in map.fields) {
			object[key] = Document.decodeValue(map.fields[key]);
		}

		return object;
	}

	/**
	 * Decodes a Firebase Value into a JS one.
	 * @param {Object} value Raw Firestore value
	 * @returns {any} JS representation of the value
	 */
	static decodeValue(value) {
		// Get the value type.
		const valueType = Object.keys(value)[0];

		// Some values need to be handled in a specific way,
		// check if this is one of them, and return the value.
		switch (valueType) {
			case 'doubleValue':
			case 'integerValue':
				return Number(value[valueType]);

			case 'arrayValue':
				return value.arrayValue.values.map(Document.decodeValue);

			case 'mapValue':
				return Document.decode(value.mapValue);

			// These are the rest of the values.
			// We include all of them instead of using 'default:'
			// because we use it as validation.
			case 'stringValue':
			case 'booleanValue':
			case 'nullValue':
			case 'timestampValue':
			case 'geoPointValue':
			case 'referenceValue':
			case 'bytesValue':
				return value[valueType];
		}

		// If none matched throw.
		throw Error(`Invalid Firestore value_type "${valueType}"`);
	}

	/**
	 * Converts an object into a Firebase Map Value.
	 * @param {Object} object The object to encode
	 * @returns {Object}
	 */
	static encode(object) {
		const keys = Object.keys(object);

		// If the object has no keys, then we don't
		// need to add a 'fields' property.
		// I'm not sure this matters, if I knew it didn't
		// I would remove this if statement.
		if (keys.length === 0) return {};

		const map = { fields: {} };

		for (const key of keys) {
			map.fields[key] = Document.encodeValue(object[key]);
		}

		return map;
	}

	/**
	 * Encodes a JS variable into a Firebase Value.
	 * @param {any} value The variable to encode
	 * @returns {object}
	 */
	static encodeValue(value) {
		const objectClass = Object.prototype.toString.call(value);
		let valueType = objectClass.substring(8, objectClass.length - 1).toLowerCase() + 'Value';

		switch (valueType) {
			case 'numberValue':
				valueType = Number.isInteger(value) ? 'integerValue' : 'doubleValue';
				value = String(value);
				break;

			case 'arrayValue':
				value = { values: value.map(Document.encodeValue) };
				break;

			case 'dateValue':
				valueType = 'timestampValue';
				value = value.toISOString();
				break;

			case 'objectValue':
				// If the object is a custom type, then use its built in encoder
				// and return it.
				if ([Reference, GeoPoint].includes(value.constructor)) return value.toJSON();

				// Else assume its intended to be a Map value.
				valueType = 'mapValue';
				value = Document.encode(value);
				break;
		}

		return {
			[valueType]: value
		};
	}

	constructor(rawDoc, db) {
		const { name, createTime, updateTime } = rawDoc;
		const meta = {
			db,
			name,
			createTime: new Date(createTime),
			updateTime: new Date(updateTime),
			path: name.replace(db.endpoint, ''),
			id: name.split('/').pop()
		};

		Object.defineProperty(this, '__meta__', {
			value: meta
		});

		Object.assign(this, Document.decode(rawDoc));
	}
}
