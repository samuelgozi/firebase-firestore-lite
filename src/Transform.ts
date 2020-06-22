import { encodeValue } from './utils.js';

/** @private */
function isNumber(v: any) {
	return typeof v === 'number' && !isNaN(v - v);
}

/** @private */
type validator = (v: any) => boolean;

/** @private */
interface TransformsMap {
	[key: string]: [string, validator?];
}

/** @private */
const transformsMap: TransformsMap = {
	serverTimestamp: ['setToServerValue'],
	increment: ['increment', isNumber],
	max: ['maximum', isNumber],
	min: ['minimum', isNumber],
	appendToArray: ['appendMissingElements', Array.isArray],
	removeFromArray: ['removeAllFromArray', Array.isArray]
};

type TransformName =
	/** Is replaces by the server with the time the request was processed */
	| 'serverTimestamp'
	/** The server will increment this field by the given amount */
	| 'increment'
	/** Sets the field to the maximum of its current value and the given value */
	| 'max'
	/** Sets the field to the minimum of its current value and the given value */
	| 'min'
	/**
	 * Append the given elements in order if they are not already
	 * present in the current field value. If the field is not an array, or if the
	 * field does not yet exist, it is first set to the empty array.
	 */
	| 'appendToArray'
	/**
	 * Remove all of the given elements from the array in
	 * the field. If the field is not an array, or if the field does not yet exist,
	 * it is set to the empty array.
	 */
	| 'removeFromArray';

/**
 * Represents a value that is the result of an operation
 * made by the Firebase server. For example `serverTimestamp`
 * can't be known in the client, as it evaluates in the server.
 */
export default class Transform {
	[key: string]: any;
	fieldPath?: string;

	/**
	 * @param value when applicable, the value will be used.
	 * for example when using `increment` the value will be the number to increment by.
	 */
	constructor(name: TransformName, value: number | any[]) {
		if (!(name in transformsMap))
			throw Error(`Invalid transform name: "${name}"`);
		const [transformName, validator] = transformsMap[name];

		if (validator && !validator(value))
			throw Error(
				`The value for the transform "${name}" needs to be a${
					validator === isNumber ? ' number' : 'n array'
				}.`
			);

		if (validator === Array.isArray)
			this[transformName] = encodeValue(value).arrayValue;
		else
			this[transformName] =
				name === 'serverTimestamp' ? 'REQUEST_TIME' : encodeValue(value);
	}
}
