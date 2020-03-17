import Reference from '../src/Reference.js';
import GeoPoint from '../src/GeoPoint.js';
const db = { rootPath: 'projects/projectId/databases/(default)/documents', endpoint: 'endpoint' };

export default {
	null: null,
	boolean: false,
	integer: 42,
	double: 4.2,
	timestamp: new Date('2019-10-10T14:00:00.617973Z'),
	string: 'This is a string',
	reference: new Reference('public/ref', db),
	geoPoint: new GeoPoint(30, 30),
	array: [
		null,
		false,
		42,
		4.2,
		new Date('2019-10-10T14:00:00.617973Z'),
		'This is a string',
		new Reference('public/ref', db),
		new GeoPoint(30, 30),
		['one', 'two', 'three'],
		{ one: 'one', two: 2, three: 3.1 }
	],
	map: {
		null: null,
		boolean: false,
		integer: 42,
		double: 4.2,
		timestamp: new Date('2019-10-10T14:00:00.617973Z'),
		string: 'This is a string',
		reference: new Reference('public/ref', db),
		geoPoint: new GeoPoint(30, 30),
		array: ['one', 'two', 'three'],
		map: { one: 'one', two: 2, three: 3.1 }
	}
};
