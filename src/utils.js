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
	let props = [];

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
