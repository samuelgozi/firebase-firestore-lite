/*
 * This file is used for development, please do not commit changes to it.
 */
/*eslint no-console: 0*/
import Database from '../src/index.js';
import Auth from 'firebase-auth-lite';
import config from '../config';

const auth = new Auth(config);
const logInPromise = auth.signIn('test@test.com', '123456');
const db = new Database({ config, auth });

logInPromise.then(() => {
	/*
	 * Run a query against the database.
	 */
	db.delete('entries');
});
