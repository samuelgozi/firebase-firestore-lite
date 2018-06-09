import Document from '../src/Document';

test('Converts object to firestore document with correct types', () => {
	const obj = {
		hi: 'My Name is',
		life: 42,
		int: 4.2,
		subObj: {testing: 'should work!'},
		arr: ['hi', 42]
	};

	const expected = Document.from(obj);

	expect(expected).toHaveProperty('fields.hi.stringValue', 'My Name is');
	expect(expected).toHaveProperty('fields.life.integerValue', 42);
	expect(expected).toHaveProperty('fields.int.doubleValue', 4.2);
	expect(expected).toHaveProperty('fields.arr.arrayValue.values', [{stringValue: 'hi'}, {integerValue: 42}]);
	expect(expected).toHaveProperty('fields.subObj.mapValue.fields.testing.stringValue', 'should work!');
});

test('Converts firestore Document into a plain object', () => {
	const doc = {
		'name': 'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6',
		'fields': {
			'author': {
				'stringValue': 'pWAmnssD6QSaVEAmQjJeW5lnlos2'
			},
			'age': {
				'integerValue': '42'
			},
			'children': {
				'mapValue': {
					'fields': {
						'name': {
							'stringValue': 'isac'
						}
					}
				}
			},
			'body': {
				'stringValue': 'This is the first ever body/content in the CMS'
			},
			'is_cool': {
				'booleanValue': true
			},
			'title': {
				'stringValue': 'This is the first ever entry in the void CMS'
			},
			'cars': {
				'arrayValue': {
					'values': [
						{
							'stringValue': 'buggati'
						},
						{
							'stringValue': 'porsche'
						}
					]
				}
			}
		},
		'createTime': '2018-06-03T08:49:25.025687Z',
		'updateTime': '2018-06-06T20:03:56.437363Z'
	};

	const expected = Document.parse(doc);

	expect(expected).toHaveProperty('$name', 'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6');
	expect(expected).toHaveProperty('$createTime', Date.parse('2018-06-03T08:49:25.025687Z'));
	expect(expected).toHaveProperty('$updateTime', Date.parse('2018-06-06T20:03:56.437363Z'));
	expect(expected).toHaveProperty('author', 'pWAmnssD6QSaVEAmQjJeW5lnlos2');
	expect(expected).toHaveProperty('age', 42);
	expect(expected).toHaveProperty('children.name', 'isac');
	expect(expected).toHaveProperty('is_cool', true);
	expect(expected).toHaveProperty('title', 'This is the first ever entry in the void CMS');
	expect(expected).toHaveProperty('cars', ['buggati', 'porsche']);
});
