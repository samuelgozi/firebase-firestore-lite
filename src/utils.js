import { GeoPoint } from './customTypes.js';
import Reference from './Reference.js';

/**
 * Checks if a value is a Reference to a Document.
 * @param {*} val A the value to check
 * @returns {boolean}
 */
export function isDocReference(val) {
	return val instanceof Reference && !val.isCollection;
}

/**
 * Checks if a value is a Reference to a Collection.
 * @param {*} val A the value to check
 * @returns {boolean}
 */
export function isColReference(val) {
	return val instanceof Reference && val.isCollection;
}

/**
 * Checks if a value is a number that is not negative and is an integer.
 * @param {*} val the value to check
 * @returns {boolean}
 */
export function isValidNumber(val) {
	return Number.isInteger(val) && val >= 0;
}

/**
 * Converts an Object to a URI query String.
 * @param {Object} obj
 * @returns {string}
 */
export function objectToQuery(obj = {}) {
	let propsArr = [];

	for (let prop in obj) {
		if (obj[prop] === undefined) continue; // Skip over undefined props.

		// If it is an array then we should encode each value in separate, and then join.
		const encodedValue = Array.isArray(obj[prop])
			? obj[prop].map(val => encodeURIComponent(val)).join()
			: encodeURIComponent(obj[prop]);

		propsArr.push(`${prop}=${encodedValue}`);
	}

	return propsArr.length === 0 ? '' : `?${propsArr.join('&')}`;
}

/**
 * Returns true if the path points to a document
 * and false if it points to a collection.
 */
export function isDocumentPath(path) {
	const segments = path.split('/');
	return segments.length % 2 === 0;
}

/**
 * Returns an array of field paths
 * for a provided object.
 */
export function maskFromObject(object, parentPath) {
	let mask = [];

	for (const key in object) {
		const keyPath = parentPath ? `${parentPath}.${key}` : key;

		if (typeof object[key] === 'object') {
			mask = [...mask, ...maskFromObject(object[key], keyPath)];
			continue;
		}

		mask.push(keyPath);
	}

	return mask;
}

/**
 * Returns true if an object is a "raw" firebase document.
 * @param {Object} document the object/document to test
 * @returns {boolean}
 */
export function isRawDocument(document) {
	// A Firestore document must have these three keys.
	// The fields key is optional.
	// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents
	for (let fieldName of ['name', 'createTime', 'updateTime']) {
		if (!(fieldName in document)) return false;
	}

	return true;
}

/**
 * Decodes a raw Firebase document into document class instance
 * that can be used as a regular object.
 * @param {Object} document Raw Firebase document to decode
 * @returns {Document}
 */
export function decode(document) {
	if (!isRawDocument(document)) throw Error('Decode expects a RawDocument');
	return decodeMap(document.fields || {});
}

/**
 * Decodes a map into a JS object
 * @param {Object} map The map value to decode
 * @returns {Object}
 */
export function decodeMap(map) {
	const object = {};

	for (const key in map.fields) {
		object[key] = decodeValue(map.fields[key]);
	}

	return object;
}

/**
 * Decodes a Firebase Value into a JS one.
 * @param {Object} value Raw Firestore value
 * @returns {any} JS representation of the value
 */
export function decodeValue(value) {
	// Get the value type.
	const valueType = Object.keys(value)[0];

	// Some values need to be handled in a specific way,
	// check if this is one of them, and return the value.
	switch (valueType) {
		case 'doubleValue':
		case 'integerValue':
			return Number(value[valueType]);

		case 'arrayValue':
			return value.arrayValue.values.map(decodeValue);

		case 'mapValue':
			return decodeMap(value.mapValue);

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
export function encode(object) {
	const keys = Object.keys(object);

	// If the object has no keys, then we don't
	// need to add a 'fields' property.
	// I'm not sure this matters, if I knew it didn't
	// I would remove this if statement.
	if (keys.length === 0) return {};

	const map = { fields: {} };

	for (const key of keys) {
		map.fields[key] = encodeValue(object[key]);
	}

	return map;
}

/**
 * Encodes a JS variable into a Firebase Value.
 * @param {any} value The variable to encode
 * @returns {object}
 */
export function encodeValue(value) {
	const objectClass = Object.prototype.toString.call(value);
	let valueType = objectClass.substring(8, objectClass.length - 1).toLowerCase() + 'Value';

	switch (valueType) {
		case 'numberValue':
			valueType = Number.isInteger(value) ? 'integerValue' : 'doubleValue';
			value = String(value);
			break;

		case 'arrayValue':
			value = { values: value.map(encodeValue) };
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
			value = encode(value);
			break;
	}

	return {
		[valueType]: value
	};
}
