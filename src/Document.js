import { isRawDocument } from './utils.js';
import { Reference, GeoPoint } from './customTypes.js';

export default class Document {
	/**
	 * Decodes a raw Firebase document into document class instance
	 * that can be used as a regular object.
	 * @param {Object} document Raw Firebase document to decode
	 * @returns {Document}
	 */
	static decode(document) {
		if (!isRawDocument(document)) throw Error('Document.Decode expect a valid Document');
	}

	/**
	 * Decodes a map into a JS object
	 * @param {Object} map The map value to decode
	 * @returns {Object}
	 */
	static decodeMap(map) {
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
				return value.arrayValue.values.map(this.decodeValue);

			case 'mapValue':
				return this.decodeMap(value.mapValue);

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
	static encodeMap(object) {
		const keys = Object.keys(object);

		// If the object has no keys, then we don't
		// need to add a 'fields' property.
		// I'm not sure this matters, if I knew it didn't
		// I would remove this if statement.
		if (keys.length === 0) return {};

		const map = { fields: {} };

		for (const key of keys) {
			map.fields[key] = this.encodeValue(object[key]);
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
				value = { values: value.map(this.encodeValue) };
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
				value = this.encodeMap(value);
				break;
		}

		return {
			[valueType]: value
		};
	}
}
