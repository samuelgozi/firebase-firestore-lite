import deepCopy from 'deep-copy';
import StructuredQuery from './StructuredQuery';

/*
 * This class helps users create queries in an intuitive way
 * by chaining methods.
 *
 * Example:
 *  new Query().select('phone').where('address.city', '==', 'Jerusalem').limit(100)
 *
 * The query above will return the phone numbers
 * of the first 100 people that live in Jerusalem.
 *
 * Please note that input validation is minimal in order to keep things light.
 */
class Query {
	constructor(queryObject = {}) {
		// Base schema for the instance
		const schema = {
			_select: [],
			_from: [],
			_where: []
		};

		// Copy the schema into the instance.
		Object.assign(this, schema);

		// Now copy the user passed arguments.
		for (let key in queryObject) {
			// Check that the key is valid
			if (
				!['select', 'from', 'where', 'orderBy', 'offset', 'limit'].includes(key)
			)
				throw Error(`Invalid property '${key}'`);

			// Copy the values into the new instance.
			this['_' + key] = queryObject[key];
		}
	}

	select(fieldPaths) {
		// Validate the input.
		if (!Array.isArray(fieldPaths) && typeof fieldPaths !== 'string')
			throw Error('FieldPaths must be an array or a string');

		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._select = newQuery._select.concat(fieldPaths);

		return newQuery;
	}

	from(collectionId, allDescendants = false) {
		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._from.push([collectionId, allDescendants]);

		return newQuery;
	}

	where(field, op, value) {
		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._where.push([field, op, value]);

		return newQuery;
	}

	offset(num) {
		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._offset = num;

		return newQuery;
	}

	limit(num) {
		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._limit = num;

		return newQuery;
	}

	orderBy(fieldPath, direction = 'asc') {
		if (direction !== 'asc' && direction !== 'des')
			throw Error("Direction can only be 'asc' or 'desc'");

		// Create a copy of the curent instance.
		const newQuery = Object.assign(new Query(), deepCopy(this));

		// Add the new collection selector to the new query.
		newQuery._orderBy = { fieldPath, direction };

		return newQuery;
	}

	compose() {
		// This object will be converted into the Structured Query.
		const sQuery = {};

		/*
     * Check if the fields are undefined,
     * if not then add them to the structured query
     */
		if (this._select !== undefined && this._select.length !== 0)
			sQuery.select = StructuredQuery.projection(this._select);

		if (this._from !== undefined && this._from.length !== 0)
			sQuery.from = this._from.map(collection =>
				StructuredQuery.collectionSelector(...collection)
			);

		if (this._where !== undefined && this._where.length !== 0) {
			sQuery.where =
				this._where.length > 1
					? StructuredQuery.compositeFilter(this._where)
					: StructuredQuery.filter(...this._where[0]);
		}

		if (this._orderBy !== undefined) {
			sQuery.orderBy = StructuredQuery.order(
				this._orderBy.fieldPath,
				this._orderBy.direction
			);
		}

		sQuery.offset = this._offset;
		sQuery.limit = this._limit;

		return { structuredQuery: sQuery };
	}
}

export default Query;
