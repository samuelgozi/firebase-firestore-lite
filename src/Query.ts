import { Document } from './Document';
import { Reference } from './Reference';
import { Database } from './Database';
import { isRef, isPositiveInteger, encodeValue } from './utils';

interface FromOption {
	/** Reference to the collection */
	collection: Reference;
	/** Whether to make a compound query or not */
	allDescendants: boolean;
}

type FilterOption = [
	/** Property name */
	string,
	/** Operator */
	'<' | '<=' | '>' | '>=' | '==' | 'contains',
	/** The value to compare against */
	any
];

interface OrderOption {
	/** The field path to use while ordering */
	field: string;
	/** The direction to order by */
	direction?: 'asc' | 'desc';
}

interface QueryOptions {
	[key: string]: any;
	/** The fields to return, leave empty to return the whole doc. */
	select?: string[];
	/** The collection to query, Should be set automatically if you are using `ref.query()` */
	from: Reference | FromOption;
	/** Filter used to select matching documents */
	where?: FilterOption[];
	/** The field to use while ordering the results and direction */
	orderBy?: string | OrderOption | Array<string | OrderOption>;
	/** Reference to a document from which to start the query */
	startAt?: Document;
	/** Reference to a document at which to end the query */
	endAt?: Document;
	/** The number of results to skip */
	offset?: number;
	/** The max amount of documents to return */
	limit?: number;
}

/** @private */
const operatorsMap = {
	'<': 'LESS_THAN',
	'<=': 'LESS_THAN_OR_EQUAL',
	'>': 'GREATER_THAN',
	'>=': 'GREATER_THAN_OR_EQUAL',
	'==': 'EQUAL',
	contains: 'ARRAY_CONTAINS'
};

/**
 * Checks if a value is a valid filter array.
 * @private
 */
function validateFilter(filter: any): void {
	if (!Array.isArray(filter) || filter.length !== 3)
		throw Error('Filter missing arguments');

	const [fieldPath, op, value] = filter;
	if (typeof fieldPath !== 'string') throw Error('Invalid field path');
	if (!(op in operatorsMap)) throw Error('Invalid operator');
	if ((value === null || Number.isNaN(value)) && filter[1] !== '==')
		throw Error('Null and NaN can only be used with the == operator');
	if (value === undefined) throw Error('Invalid comparative value');
}

/**
 * A map of functions used to encode each argument for a query.
 * Each function receives the Library arguments and returns an object
 * that will be converted to Json and sent to the Firestore REST API.
 * @private
 */
const encoders = {
	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestores REST API.
	 */
	select(fieldsArray: string[]) {
		const fields = fieldsArray.map(fieldPath => ({ fieldPath }));
		return fields.length ? { fields } : undefined;
	},

	/** Converts a Query filter(array with three items), into an encoded filter */
	encodeFilter([fieldPath, op, value]: FilterOption): any {
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
				op: operatorsMap[op],
				value: encodeValue(value)
			}
		};
	},

	/**
	 * Converts an option from the Query instance into a valid JSON
	 * object to use with the Firestore's REST API.
	 */
	where(option: FilterOption[]) {
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

	/**
	 * When a startAt or endAt cursor is used,
	 * It is necessary to add a __name__ order at the end
	 * in order to make sure we start from the right spot.
	 */
	orderBy(fields: any[], options: any) {
		// Only add the __name__ order if a cursor was provided
		// and if its is not already present.
		if (
			(options.startAt || options.endAt) &&
			fields[fields.length - 1]?.field.fieldPath !== '__name__'
		)
			fields.push({
				field: { fieldPath: '__name__' },
				// Use the default order when there are no other fields,
				// And if there are fields, use the order of the last one.
				// This adheres to the spec at:
				// https://firebase.google.com/docs/firestore/reference/rest/v1beta1/StructuredQuery
				direction: fields[fields.length - 1]?.direction ?? 'ASCENDING'
			});

		return fields;
	},

	documentToCursor(doc: Document, options: any) {
		const values: any[] = [];

		for (let order of options.orderBy) {
			if (order.field.fieldPath === '__name__') {
				values.push({ referenceValue: doc.__meta__.name });
				continue;
			}

			const value = doc[order.field.fieldPath];
			value && values.push(encodeValue(value));
		}

		return {
			values,
			before: true
		};
	},

	startAt(doc: Document, options: any) {
		return this.documentToCursor(doc, options);
	},

	endAt(doc: Document, options: any) {
		return this.startAt(doc, options);
	}
};

