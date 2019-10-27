import { encodeValue } from './utils.js';

const operators = {
	fieldFilter: {
		'<': 'LESS_THAN',
		'<=': 'LESS_THAN_OR_EQUAL',
		'>': 'GREATER_THAN',
		'>=': 'GREATER_THAN_OR_EQUAL',
		'==': 'EQUAL',
		contains: 'ARRAY_CONTAINS'
	}
};

const directions = {
	asc: 'ASCENDING',
	des: 'DESCENDING'
};

const filter = {
	// Used when multiple filters need to be chained.
	compositeFilter: {
		op: 'AND',
		filter: 'nested filter'
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

const order = {
	field: {
		fieldPath: 'field.path'
	},
	direction: 'ASCENDING or DESCENDING'
};

export default class Query {
	constructor(reference, options) {
		const { select, from, where, orderBy, startAt, endAt, offset, limit } = options;
	}
}
