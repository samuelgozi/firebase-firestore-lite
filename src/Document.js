/*
 * Documents received from the REST api of a Firestore databaseare not plain JS objects and have to be "proccesed"
 * or "parsed" into ones.
 *
 * The same needs to hapen when you want to add/edit/update an existing one. Since the REST api doesnt deal with plain objects.
 *
 * This file exports the static "document" class which helps you convert firestore's "documents" into plain Js Objects, and the other way around.
 */

import equal from 'fast-deep-equal';
import deepCopy from 'deep-copy';

/*
 * Checks if an object is a firestore document.
 * returns a boolean.
 */
function isFirestoreDocument(obj) {
	for (let fieldName of ['name', 'createTime', 'updateTime']) {
		if (!(fieldName in obj)) return false;
	}

	return true;
}

class Document {
	/*
   * the constructor creates a Document class from a firestore document, or a plain object.
   */
	constructor(data = {}) {
		// Validate that data is an object
		if (Object.prototype.toString.call(data) !== '[object Object]')
			throw Error('Document constructor should receive an Object.');

		// If data is a plain object and not a Firestore document.
		if (!isFirestoreDocument(data)) {
			// Merge the data with the new instance.
			Object.assign(this, data);

			// Add an empty 'reference' property to the new instance for diffing.
			this.__reference__ = {};

			return;
		}

		// Else, if data is a firestore document.
		Document.parse(data, this);

		// Make a copy in order to use as a reference.
		const docCopy = deepCopy(this);

		// Now delete the __meta__ from the reference.
		delete docCopy.__meta__;

		// Save a copy of the original data for diffing.
		this.__reference__ = docCopy;
	}

	/*
   * Create an array of fieldMasks of the modified fields.
   */
	fieldsMask(obj = this.diff()) {
		// Create an array of with the keys of the reference object.
		const masks = Object.keys(obj);

		// Loop over the values in the mask array, each value is an existing key in 'obj'.
		masks.forEach((value, index) => {
			// If the property holds an Object then recursively run this function on it.
			if (Object.prototype.toString.call(obj[value]) === '[object Object]') {
				// Create a mask for the sub object.
				const subObjMask = this.fieldsMask(obj[value]);

				// If there is more than one item in the mask then we need to copy the current 'value'.
				subObjMask.forEach((subValue, subIndex) => {
					// In the first iteration replace the current 'value'.
					if (subIndex === 0) {
						masks[index] = value + '.' + subValue;
						return;
					}

					// Otherwise just add it.
					masks.push(value + '.' + subValue);
				});
			}
		});

		return masks;
	}

	/*
   * Returns a Document instance but only with the diffed fields.
   */
	diff(modified = this, reference = this.__reference__) {
		const diffObj = {};

		for (let key in modified) {
			// Skip privare properties.
			if (key === '__meta__' || key === '__reference__') continue;

			// If this is an object then recursively run this function on it.
			if (Object.prototype.toString.call(this[key]) === '[object Object]') {
				// Diff this sub Object.
				const subObjDiff = this.diff(modified[key], reference[key]);

				// Only create add prop if the diff of the sub object is not empty.
				if (Object.keys(subObjDiff).length !== 0) diffObj[key] = subObjDiff;
				continue;
			}

			// Diff the rest.
			if (!equal(modified[key], reference[key])) {
				diffObj[key] = modified[key];
			}
		}

		// Copy the __meta__ and __reference__ if exists.
		if ('__meta__' in modified)
			diffObj.__meta__ = Object.assign({}, modified.__meta__);
		if ('__reference__' in modified)
			diffObj.__reference__ = Object.assign({}, modified.__reference__);

		return diffObj;
	}

	/*
   * ====================================== *
   * From now on all the methods are static *
   * ====================================== *
   */