/** @private */
const queryOptions = [
	'select',
	'from',
	'where',
	'orderBy',
	'startAt',
	'endAt',
	'offset',
	'limit'
];

/**
 * Query class that represents a Firestore query.
 */
export class Query {
	[key: string]: any;

	private db: Database;
	private parentDocument: Reference;
	readonly options: any = {
		select: [],
		where: [],
		orderBy: []
	};

	constructor(init = {} as QueryOptions) {
		// Loop through all the valid options, validate them and then save them.
		for (const option of queryOptions) {
			const optionValue = init[option];

			if (option in init) {
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
					optionValue.forEach((val: any, i: number) => {
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
		if (!('from' in init))
			throw Error('"from" is required when building a new query');
		this.db = (init.from as Reference).db;
		this.parentDocument = (init.from as Reference).parent;
	}

	select(fields: QueryOptions['select']) {
		if (!Array.isArray(fields))
			throw Error('Expected argument to be an array of field paths');
		fields.forEach((field, i) => {
			if (typeof field !== 'string')
				throw Error(`Field path at index [${i}] is not a string`);
			this.options.select.push(field);
		});
	}

	/**
	 * Adds a collection to query.
	 */
	from(val: QueryOptions['from']) {
		const collection = (val as FromOption).collection || val;
		const { allDescendants } = val as FromOption;

		if (!isRef('col', collection))
			throw Error('Expected a reference to a collection');

		if (allDescendants !== undefined && typeof allDescendants !== 'boolean')
			throw Error('Expected the "allDescendants" argument to be a boolean');

		this.options.from = {
			collectionId: (collection as Reference).id,
			allDescendants
		};

		return this;
	}

	where(fieldPath: QueryOptions['where']) {
		const filter = Array.isArray(fieldPath) ? fieldPath : arguments;
		validateFilter(filter);
		this.options.where.push(filter);
		return this;
	}

	orderBy(
		order: QueryOptions['orderBy'],
		dir: OrderOption['direction'] = 'asc'
	) {
		const dirMap = {
			asc: 'ASCENDING',
			desc: 'DESCENDING'
		};

		let { field: fieldPath = order, direction = dir } = order as OrderOption;
		direction = dirMap[direction] as 'asc' | 'desc';

		if (typeof fieldPath !== 'string')
			throw Error('"field" property needs to be a string');
		if (direction === undefined)
			throw Error('"direction" property can only be "asc" or "desc"');

		this.options.orderBy.push({ field: { fieldPath }, direction });
		return this;
	}

	startAt(doc: Document) {
		if (!(doc instanceof Document)) throw Error('Expected a Document instance');
		this.options.startAt = doc;
		return this;
	}

	endAt(doc: Document) {
		if (!(doc instanceof Document)) throw Error('Expected a Document instance');
		this.options.endAt = doc;
		return this;
	}

	offset(number: number) {
		if (!isPositiveInteger(number))
			throw Error('Expected an integer that is greater than 0');
		this.options.offset = number;
		return this;
	}

	limit(number: number) {
		if (!isPositiveInteger(number))
			throw Error('Expected an integer that is greater than 0');
		this.options.limit = number;
		return this;
	}

	async run() {
		let results = await this.db.fetch(
			this.parentDocument.endpoint + ':runQuery',
			{
				method: 'POST',
				body: JSON.stringify(this)
			}
		);

		results[0]?.document || results.splice(0, 1);
		return results.map((result: any) => new Document(result.document, this.db));
	}

	toJSON() {
		const encoded: any = {};

		for (const option in this.options) {
			const optionValue = this.options[option];

			if (option in encoders) {
				encoded[option] = (encoders as any)[option](optionValue, this.options);
				continue;
			}

			encoded[option] = optionValue;
		}

		return {
			structuredQuery: encoded
		};
	}
}
