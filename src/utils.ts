import { Reference, CrudOptions } from './Reference.js';
import GeoPoint from './GeoPoint.js';
import Transform from './Transform.js';
import { FirebaseDocument, FirebaseMap } from './Document.js';
import { Database } from './Database.js';
import { Document } from './Document.js';

/**
 * Used for generating random fids.
 * @private
 */
const validChars =
	'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890';

export type Ref = Reference | Document | string;

/** @private */
type RefType = 'doc' | 'col';

/**
 * Trims spaces and slashes from a path
 * @private
 */
export function trimPath(path: string) {
	return path.trim().replace(/^\/?/, '').replace(/\/?$/, '');
}

/**
 * Returns true if a variable is a path that points to a collection
 * @private
 */
export function isPath(type: RefType, s: any): boolean {
	return (
		typeof s === 'string' &&
		s !== '' &&
		trimPath(s).split('/').length % 2 === (type === 'doc' ? 0 : 1)
	);
}

/**
 * Checks if a value is a Reference to a Document
 * @private
 */
export function isRef(type: RefType, val: any): boolean {
	return (
		val instanceof Reference &&
		(type === 'doc' ? !val.isCollection : val.isCollection)
	);
}

/** @private */
export function isRefType(ref: any): boolean {
	return (
		ref instanceof Reference ||
		ref instanceof Document ||
		typeof ref === 'string'
	);
}

/** @private */
export function getPathFromRef(ref: Ref) {
	if (!isRefType(ref))
		throw TypeError(
			'Expected a Reference, Document or a path but got something else'
		);

	return (
		(ref as Document)?.__meta__?.path ??
		(ref as Reference).path ??
		trimPath(ref as string)
	);
}

/** @private */
export function restrictTo(type: RefType, ref: Ref) {
	const isDoc = type === 'doc';
	const path = getPathFromRef(ref);
	if (!isPath(type, path))
		throw TypeError(
			`You are trying to access a method reserved for ${
				isDoc ? 'Documents' : 'Collections'
			} with a ${isDoc ? 'Collection' : 'Document'}`
		);

	return path;
}

/**
 * Checks if a value is a number that is not negative and is an integer
 * @private
 */
export function isPositiveInteger(val: any): boolean {
	return Number.isInteger(val) && val >= 0;
}

/**
 * Converts an Object to a URI query String
 * @private
 */
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

/**
 * Returns an array of keyPaths of an object but skips over arrays values
 * @private
 */
export function getKeyPaths(object: any, parentPath?: string): string[] {
	let mask: string[] = [];

	for (const key in object) {
		const keyPath = parentPath ? `${parentPath}.${key}` : key;

		if (object[key] instanceof Transform) continue;

		if (
			object[key] !== null &&
			typeof object[key] === 'object' &&
			!Array.isArray(object[key])
		) {
			mask = mask.concat(getKeyPaths(object[key], keyPath));
			continue;
		}

		mask.push(keyPath);
	}

	return mask;
}

/**
 * Compile options object into firebase valid api arguments object
 * @private
 */
export function compileOptions(options: CrudOptions, obj?: any) {
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
				if (!obj) break;
				if (value) compiled.updateMask = { fieldPaths: getKeyPaths(obj) };
				break;
			default:
				compiled[key] = value;
		}
	}

	return compiled;
}

/**
 * Decodes a Firebase Value into a JS one
 * @private
 */
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

/**
 * Decodes a Firebase map into a JS object
 * @private
 */
export function decode(map: FirebaseMap | FirebaseDocument, db: Database) {
	if (db === undefined) throw Error('Argument "db" is required but missing');

	const object: any = {};
	for (const key in map.fields) {
		object[key] = decodeValue(map.fields[key], db);
	}

	return object;
}

/**
 * Encodes a JS variable into a Firebase Value
 * @private
 */
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

/**
 * Converts a Javascript object into a write instruction
 * @private
 */
export function encode(
	object: any,
	transforms?: Transform[],
	parentPath?: string
): FirebaseMap {
	const keys = Object.keys(object);

	if (keys.length === 0) return {};

	const map: any = { fields: {} };

	for (const key of keys) {
		if (object[key] === undefined) continue;
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

/**
 * Generates 22 chars long random alphanumerics unique identifiers
 * @private
 */
export function fid() {
	const randBytes = crypto.getRandomValues(new Uint8Array(20));
	return Array.from(randBytes)
		.map(b => validChars[b % 63])
		.join('');
}
