import Reference from './Reference.js';
import { encodeValue, isReference, isValidNumber } from './utils.js';

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
 * @property {Reference[]} from The collections to include in the query.
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
 * A map of functions used to encode each argument for a query.
 * Each function receives the Library arguments and returns an object
 * that will be converted to Json and sent to the Firestore REST API.
 */
const encoders = {
	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestores REST API.
	 * @param {Reference[]} val array of references to collections.
	 * @returns {Object}
	 */
	from(val) {
		return val.map(ref => ({
			collectionId: ref.id,
			allDescendants: false
		}));
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
			values: [
				{
					__name__: ref.id
				}
			],
			before: false
		};
	},

	orderBy(val) {
		return {
			field: {
				fieldPath: typeof val === 'string' ? val : val.field
			},
			direction: val.direction !== undefined ? val.direction.toUpperCase() : 'ASCENDING'
		};
	},

	startAt(ref) {
		return this.referenceToCursor(ref);
	},

	endAt(ref) {
		return this.referenceToCursor(ref);
	}
};

const validators = {
	from(val) {
		if (!Array.isArray(val) || val.some(val => !(val instanceof Reference))) return false;
		return true;
	},

	where(val) {
		if (!Array.isArray(val)) return false;
		return !val.some(([fieldPath, op, value]) => {
			return typeof fieldPath !== 'string' || !(op in operators) || value === undefined;
		});
	},

	orderBy(val) {
		if (typeof val === 'object') {
			if (typeof val.field !== 'string') return false;
			if ('direction' in val && !['ascending', 'descending'].includes(val.direction)) return false;

			return true;
		}

		return typeof val === 'string';
	},

	startAt: isReference,
	endAt: isReference,
	offset: isValidNumber,
	limit: isValidNumber
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
		this.options = {};

		// Loop through all the valid options, validate them and then save them.
		for (const option of ['from', 'where', 'orderBy', 'startAt', 'endAt', 'offset', 'limit']) {
			if (option in options && option in validators) {
				const optionValue = options[option];

				// Validate the option value.
				if (!validators[option](optionValue)) throw Error(`Invalid "${option}" property`);

				// If didn't throw, save it.
				this.options[option] = optionValue;
			}
		}

		// Validate that "from" is always passed.
		if (!('from' in options)) throw Error('"From" is required when building a new query');
	}

	encode() {
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
		this.reference.db.fetch(this.reference.endpoint, {
			method: 'POST',
			body: JSON.stringify(this.encode())
		});
	}
}
