import Transaction from '../src/Transaction.js';
import Reference from '../src/Reference.js';

const db = { rootPath: 'projects/projectId/databases/(default)/documents', endpoint: 'endpoint' };
const doc = { one: 'one', two: 2, three: 4.2 };
const rawDoc = {
	name: 'projects/projectId/databases/(default)/documents/col/doc',
	fields: {
		one: {
			stringValue: 'one'
		},
		two: {
			integerValue: '2'
		},
		three: {
			doubleValue: '4.2'
		}
	}
};

describe('Transaction', () => {
	describe('Set', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const tx = new Transaction(db);

			tx.set(ref, doc);

			expect(tx.writes).toEqual([{ update: rawDoc }]);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.set('col/doc', doc);

			expect(tx.writes).toEqual([{ update: rawDoc }]);
		});
	});

	describe('Update', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const tx = new Transaction(db);

			tx.update(ref, doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: true }
				}
			]);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.update('col/doc', doc);

			expect(tx.writes).toEqual([
				{
					update: rawDoc,
					updateMask: { fieldPaths: ['one', 'two', 'three'] },
					currentDocument: { exists: true }
				}
			]);
		});
	});

	describe('Delete', () => {
		test('Passing a Reference instance', () => {
			const ref = new Reference('col/doc', db);
			const tx = new Transaction(db);

			tx.delete(ref);

			expect(tx.writes).toEqual([{ delete: rawDoc.name }]);
		});

		test('Passing a string as the reference', () => {
			const tx = new Transaction(db);

			tx.delete('col/doc');

			expect(tx.writes).toEqual([{ delete: rawDoc.name }]);
		});
	});
});
