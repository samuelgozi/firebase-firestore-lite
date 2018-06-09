import Database from '../src/index.js';
import Auth from 'firebase-auth-lite';
import config from '../config';

/*
 * In order to test this package you need to create a config.js file in the root folder
 * that exports a firebase web configuration object with the apiKey and projectId.
 * export default {
 *	apiKey: '[API KEY]',
 *	projectId: '[PROJECT ID]',
 *	};
 *
 * Also you need to have a username with the email: test@test.com
 * And a password: 123456
 *
 * This will be required untill i have time to mock the API.
 */

/*
 * An instance of auth is required for the database API.
 */
const auth = new Auth(config);
const logInPromise = auth.signIn('test@test.com', '123456');

/*
 * Initilize the database API.
 */
const db = new Database({ config, auth });

test('Get', () => {
	expect.assertions(1);

	return logInPromise.then(() => {
		return db.get('entries').then(entries => {
			expect(entries).toContainObject({$name: 'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6'});
		});
	});
});

// test('Add', () => {
// 	expect.assertions(1);

// 	return logInPromise.then(() => {
// 		return db.add('entries', {
// 			hi: 'My Name is',
// 			name: 'Slim Shady',
// 			subObj: {testing: 'should work!'},
// 			arr: ['hi', 'there!', 11, 1.1]
// 		});
// 	});
// });
