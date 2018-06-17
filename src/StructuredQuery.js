import Document from './Document';

/*
 * All the static methods in this class are supposed to be for internal use.
 * Specifically for converting instances into valid "Structured Queries"
 *
 * Documentation for why and what the static methods do can be found here:
 * https://firebase.google.com/docs/firestore/reference/rest/v1beta1/StructuredQuery
 */
class StructuredQuery {
	/*
	 * Constructs and returns a projection made of the fieldPaths passed to it.
	 */
	static projection(fieldPaths) {
		return {
			fields: fieldPaths.map(fieldPath => {
				return { fieldPath };
			})
		};
	}

	/*
	 * Constructs and returns a CollectionSelector
	 */
	static collectionSelector(collectionId, allDescendants = false) {
		return {
			collectionId,
			allDescendants
		};
	}

	/*
	 * Constructs and returns a compositeFilter.
	 */
	static compositeFilter(filters) {
		return {
			compositeFilter: {
				op: 'AND',
				filters: filters.map(filter => StructuredQuery.filter(...filter))
			}
		};
	}

	/*
	 * Constructs and returns a Filter
	 */
	static filter(field, op, value) {
		const operatorsMap = {
			'<': 'LESS_THAN',
			'<=': 'LESS_THAN_OR_EQUAL',
			'>': 'GREATER_THAN',
			'>=': 'GREATER_OR_EQUAL',
			'==': 'EQUAL'
		};

		const operators = ['<', '<=', '>', '>=', '=='];

		// Validate inputs.
		if (!operators.includes(op))
			throw Error(`The operator '${op}' is not valid`);

		// If the value is null or NaN then we need to compose a Unary Filter.
		if (value === null || Number.isNaN(value)) {
			// If value is 'null' or 'NaN' then the operator can only be '=='
			if (op !== '==')
				throw Error(
					`The operator '${op} can't be used with the value '${value}'`
				);

			// Choose the right unary operator based on the type of the value.
			let opString = Number.isNaN(value) ? 'IS_NAN' : 'IS_NULL';

			return {
				unaryFilter: {
					field: { fieldPath: field },
					op: opString
				}
			};
		}

		// Else it should be a fieldFilter
		// Get the string representation of the operator
		let opString = operatorsMap[op];

		return {
			fieldFilter: {
				field: { fieldPath: field },
				op: opString,
				value: Document.composeValue(value)
			}
		};
	}

	static order(fieldPath, direction) {
		const dirMap = {
			asc: 'ASCENDING',
			des: 'DESCENDING'
		};

		return {
			field: {
				fieldPath: fieldPath
			},
			direction: direction ? dirMap[direction] : 'DIRECTION_UNSPECIFIED'
		};
	}
}

export default StructuredQuery;
