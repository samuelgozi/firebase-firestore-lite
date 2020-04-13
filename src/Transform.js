import { encodeValue } from './utils';

function isNumber(v) {
	return typeof v === 'number' && !isNaN(v - v);
}

const transformsMap = {
	serverTimestamp: ['setToServerValue'],
	increment: ['increment', isNumber],
	max: ['maximum', isNumber],
	min: ['minimum', isNumber],
	appendToArray: ['appendMissingElements', Array.isArray],
	removeFromArray: ['removeAllFromArray', Array.isArray]
};

/**
 * Represents a value that is the result of an operation
 * made by the Firebase server. For example `serverTimestamp`
 * cant be known in the client, as it evaluates in the server.
 *
 * The valid types are:
 *  - `serverTimestamp`: Is replaces by the server with the time the request was processed.
 *  - `increment`: The server will increment this field by the given amount.
 *  - `max`: Sets the field to the maximum of its current value and the given value.
 *  - `min`: Sets the field to the minimum of its current value and the given value.
 *  - `appendToArray`: Append the given elements in order if they are not already
 *     present in the current field value. If the field is not an array, or if the
 *     field does not yet exist, it is first set to the empty array.
 *  - `removeFromArray`: Remove all of the given elements from the array in
 *     the field. If the field is not an array, or if the field does not yet exist,
 *     it is set to the empty array.
 */
export default class Transform {
	/**
	 * @param {'serverTimestamp'|'increment'|'max'|'min'|'appendToArray'|'removeFromArray'} name The name of the Transform.
	 * @param {number|any[]} value when applicable, the value will be used.
	 * for example when using `increment` the value will be the number to increment by.
	 */
	constructor(name, value) {
		if (!(name in transformsMap)) throw Error(`Invalid transform name: "${name}"`);
		const [transformName, validator] = transformsMap[name];

		if (validator && !validator(value))
			throw Error(
				`The value for the transform "${name}" needs to be a${validator === isNumber ? ' number' : 'n array'}.`
			);

		if (validator === Array.isArray) this[transformName] = encodeValue(value).arrayValue;
		else this[transformName] = name === 'serverTimestamp' ? 'REQUEST_TIME' : encodeValue(value);
	}
}
