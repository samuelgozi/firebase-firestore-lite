import Document from '../src/Document';

/*
 * Testing instances created from plain objects.
 */
test('Document class instance created from a plain object', () => {
	const expected = new Document({
		name: 'Israel',
		age: 24,
		siblings: ['Json', 'Jsona'],
		address: {
			street: 'Infinity Loop',
			number: 1
		}
	});

	// Copies the properties into the root of the instance
	expect(expected).toHaveProperty('name', 'Israel');
	expect(expected).toHaveProperty('age', 24);
	expect(expected).toHaveProperty('siblings', ['Json', 'Jsona']);
	expect(expected).toHaveProperty('address.street', 'Infinity Loop');
	expect(expected).toHaveProperty('address.number', 1);

	// An empty object is set as the reference
	expect(expected).toHaveProperty('__reference__', {});

	// No meta is set
	expect(expected).not.toHaveProperty('__meta__');
});

test('Converts Document Instance to a valid firestore document with correct types', () => {
	const obj = {
		hi: 'My Name is',
		life: 42,
		int: 4.2,
		subObj: { testing: 'should work!' },
		arr: ['hi', 42]
	};

	const expected = Document.compose(new Document(obj));

	expect(expected).toHaveProperty('fields.hi.stringValue', 'My Name is');
	expect(expected).toHaveProperty('fields.life.integerValue', 42);
	expect(expected).toHaveProperty('fields.int.doubleValue', 4.2);
	expect(expected).toHaveProperty('fields.arr.arrayValue.values', [
		{ stringValue: 'hi' },
		{ integerValue: 42 }
	]);
	expect(expected).toHaveProperty(
		'fields.subObj.mapValue.fields.testing.stringValue',
		'should work!'
	);
});

test('Correctly parses and instantiates a firestore document from a REST response', () => {
	const doc = {
		name:
			'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6',
		fields: {
			author: {
				stringValue: 'pWAmnssD6QSaVEAmQjJeW5lnlos2'
			},
			age: {
				integerValue: '42'
			},
			children: {
				mapValue: {
					fields: {
						name: {
							stringValue: 'isac'
						}
					}
				}
			},
			body: {
				stringValue: 'This is the first ever body/content in the CMS'
			},
			is_cool: {
				booleanValue: true
			},
			title: {
				stringValue: 'This is the first ever entry in the void CMS'
			},
			cars: {
				arrayValue: {
					values: [
						{
							stringValue: 'buggati'
						},
						{
							stringValue: 'porsche'
						}
					]
				}
			}
		},
		createTime: '2018-06-03T08:49:25.025687Z',
		updateTime: '2018-06-06T20:03:56.437363Z'
	};

	const expected = new Document(doc);

	expect(expected).toHaveProperty(
		'__meta__.name',
		'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6'
	);
	expect(expected).toHaveProperty(
		'__meta__.createTime',
		new Date('2018-06-03T08:49:25.025687Z')
	);
	expect(expected).toHaveProperty(
		'__meta__.updateTime',
		new Date('2018-06-06T20:03:56.437363Z')
	);
	expect(expected).toHaveProperty('author', 'pWAmnssD6QSaVEAmQjJeW5lnlos2');
	expect(expected).toHaveProperty('age', 42);
	expect(expected).toHaveProperty('children.name', 'isac');
	expect(expected).toHaveProperty('is_cool', true);
	expect(expected).toHaveProperty(
		'title',
		'This is the first ever entry in the void CMS'
	);
	expect(expected).toHaveProperty('cars', ['buggati', 'porsche']);
});

test('The mask method shows all the fields on locally created documents', () => {
	const car = new Document({
		manufacturer: 'Bugatti Automobiles S.A.S',
		model: 'Veyron EB 16.4',
		horsePower: 1200,
		dimensions: {
			wheelbase: 2710,
			length: 4462
		}
	});

	// Change it a bit.
	car.model = 'Chiron';
	car.horsePower = 1479;

	const modifiedProps = Document.diff(car);
	const expected = Document.mask(modifiedProps);

	expect(expected).toEqual([
		'manufacturer',
		'model',
		'horsePower',
		'dimensions.wheelbase',
		'dimensions.length'
	]);
});

test('The mask method includes only changed fields when the Document is linked to an existing one.', () => {
	const car = new Document({
		name:
			'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6',
		fields: {
			manufacturer: {
				stringValue: 'Bugatti Automobiles S.A.S'
			},
			model: {
				stringValue: 'Veyron EB 16.4'
			},
			horsePower: {
				integerValue: '1200'
			},
			dimensions: {
				mapValue: {
					fields: {
						wheelbase: {
							integerValue: '2710'
						},
						length: {
							integerValue: '4462'
						}
					}
				}
			}
		},
		createTime: '2018-06-03T08:49:25.025687Z',
		updateTime: '2018-06-06T20:03:56.437363Z'
	});

	// Change it a bit.
	car.model = 'Chiron';
	car.horsePower = 1479;
	car.dimensions.length = 4400;
	car.newprop = ['cool'];

	const modifiedProps = Document.diff(car);
	const expected = Document.mask(modifiedProps);

	expect(expected).toEqual([
		'model',
		'horsePower',
		'dimensions.length',
		'newprop'
	]);
});
