/*
 * Documents received from the REST api of a Firestore databaseare not plain JS objects and have to be "proccesed"
 * or "parsed" into ones.
 *
 * The same needs to hapen when you want to add/edit/update an existing one. Since the REST api doesnt deal with plain objects.
 *
 * This file exports the static "document" class which helps you convert firestore's "documents" into plain Js Objects, and the other way around.
 */

export default class {
	/*
	 * Each "raw" field(or "fireValue") is an Object with a key and a value, and the key tels us the type of the value.
	 * Here I use Object.keys in order to get an array of the keys in the "raw" field, there should only be one so we only need the first.
	 * This way we can later convert the value in to the right type.
	 */
	static parseValue (fireValue) {
		const fieldType = Object.keys(fireValue)[0];
		let field;

		// Now here we convert the value into the right type.
		switch (fieldType) {
			case 'doubleValue':
			case 'integerValue':
				field = Number(fireValue[fieldType]);
				break;

			case 'arrayValue':
				field = this.parse(fireValue[fieldType].values);
				break;

			case 'mapValue':
				field = this.parse(fireValue[fieldType]);
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
	 */
	static parse(fireDocument) {
		const  fireDocumentIsArray = Array.isArray(fireDocument);
		const fields = fireDocumentIsArray ? [] : {};

		// If we are dealing with an array.
		if(fireDocumentIsArray) {
			for(let field of fireDocument) {
				// convert the right field into the right type.
				fields.push(this.parseValue(field));
			}

			return fields;
		}

		// From now on we assume we are dealing with an object or "map".
		// All the top level properties should be private, copy them and then append a $ to their name.
		for(let fieldName in fireDocument) {
			// If this field is 'fields' then skip, will deal with it later.
			if(fieldName === 'fields') continue;

			// If the field is 'createTime' or 'updateTime' then convert it first to a date.
			fields['$' + fieldName] = (fieldName === 'createTime' || fieldName === 'updateTime') ? Date.parse(fireDocument[fieldName]) : fireDocument[fieldName];
		}

		/*
		 * Now all the properties inside the 'fields' property are the ones that describe our document,
		 * so now we hoist them to the root of the document for conviniece.
		 */
		for(let fieldName in fireDocument.fields) {
			// convert the right field into the right type.
			fields[fieldName] = this.parseValue(fireDocument.fields[fieldName]);
		}

		return fields;
	}

	/*
	 * Create a firestore value object from a proprty.
	 */
	static valueFrom(property) {
		const propType = Object.prototype.toString.call(property);
		let type = propType.substring(8, propType.length - 1).toLowerCase() + 'Value';

		// Will hold the final value.
		const value = {};

		// If the type is a number then we need to check if its either an integer or a double.
		if(type === 'numberValue') type = Number.isInteger(property) ? 'integerValue' : 'doubleValue';

		// If the type is array
		if(type === 'arrayValue') {
			value.arrayValue = {};
			value.arrayValue.values = property.map(subProp => this.valueFrom(subProp));
			return value;
		}

		// If type is Map
		if(type === 'objectValue') {
			value.mapValue = {};
			value.mapValue.fields = {};

			for(let propName in property) {
				value.mapValue.fields[propName] = this.valueFrom(property[propName]);
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
	static from(obj) {
		const document = { fields: {} };
		const privateProps = ['$name', '$createTime', '$updateTime'];

		for(let fieldName in obj) {
			// if the field is '$id' then skip it.
			if(fieldName === '$id') continue;

			// If the field is a private property then it needs to be added to the root of the object.
			if(privateProps.includes(fieldName)) {
				document[fieldName.substr(1)] = obj[fieldName];
				continue;
			}

			// Else add it to the 'fields' property of the document.
			document.fields[fieldName] = this.valueFrom(obj[fieldName]);
		}

		return document;
	}
}
