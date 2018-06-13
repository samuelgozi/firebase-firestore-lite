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
 * This will be required until i have time to mock the API.
 */

/*
 * An instance of auth is required for the database API.
 */
const auth = new Auth(config);
const logInPromise = auth.signIn('test@test.com', '123456');

/*
 * Initialized the database API.
 */
const db = new Database({ config, auth });

test('Get single document', () => {
	expect.assertions(1);

	return logInPromise.then(() => {
		return db.get('entries/B56uA12AqrrY5NWkiXj6').then(doc => {
			expect(doc).toHaveProperty(
				'__meta__.name',
				'projects/void-cms/databases/(default)/documents/entries/B56uA12AqrrY5NWkiXj6'
			);
		});
	});
});
