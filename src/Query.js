import { encodeValue, isDocReference, isColReference, isValidNumber } from './utils.js';

/**
 * Allowed types for the "from" option.
 * @typedef {Object} FromOption
 * @property {Reference} collection the collection reference.
 * @property {boolean} allDescendants whether to make a compound query or not.
 */

/**
 * Options object for a Query class.
 * @typedef {[string, string, string]} FilterOption
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
 * @property {string[]} select The fields to return, leave empty to return the whole doc.
 * @property {Reference} from The collection to query.
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
function isFilter(filter) {
	if (!Array.isArray(filter) || filter.length !== 3) return false;

	// Check if on of the functions in the array returns true.
	// There are three functions, one for each argument that
	// needs to be present in a valid filter.
	// Each function checks that its related argument is valid.
	// it it returns true its invalid, and we loop through them.
	return ![
		fieldPath => typeof fieldPath !== 'string',
		op => !(op in operators),
		value => {
			if (value === undefined) return true;
			return (value === null || Number.isNaN(value)) && filter[1] !== '==';
		}
	].some((fn, i) => fn(filter[i]));
}

/**
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
		return {
			fields: fieldsArray.map(fieldPath => ({ fieldPath }))
		};
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

	orderBy(option) {
		option.push({ field: { fieldPath: '__name__' }, direction: 'ASCENDING' });
		return option;
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
			where: [],
			orderBy: []
		};

		// Loop through all the valid options, validate them and then save them.
		for (const option of ['select', 'from', 'where', 'orderBy', 'startAt', 'endAt', 'offset', 'limit']) {
			const optionValue = options[option];

			// Save the option only if it was passed in the options.
			// Remember, we are looping through the array of the valid options,
			// not directly over the ones passed.
			if (option in options) {
				// If the argument is an array, then loop though its values, and
				// add them one by one. the only values allowed to be arrays
				// are: 'where' and 'orderBy'.
				if ((option === 'where' || option === 'orderBy') && Array.isArray(optionValue)) {
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
	}

	/**
	 * Adds a collection to query.
	 */
	from(val) {
		const collection = val.collection || val;
		const { allDescendants } = val;
		if (!isColReference(collection)) throw Error('Invalid "from" argument');
		if (allDescendants !== undefined && typeof allDescendants !== 'boolean')
			throw Error('"from" expects the "allDescendants"argument to be a boolean');

		this.options.from = { collectionId: collection.id, allDescendants };

		return this;
	}

	where(fieldPath) {
		const filter = Array.isArray(fieldPath) ? fieldPath : arguments;
		if (!isFilter(filter)) throw Error('Invalid filter');
		this.options.where.push(filter);
		return this;
	}

	orderBy(order) {
		const fieldPath = order.field || order;
		const direction = typeof order.direction === 'string' ? order.direction.toUpperCase() : order.direction;

		if (typeof fieldPath !== 'string') throw Error('"field" property needs to be a string');
		if (![undefined, 'ASCENDING', 'DESCENDING'].includes(direction))
			throw Error('"direction" property can only be one of: "ascending" or "descending"');

		this.options.orderBy.push({ field: { fieldPath }, direction: direction || 'ASCENDING' });
	}

	startAt(ref) {
		if (!isDocReference(ref)) throw Error('"startAt" expects the argument to be a Reference to a Document');
		this.options.startAt = ref;
	}

	endAt(ref) {
		if (!isDocReference(ref)) throw Error('"endAt" expects the argument to be a Reference to a Document');
		this.options.endAt = ref;
	}

	offset(number) {
		if (!isValidNumber(number)) throw Error('"offset" expects the argument to be a Integer that is greater than 0');
		this.options.offset = number;
	}

	limit(number) {
		if (!isValidNumber(number)) throw Error('"limit" expects the argument to be a Integer that is greater than 0');
		this.options.limit = number;
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

	run() {
		this.options.from.db.fetch(this.options.from.db.endpoint + ':runQuery', {
			method: 'POST',
			body: JSON.stringify(this)
		});
	}
}
