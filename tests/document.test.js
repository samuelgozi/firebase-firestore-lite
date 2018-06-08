import Document from '../src/Document';

test('Converts object to firestore document', () => {
	const obj = {
		hi: 'My Name is',
		life: 42,
		int: 4.2,
		subObj: {testing: 'should work!'},
		arr: ['hi', 'there!', 11, 1.1]
	};

	const expected = Document.from(obj);

	expect(expected).toHaveProperty('fields.hi.stringValue', 'My Name is');
	expect(expected).toHaveProperty('fields.life.integerValue', 42);
	expect(expected).toHaveProperty('fields.int.doubleValue', 4.2);
	expect(expected).toHaveProperty('fields.subObj.mapValue.fields.testing.stringValue', 'should work!');
});
