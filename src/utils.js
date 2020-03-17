import Reference from './Reference.js';
import GeoPoint from './GeoPoint.js';

/**
 * Returns true if an object is a "raw" firebase document.
 * @param {Object} document the object/document to test
 * @returns {boolean}
 */
export function isRawDocument(document) {
	if (typeof document !== 'object') return false;

	// A Firestore document must have these three keys.
	// The fields key is optional.
	// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents
	for (let fieldName of ['name', 'createTime', 'updateTime']) {
		if (!(fieldName in document)) return false;
	}

	return true;
}

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
export function isPositiveInteger(val) {
	return Number.isInteger(val) && val >= 0;
}

/**
 * Converts an Object to a URI query String.
 * @param {Object} obj
 * @returns {string}
 */
export function objectToQuery(obj = {}) {
	const props = [];

	for (let prop in obj) {
		if (obj[prop] === undefined) continue; // Skip over undefined props.

		// If it is an array then we should encode each value in separate, and then join.
		const encodedValue = Array.isArray(obj[prop])
			? obj[prop].map(val => encodeURIComponent(val)).join()
			: encodeURIComponent(obj[prop]);

		props.push(`${prop}=${encodedValue}`);
	}

	return props.length === 0 ? '' : `?${props.join('&')}`;
}

/**
 * Returns an array of keyPaths of an object.
 * Skips over arrays values.
 * @param {Object} object The object to return its key paths.
 * @param {string} parentPath The parent path. used on recursive calls.
 * @returns {string[]}
 */
function getKeyPaths(object, parentPath) {
	let mask = [];

	for (const key in object) {
		const keyPath = parentPath ? `${parentPath}.${key}` : key;

		if (typeof object[key] === 'object' && !Array.isArray(object[key])) {
			mask = mask.concat(getKeyPaths(object[key], keyPath));
			continue;
		}

		mask.push(keyPath);
	}

	return mask;
}

/**
 * Returns a string that represents a query parameter field mask.
 * @param {Object} object
 */
export function maskFromObject(object = {}) {
	return getKeyPaths(object)
		.map(p => `updateMask.fieldPaths=${p}`)
		.join('&');
}

/**
 * Decodes a Firebase Value into a JS one.
 * @param {Object} firestoreValue Raw Firestore value
 * @param {Object} db The database instance to use in References.
 * @returns {any} JS representation of the value
 */
function decodeValue(value, db) {
	// Get the value type.
	const type = Object.keys(value)[0];
	// Replace the firebase raw value, with actual value inside of it.
	value = value[type];

	// Some values need to be handled in a specific way,
	// check if this is one of them, and return the value.
	switch (type) {
		case 'doubleValue':
		case 'integerValue':
			return Number(value);

		case 'arrayValue':
			return value.values.map(val => decodeValue(val, db));

		case 'mapValue':
			return decode(value, db);

		case 'timestampValue':
			return new Date(value);

		case 'referenceValue':
			return new Reference(value.replace(db.rootPath, ''), db);

		case 'geoPointValue':
			return new GeoPoint(value.latitude, value.longitude);

		// These are the rest of the values.
		// We include all of them instead of using 'default:'
		// because we use it as validation.
		case 'stringValue':
		case 'booleanValue':
		case 'nullValue':
		case 'bytesValue':
			return value;
	}

	console.log(type);

	// If none matched throw.
	throw Error(`Invalid Firestore value_type "${type}"`);
}

/**
 * Decodes a map into a JS object
 * @param {Object} map The map value to decode
 * @param {Object} db DB instance to use in references.
 * @returns {Object}
 */
export function decode(map, db) {
	if (db === undefined) throw Error("Argument 'db' is required but missing.");

	const object = {};
	for (const key in map.fields) {
		object[key] = decodeValue(map.fields[key], db);
	}

	return object;
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