	/*
   * Each "raw" field(or "fireValue") is an Object with a key and a value, and the key tels us the type of the value.
   * Here I use Object.keys in order to get an array of the keys in the "raw" field, there should only be one so we only need the first.
   * This way we can later convert the value in to the right type.
   */
	static parseValue(fireValue) {
		const fieldType = Object.keys(fireValue)[0];
		let field;

		// Now here we convert the value into the right type.
		switch (fieldType) {
			case 'doubleValue':
			case 'integerValue':
				field = Number(fireValue[fieldType]);
				break;

			case 'arrayValue':
				field = fireValue.arrayValue.values.map(subField =>
					this.parseValue(subField)
				);
				break;

			case 'mapValue':
				field = this.parse(fireValue.mapValue);
				break;

			default:
				field = fireValue[fieldType];
				// fields[fieldName] = fireValue;
				break;
		}

		return field;
	}

	/*
   * Proccesses the "raw" document(or fireDocument) from the REST response and returns them as plain JS objects.
   * The raw fields can be within an object, or within an array, it'll handle both cases.
   * TODO: better input validation.
   */
	static parse(fireDocument, targetObj = {}) {
		// Validate that the firebase document is an object.
		if (Object.prototype.toString.call(fireDocument) !== '[object Object]')
			throw Error('The argument is not a valid firestore document.');

		// Validate that we got an object for the target.
		if (Object.prototype.toString.call(targetObj) !== '[object Object]')
			throw Error('The target object must be an object.');

		// All the top level properties should be private, copy them into the __meta__ prop.
		for (let key in fireDocument) {
			const value = fireDocument[key];

			// If this field is 'fields' then skip, will deal with it later.
			if (key === 'fields') continue;

			// If there are props left here, then we need to create a place form them.
			if (!('__meta__' in targetObj)) targetObj.__meta__ = {};

			// If the field is 'createTime' or 'updateTime' then convert it first to a date.
			targetObj.__meta__[key] = key.endsWith('Time') ? new Date(value) : value;
		}

		/*
		 * Now all the properties inside the 'fields' property are the ones that describe our document,
		 * so now we hoist them to the root of the document for conviniece.
		 */
		for (let fieldName in fireDocument.fields) {
			// convert the right field into the right type.
			targetObj[fieldName] = this.parseValue(fireDocument.fields[fieldName]);
		}

		return targetObj;
	}

	/*
   * Create a firestore value object from a property.
   */
	static composeValue(property) {
		const propType = Object.prototype.toString.call(property);
		let type =
      propType.substring(8, propType.length - 1).toLowerCase() + 'Value';

		// Will hold the final value.
		const value = {};

		// If the type is a number then we need to check if its either an integer or a double.
		if (type === 'numberValue')
			type = Number.isInteger(property) ? 'integerValue' : 'doubleValue';

		// If the type is array
		if (type === 'arrayValue') {
			value.arrayValue = {};
			value.arrayValue.values = property.map(subProp =>
				this.composeValue(subProp)
			);
			return value;
		}

		// If type is Map
		if (type === 'objectValue') {
			value.mapValue = {};
			value.mapValue.fields = {};

			for (let propName in property) {
				value.mapValue.fields[propName] = this.composeValue(property[propName]);
			}

			return value;
		}

		// Encapsulate the property inside the right property name.
		value[type] = property;

		return value;
	}

	/*
   * Convert a given object into a valid firestore Document.
   * TODO: validation.
   */
	static compose(obj) {
		const document = { fields: {} };

		// Coppy all the properties.
		for (let key in obj) {
			// If the current prop is __reference__ or __meta__ then dont copy them.
			if (key === '__reference__' || key === '__meta__') continue;

			// Copy the mata properties(if exist) to the root of the new doc.
			if ('__meta__' in obj) {
				for (let key in obj.__meta__) {
					// If it is a key, then first convert it to ISO string. else just copy.
					document[key] = key.endsWith('Time')
						? obj.__meta__[key].toISOString()
						: obj.__meta__[key];
				}
			}

			// Else add it to the 'fields' property of the document.
			document.fields[key] = this.composeValue(obj[key]);
		}

		return document;
	}
}

export default Document;
