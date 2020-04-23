import Transform from '../src/Transform.js';

describe('Transform', () => {
	test('Invalid transform names', () => {
		expect(() => {
			new Transform('serversTimestamp');
		}).toThrow('Invalid transform name: "serversTimestamp"');

		expect(() => {
			new Transform('test');
		}).toThrow('Invalid transform name: "test"');
	});

	test('serverTimestamp', () => {
		const given = JSON.stringify(new Transform('serverTimestamp'));
		const expected = JSON.stringify({ setToServerValue: 'REQUEST_TIME' });

		expect(given).toEqual(expected);
	});

	describe('increment', () => {
		test('Valid arguments', () => {
			const given = JSON.stringify(new Transform('increment', 1));
			const expected = JSON.stringify({
				increment: {
					integerValue: '1'
				}
			});

			expect(given).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Transform('increment', '1');
			}).toThrow('The value for the transform "increment" needs to be a number.');

			expect(() => {
				new Transform('increment', {});
			}).toThrow('The value for the transform "increment" needs to be a number.');

			expect(() => {
				new Transform('increment', []);
			}).toThrow('The value for the transform "increment" needs to be a number.');
		});
	});

	describe('max', () => {
		test('Valid arguments', () => {
			const given = JSON.stringify(new Transform('max', 99));
			const expected = JSON.stringify({
				maximum: {
					integerValue: '99'
				}
			});

			expect(given).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Transform('max', '1');
			}).toThrow('The value for the transform "max" needs to be a number.');

			expect(() => {
				new Transform('max', {});
			}).toThrow('The value for the transform "max" needs to be a number.');

			expect(() => {
				new Transform('max', []);
			}).toThrow('The value for the transform "max" needs to be a number.');
		});
	});

	describe('min', () => {
		test('Valid arguments', () => {
			const given = JSON.stringify(new Transform('min', 99));
			const expected = JSON.stringify({
				minimum: {
					integerValue: '99'
				}
			});

			expect(given).toEqual(expected);
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Transform('min', '1');
			}).toThrow('The value for the transform "min" needs to be a number.');

			expect(() => {
				new Transform('min', {});
			}).toThrow('The value for the transform "min" needs to be a number.');

			expect(() => {
				new Transform('min', []);
			}).toThrow('The value for the transform "min" needs to be a number.');
		});
	});

	describe('appendToArray', () => {
		describe('Valid Arguments', () => {
			test('Array with items', () => {
				const given = JSON.stringify(new Transform('appendToArray', [1, 2, 3]));
				const expected = JSON.stringify({
					appendMissingElements: {
						values: [
							{
								integerValue: '1'
							},
							{
								integerValue: '2'
							},
							{
								integerValue: '3'
							}
						]
					}
				});

				expect(given).toEqual(expected);
			});

			test('Empty array', () => {
				const given = JSON.stringify(new Transform('appendToArray', []));
				const expected = JSON.stringify({
					appendMissingElements: {}
				});

				expect(given).toEqual(expected);
			});
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Transform('appendToArray', '1');
			}).toThrow('The value for the transform "appendToArray" needs to be an array');

			expect(() => {
				new Transform('appendToArray', 42);
			}).toThrow('The value for the transform "appendToArray" needs to be an array');

			expect(() => {
				new Transform('appendToArray', {});
			}).toThrow('The value for the transform "appendToArray" needs to be an array');
		});
	});

	describe('removeFromArray', () => {
		describe('Valid Arguments', () => {
			test('Array with items', () => {
				const given = JSON.stringify(new Transform('removeFromArray', [1, 2, 3]));
				const expected = JSON.stringify({
					removeAllFromArray: {
						values: [
							{
								integerValue: '1'
							},
							{
								integerValue: '2'
							},
							{
								integerValue: '3'
							}
						]
					}
				});

				expect(given).toEqual(expected);
			});

			test('Empty array', () => {
				const given = JSON.stringify(new Transform('removeFromArray', []));
				const expected = JSON.stringify({
					removeAllFromArray: {}
				});

				expect(given).toEqual(expected);
			});
		});

		test('Invalid arguments', () => {
			expect(() => {
				new Transform('removeFromArray', '1');
			}).toThrow('The value for the transform "removeFromArray" needs to be an array');

			expect(() => {
				new Transform('removeFromArray', 42);
			}).toThrow('The value for the transform "removeFromArray" needs to be an array');

			expect(() => {
				new Transform('removeFromArray', {});
			}).toThrow('The value for the transform "removeFromArray" needs to be an array');
		});
	});
});
