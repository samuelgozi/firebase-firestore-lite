import { isDocReference, isColReference, isPositiveInteger, encodeValue } from './utils.js';
import Document from '../src/Document.js';

/**
 * Allowed types for the "from" option.
 * @typedef {Object} FromOption
 * @property {Reference} collection the collection reference.
 * @property {boolean} allDescendants whether to make a compound query or not.
 */

/**
 * Options object for a Query class.
 * @typedef {array} FilterOption
 * @property {string} 0 - Property name
 * @property {string} 1 - Operator - Can only be: `<`, `<=`, `LESS_THAN_OR_EQUAL`, `>`, `>=`, `==` or `contains`.
 * @property {string} 2 - Value to compare
 */

/**
 * Options object for a Query class.
 * @typedef {Object} OrderOption
 * @property {string} field The field path to use while ordering.
 * @property {('ascending'|'descending')} [direction] The direction; ascending or descending.
 */

/**
 * Options object for a Query class.
 * @typedef {Object} CursorOption
 * @property {Reference} Reference A reference to a document.
 * @property {boolean} before If the position is just before or just after the given values.
 */

/**
 * Options object for a Query class.
 * @typedef {Object} QueryOptions
 * @property {string[]} [select] The fields to return, leave empty to return the whole doc.
 * @property {Reference} from The collection to query, Should be set automatically if you are using `ref.query()`.
 * @property {FilterOption[]} [where] Filter used to select matching documents.
 * @property {(string | OrderOption)} [orderBy] The field to use while ordering the results and direction.
 * @property {(Reference | CursorOption)} [startAt] Reference to a document from which to start the query.
 * @property {(Reference | CursorOption)} [endAt] Reference to a document at which to end the query.
 * @property {number} [offset] The number of results to skip.
 * @property {number} [limit] The max amount of documents to return.
 */

const operators = {
	'<': 'LESS_THAN',
	'<=': 'LESS_THAN_OR_EQUAL',
	'>': 'GREATER_THAN',
	'>=': 'GREATER_THAN_OR_EQUAL',
	'==': 'EQUAL',
	contains: 'ARRAY_CONTAINS'
};

/**
 * Checks if a value is a valid filter array.
 * @param {*} filter A the value to check
 * @returns {boolean} True if the value is a valid filter.
 */
function validateFilter(filter) {
	if (!Array.isArray(filter) || filter.length !== 3) return false;

	const [fieldPath, op, value] = filter;
	if (typeof fieldPath !== 'string') throw Error('Invalid field path');
	if (!(op in operators)) throw Error('Invalid operator');
	if ((value === null || Number.isNaN(value)) && filter[1] !== '==')
		throw Error('Null and NaN can only be used with the == operator');
	if (value === undefined) throw Error('Invalid comparative value');
}

/*
 * A map of functions used to encode each argument for a query.
 * Each function receives the Library arguments and returns an object
 * that will be converted to Json and sent to the Firestore REST API.
 */
const encoders = {
	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestores REST API.
	 * @param {string[]} val array of references to collections.
	 * @returns {Object}
	 */
	select(fieldsArray) {
		const fields = fieldsArray.map(fieldPath => ({ fieldPath }));
		return fields.length ? { fields } : undefined;
	},

	/**
	 * Converts a Query filter(array with three items), into an encoded filter.
	 * @param {FilterOption} filter - The filter.
	 * @returns {Object}
	 */
	encodeFilter([fieldPath, op, value]) {
		if (Number.isNaN(value) || value === null) {
			return {
				unaryFilter: {
					field: { fieldPath },
					op: Number.isNaN(value) ? 'IS_NAN' : 'IS_NULL'
				}
			};
		}

		return {
			fieldFilter: {
				field: { fieldPath },
				op: operators[op],
				value: encodeValue(value)
			}
		};
	},

	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestores REST API.
	 * @param {FilterOption[]} val Array of filters.
	 * @returns {Object}
	 */
	where(option) {
		if (option.length === 0) return;

		if (option.length === 1) {
			return this.encodeFilter(option[0]);
		}

		// If there are more than one filters then this is a composite filter.
		return {
			compositeFilter: {
				op: 'AND',
				filters: option.map(this.encodeFilter)
			}
		};
	},

	referenceToCursor(ref) {
		return {
			values: [{ referenceValue: ref.name }],
			before: true
		};
	},

	startAt(ref) {
		return this.referenceToCursor(ref);
	},

	endAt(ref) {
		return this.referenceToCursor(ref);
	}
};

