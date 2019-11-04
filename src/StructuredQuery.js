import Reference from './Reference.js';

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

const filters = {
	// Used when multiple filters need to be chained.
	compositeFilter: {
		op: 'AND',
		filters: ['nested filter']
	},
	// Used when the user uses the supported operators
	fieldFilter: {
		field: { fieldPath: 'field.path' },
		op: 'operator',
		value: 'encodedValue'
	},
	// Used when the user uses the supported operators
	unaryFilter: {
		op: 'IS_NAN or IS_NULL'
	}
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
		return {
			collectionId: val.id || val.collection.id,
			allDescendants: val.allDescendants || false
		};
	},

	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestores REST API.
	 * @param {FilterOption[]} val Array of filters.
	 * @returns {Object}
	 */
	where(val) {
		return {};
	},

	orderBy(val) {
		return {
			orderBy: {
				field: {
					fieldPath: typeof val === 'string' ? val : val.field
				},
				direction: val.direction !== undefined ? val.direction.toUpperCase() : 'ASCENDING'
			}
		};
	}
};

function encodeOptions(options) {
	const allowedProps = ['from', 'where', 'orderBy', 'startAt', 'endAt', 'offset', 'limit'];
	const query = {};

	for (const argName of allowedProps) {
		// For each argument, encode it and save it to the query object.
		query[argName] = encoders[argName](options[argName]);
	}

	return query;
}

const validators = {
	from(val) {
		if (!Array.isArray(val) || val.some(val => !(val instanceof Reference))) return false;
		return true;
	},

	where(val) {
		if (!Array.isArray(val)) return false;
		for (const [fieldPath, op, value] of val) {
			if (typeof fieldPath !== 'string' || !operators.includes(op) || value === undefined) return false;
			return true;
		}
	},

	orderBy(val) {
		if (typeof val === 'object') {
			if (typeof val.field !== 'string') return false;
			if ('direction' in val && !['ascending', 'descending'].includes(val.direction)) return false;

			return true;
		}

		return typeof val === 'string';
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

	run() {
		this.reference.db.fetch(this.reference.endpoint, {
			method: 'POST',
			body: JSON.stringify({
				structuredQuery: this.options
			})
		});
	}
}
