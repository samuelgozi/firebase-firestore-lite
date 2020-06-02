import { Reference, CrudOptions } from './Reference';
import GeoPoint from './GeoPoint';
import Transform from './Transform';
import { FirebaseDocument, FirebaseMap } from './Document';
import Database from './Database';

// Used for generating random fids.
const validChars =
	'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890';

/** Trims spaces and slashes from a path */
export function trimPath(path: string) {
	return path.trim().replace(/^\/?/, '').replace(/\/?$/, '');
}

/** Returns true if a variable is a path that points to a document */
export function isDocPath(s: any): boolean {
	return (
		typeof s === 'string' && s !== '' && trimPath(s).split('/').length % 2 === 0
	);
}

/** Returns true if an object is a "raw" firebase document */
export function isRawDocument(document: any): boolean {
	if (typeof document !== 'object') return false;

	// A Firestore document must have these three keys.
	// The fields key is optional.
	// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents
	for (const fieldName of ['name', 'createTime', 'updateTime']) {
		if (!(fieldName in document)) return false;
	}

	return true;
}

/** Checks if a value is a Reference to a Document */
export function isDocReference(val: any): boolean {
	return val instanceof Reference && !val.isCollection;
}

/** Returns true if a value is a Reference to a Collection */
export function isColReference(val: any): boolean {
	return val instanceof Reference && val.isCollection;
}

/** Checks if a value is a number that is not negative and is an integer */
export function isPositiveInteger(val: any): boolean {
	return Number.isInteger(val) && val >= 0;
}

/** Converts an Object to a URI query String */
export function objectToQuery(obj: any = {}, parentProp?: string): string {
	const params = [];
	const encode = encodeURIComponent;

	for (const prop in obj) {
		if (obj[prop] === undefined) continue; // Skip over undefined props.
		const propPath = parentProp ? `${parentProp}.${prop}` : prop;

		// If it is an array then we should encode each value independently, and then join.
		if (Array.isArray(obj[prop])) {
			obj[prop].forEach((v: string) => {
				params.push(`${propPath}=${encode(v)}`);
			});
			continue;
		}

		if (typeof obj[prop] === 'object') {
			const val = objectToQuery(obj[prop], propPath);
			val && params.push(val);
			continue;
		}

		params.push(`${propPath}=${encode(obj[prop])}`);
	}

	return (!parentProp && params.length ? '?' : '') + params.join('&');
}

/** Returns an array of keyPaths of an object but skips over arrays values */
export function getKeyPaths(object: any, parentPath?: string): string[] {
	let mask: string[] = [];

	for (const key in object) {
		const keyPath = parentPath ? `${parentPath}.${key}` : key;

		if (object[key] instanceof Transform) continue;

		if (typeof object[key] === 'object' && !Array.isArray(object[key])) {
			mask = mask.concat(getKeyPaths(object[key], keyPath));
			continue;
		}

		mask.push(keyPath);
	}

	return mask;
}

/** compile options object into firebase valid api arguments object */
export function compileOptions(options: CrudOptions, obj: any) {
	const compiled: any = {};

	for (let [key, value] of Object.entries(options)) {
		if (value === undefined) continue;

		switch (key) {
			case 'exists':
			case 'updateTime':
				if (!compiled.currentDocument) compiled.currentDocument = {};
				compiled.currentDocument[key] = value;
				break;
			case 'updateMask':
				if (value) compiled.updateMask = { fieldPaths: getKeyPaths(obj) };
				break;
			default:
				compiled[key] = value;
		}
	}

	return compiled;
}

/** Decodes a Firebase Value into a JS one */
function decodeValue(value: any, db: Database) {
	// Get the value type.
	const type = Object.keys(value)[0];
	// Replace the firebase raw value, with actual value inside of it.
	value = value[type];

	// Some values need to be handled in a specific way,
	// check if this is one of them, and return the value.
	switch (type) {
		case 'integerValue':
			return Number(value);

		case 'arrayValue':
			return value.values
				? value.values.map((val: any) => decodeValue(val, db))
				: [];

		case 'mapValue':
			return decode(value as FirebaseMap, db);

		case 'timestampValue':
			return new Date(value as string);

		case 'referenceValue':
			return new Reference(value.replace(db.rootPath, ''), db);

		case 'geoPointValue':
			return new GeoPoint(value.latitude, value.longitude);

		// These are the rest of the values.
		// We include all of them instead of using 'default:'
		// because we use it as validation.
		case 'stringValue':
		case 'doubleValue':
		case 'booleanValue':
		case 'nullValue':
		case 'bytesValue':
			return value;
	}

	// If none matched throw.
	throw Error(`Invalid Firestore value_type "${type}"`);
}

/** Decodes a map into a JS object */
export function decode(map: FirebaseMap | FirebaseDocument, db: Database) {
	if (db === undefined) throw Error('Argument "db" is required but missing');

	const object: any = {};
	for (const key in map.fields) {
		object[key] = decodeValue(map.fields[key], db);
	}

	return object;
}

/** Encodes a JS variable into a Firebase Value */
export function encodeValue(
	value: any,
	transforms?: Transform[],
	parentPath?: string
): any {
	const objectClass = Object.prototype.toString.call(value);
	let valueType =
		objectClass.substring(8, objectClass.length - 1).toLowerCase() + 'Value';

	switch (valueType) {
		case 'numberValue':
			valueType = Number.isInteger(value) ? 'integerValue' : 'doubleValue';
			value = valueType === 'integerValue' ? String(value) : value;
			break;

		case 'arrayValue':
			value = value.length ? { values: value.map(encodeValue) } : {};
			break;

		case 'dateValue':
			valueType = 'timestampValue';
			value = value.toISOString();
			break;

		case 'objectValue':
			// If the object is a custom type, then use its built in encoder
			// and return it.
			if (value instanceof Reference || value instanceof GeoPoint)
				return value.toJSON();

			// Else assume its intended to be a Map value.
			valueType = 'mapValue';
			value = encode(value, transforms, parentPath);
			break;
	}

	return { [valueType]: value };
}

/** Converts an object into a write instruction */
export function encode(
	object: any,
	transforms?: Transform[],
	parentPath?: string
): FirebaseMap {
	const keys = Object.keys(object);

	if (keys.length === 0) return {};

	const map: any = { fields: {} };

	for (const key of keys) {
		const value = object[key];
		const path = parentPath ? `${parentPath}.${key}` : key;

		// If this is a transform then add it to the transforms
		// list and skip its parsing. but only if a transforms array
		// was provided.
		if (value instanceof Transform) {
			value.fieldPath = path;
			transforms && transforms.push(value);
			continue;
		}

		map.fields[key] = encodeValue(value, transforms, path);
	}

	return map;
}

/** Generates 22 chars long random alphanumerics unique identifiers */
export function fid() {
	const randBytes = crypto.getRandomValues(new Uint8Array(22));
	return Array.from(randBytes)
		.map(b => validChars[b % 63])
		.join('');
}