/**
 * Query object that represents a Firestore query.
 */
export default class Query {
	/**
	 * Create a Firestore query.
	 * @param {QueryOptions} options configuration for the query.
	 */
	constructor(options = {}) {
		this.options = {
			select: [],
			where: [],
			orderBy: []
		};

		// Loop through all the valid options, validate them and then save them.
		for (const option of ['select', 'from', 'where', 'orderBy', 'startAt', 'endAt', 'offset', 'limit']) {
			const optionValue = options[option];

			if (option in options) {
				// If the option is "where" or "orderBy", and is also an array,
				// then it might be a compound value, so we want to pass it one
				// by one to its method.
				//
				// "where" is always an array, because every individual filter
				// is represented by an array, so check to see if its first child
				// is also an array. if it is, then it might be a compound value.
				if (
					(option === 'where' && Array.isArray(optionValue[0])) ||
					(option === 'orderBy' && Array.isArray(optionValue))
				) {
					optionValue.forEach((val, i) => {
						// Use try/catch in order to provide context for the error.
						try {
							// Try to save the value.
							this[option](val);
						} catch (e) {
							throw Error(`Invalid argument "${option}[${i}]": ${e.message}`);
						}
					});

					continue;
				}

				// If the argument is not an array, then just save it directly.
				// Again, we use try/catch to catch the error and add context to it.
				try {
					this[option](optionValue);
				} catch (e) {
					throw Error(`Invalid argument "${option}": ${e.message}`);
				}
			}
		}

		// Validate that "from" is always passed.
		if (!('from' in options)) throw Error('"from" is required when building a new query');
		this.db = options.from.db;
		this.parentDocument = options.from.parent;
	}

	select(fields) {
		if (!Array.isArray(fields)) throw Error('Expected argument to be an array of field paths');
		fields.forEach((field, i) => {
			if (typeof field !== 'string') throw Error(`Field path at index [${i}] is not a string`);
			this.options.select.push(field);
		});
	}

	/**
	 * Adds a collection to query.
	 */
	from(val) {
		const collection = val.collection || val;
		const { allDescendants } = val;
		if (!isColReference(collection)) throw Error('Expected a reference to a collection');
		if (allDescendants !== undefined && typeof allDescendants !== 'boolean')
			throw Error('Expected the "allDescendants" argument to be a boolean');

		this.options.from = { collectionId: collection.id, allDescendants };

		return this;
	}

	where(fieldPath) {
		const filter = Array.isArray(fieldPath) ? fieldPath : arguments;
		validateFilter(filter);
		this.options.where.push(filter);
		return this;
	}

	orderBy(order, dir = 'asc') {
		const dirMap = {
			asc: 'ASCENDING',
			desc: 'DESCENDING'
		};

		let { field: fieldPath = order, direction = dir } = order;
		direction = dirMap[direction];

		if (typeof fieldPath !== 'string') throw Error('"field" property needs to be a string');
		if (direction === undefined) throw Error('"direction" property can only be "asc" or "desc"');

		this.options.orderBy.push({ field: { fieldPath }, direction });
		return this;
	}

	startAt(ref) {
		if (!isDocReference(ref)) throw Error('Expected a reference to a document');
		this.options.startAt = ref;
		return this;
	}

	endAt(ref) {
		if (!isDocReference(ref)) throw Error('Expected a reference to a document');
		this.options.endAt = ref;
		return this;
	}

	offset(number) {
		if (!isPositiveInteger(number)) throw Error('Expected an integer that is greater than 0');
		this.options.offset = number;
		return this;
	}

	limit(number) {
		if (!isPositiveInteger(number)) throw Error('Expected an integer that is greater than 0');
		this.options.limit = number;
		return this;
	}

	toJSON() {
		const encoded = {};

		for (const option in this.options) {
			const optionValue = this.options[option];

			if (option in encoders) {
				encoded[option] = encoders[option](optionValue);
				continue;
			}

			encoded[option] = optionValue;
		}

		return {
			structuredQuery: encoded
		};
	}

	async run() {
		return (
			await this.db.fetch(this.parentDocument.endpoint + ':runQuery', {
				method: 'POST',
				body: JSON.stringify(this)
			})
		).map(result => new Document(result.document, this.db));
	}
}
