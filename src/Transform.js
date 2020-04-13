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

export default class Transform {
	constructor(name, value) {
		if (!(name in transformsMap)) throw Error(`Invalid transform name: "${name}"`);
		const [transformName, validator] = transformsMap[name];

		if (validator && !validator(value))
			throw Error(
				`The value for the transform "${name}" needs to be a${validator === isNumber ? ' number' : 'n array'}.`
			);

		this[transformName] = name === 'serverTimestamp' ? 'REQUEST_TIME' : encodeValue(value);
	}
}
