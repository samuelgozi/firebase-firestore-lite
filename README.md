# Firebase firestore lite [![codecov](https://codecov.io/gh/samuelgozi/firebase-firestore-lite/branch/master/graph/badge.svg)](https://codecov.io/gh/samuelgozi/firebase-firestore-lite) ![bundlephobia](https://badgen.net/bundlephobia/minzip/firebase-auth-lite)

This project goal is to provide an alternative library to the official Firestore JS SDK.
The problem with the official library is that it is too heavy ([92kb at the time of writing](https://bundlephobia.com/result?p=@firebase/firestore@1.11.2)),
and if you include the Auth library as well, and `firebase/app`(which you have too), then it could [add up to hundreds
of kilobytes without any app logic](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks#sizes-and-loading-times)...

[Our Alternative SDK performs in average 13 times better and is 27 times smaller than the official ones](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks).

## What am I giving up by using this?

All database operations are available except realtime updates(read below why) and we don't provide offline support out of the box. In addition, its important to understand that old browser support is not one of my goals with this library, so you might need to transpile and provide polyfills on your own.

I do plan to support Realtime and offline in the future. The reason its not yet implemented is because currently that API is not exposed by firebase unless I use gRPC, and i don't want to because it will add at least 10KB(more than twice this library).
I am considering all possibilities, and I issued a feature request for this multiple times to the firebase team, but if they won't budge, than ill find a workaround.

## Roadmap / Features list

- [x] Run queries.
- [x] Batch Get.
- [x] Batch Write(by using transactions).
- [x] Transactions.
- [x] Read, add, update and delete documents.
- [x] Read all documents in a collection.
- [x] Atomic operations on document level(Transforms).
- [ ] Real time **\***
- [ ] Offline support **\***

**\*** = Will start work on this once the rest of the API is stable.

## Getting started

### NPM

Install this package with NPM/Yarn:

```
npm install firebase-firestore-lite
# or
yarn add firebase-firestore-lite
```

### Deno

For deno just replace the import URLs with:

```js
import { Database } from 'https://denopkg.com/samuelgozi/firebase-firestore-lite';
```

## Initialize an instance

It is possible to use authentication but not necessary.
First I'll show you how to use it without it:

```js
import { Database } from 'firebase-firestore-lite';

// All you need is the projectId. It can be found on the firebase console and in the firebase config.
const db = new Database({ projectId: 'sandbox' });
```

Now you can start working with the database.

Most apps apply some kind of user based restrictions. If you want to access the database as an authenticated user it can be done with the ["firebase-auth-lite"](https://github.com/samuelgozi/firebase-auth-lite) library. Here's how:

```js
import { Database } from 'firebase-firestore-lite';
import Auth from 'firebase-auth-lite';

// Please read the docs of the Auth library for further instructions
// of all of the Auth features.
const auth = new Auth({
	apiKey: '[The Firebase API key]'
});

// Now pass the auth instance as well as the projectId.
const db = new Database({ projectId: 'sandbox', auth });
```

The firestore instance will now make all of the requests with the authenticates user's credentials.

## Working with references

References point to specific documents or collections in a database. A reference doesn't really know anything about the data itself, In fact, you can and will use references with documents that don't even exist.

A Reference is just a helper class that encapsulates some helpful methods that are designed to save us(the devs) some time. But in their essence they are just a fancy abstraction over paths.

Lets create one:

```js
// Reference to a collection
const usersCollection = db.reference('users');

// Reference to a document
const samuel = db.reference('users/samuel');
```

`usersCollection` points to a collection. The way we know it is because of the path. The path is `users` and we know that the root of the database only has collections. So it is the same as writing `/users`.

`samuel` points to a document because the path we used to create it was a path to a document.

BTW, We can also create a reference to the root of the database(which technically is a document):

```js
const root = db.reference('/');

// Or

const root = db.reference('');
```

A reference has some helpful instance methods and properties.
Please read more about them in the API reference.

## Add and manage data

There are a variety of ways to manipulate data in Firestore:

- Directly getting, adding, updating or deleting by using a `Reference`.
- Getting all documents within a collection by using a `Reference`(to a collection).
- `batchGet` to retrieve a list of documents.
- `Transaction` to either batch write, or read and write at the same time.

### Set a document

Set can be used to create/update a document with a known ID, or create a new document with a generated ID.

To create/update a document with a known id just create a reference that points to it(even if it doesn't exist):

```js
// Create a reference to the document named "samuel" inside the collection "users".
const ref = db.reference('users/samuel');

// Set its data(if it doesn't exist, it will be created).
// Will return an instance of Document containing all of the
// data of the updated/created document.
const doc = await ref.set({
	email: 'samuel@example.com'
});
```

If the document does not exist, it will be created. If the document does exist, its contents will be overwritten with the newly provided data. If you want to merge the data with the existing, use the
"update" methods instead.

To add a new document with a generated ID, you need to call the `set` method on a reference that points to a collection:

```js
// Create a reference the collection in which we want the new document.
const ref = db.reference('users');

// A new document will be created with a database generated ID.
const doc = await ref.set({
	email: 'samuel@example.com'
});

// The operation will return the new document with its ID.
```

### Update a document

The `update` method works the same as `set` except it will merge instead of overwrite the data if the document already exists.

For example, if we want to add the "samuel" username a new prop without deleting the existing ones we can do it with the "update" method:

```js
const doc = await ref.update({
	profession: 'web-dev'
});

console.log(doc);
// Will log:
// {
//    email: 'samuel@example.com',
//    profession: 'web-dev'
// }
```

### Delete a document

Deleting a document is pretty straight forward:

```js
ref.delete(); // Returns a promise that resolves if deleted successfully.
```

Just like that, its gone.

## Batch reads

It is possible to get multiple documents with one request by using the `db.batchGet` method.

The `batchGet` method can receives an array of document references, or if you prefer you can just pass document paths.

```js
// Using an array of references:
const doc1 = db.reference('col/doc1');
const doc2 = db.reference('col/doc2');
const doc3 = db.reference('col/doc3');

db.batchGet([doc1, doc2, doc3]);

// Using an array of document paths:
db.batchGet(['col/doc1', 'col/doc2', 'col/doc3']);
```

As you can see, using document paths instead of references is much cleaner, and it also performs a little bit better since you don't have to create Reference instances just for a single use.

This method will return an array of `Document` instances.

## Transactions and batch writes

Transactions allow us to perform batch reads, or reads and writes. All of the operations done as a part of a transaction are atomic; Either all of them succeed, or none of them are applied.

Transactions are subject to the [Quotas and Limits of Firestore](https://firebase.google.com/docs/firestore/quotas#writes_and_transactions), so make sure you read them.

Lets start with a batch write. First we create a transaction:

```js
const tx = db.transaction();
```

Now `tx` holds a `Transaction` instance. The instance has three methods that help us describe operations:

- `set` - Add or overwrite a document.
- `update` - Update(merge) data of an existing document.
- `delete` - Delete a document.

These methods do not make any network requests yet. They are just helpers to describe the operations to be done as part of this transaction. In order to commit this changes we use the `commit` method. Now lets describe the transaction, and then commit it:

```js
// Create a new document or overwrite an existing one.
tx.set('users/samuel', { name: 'samuel', email: 'samuel@example.com' });
// Update an existing document.
tx.update('users/daniel', { email: 'newEmail@example.com' });
// Delete a document.
tx.delete('users/george');

// Now lets commit them. This one is asynchronous and does
// indeed make the request.
try {
	await tx.commit();
} catch (e) {
	// Handle the failed transaction.
}
```

## Queries

Queries are done by using the `query` method of a reference instance. The query will search through the children of document/collection.

lets look at an example:

```js
const users = db.reference('users');

const usersQuery = users.query({
	where: [['age', '=>', 21]], // Array of query operations.
	orderBy: 'age', // Can also be an object { field: 'age', direction: 'asc'|'desc' }
	limit: 10 // The max results
});

// The above will be identical to
const usersQuery = users
	.query()
	.where('age', '=>', 21)
	.orderBy('age')
	.limit(10);
```

The `users.query()` method optionally accepts an options object, and then returns a new Query instance. All of the options can also be set by using the query methods, and they can also be chained(as seen in the second example). You can then `run()` the query:

```js
const results = await usersQuery.run(); // Will return the query results.
```

All the query options can be seen in the [API reference for Query](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Query-instance#queryoptions--object), bet here is a quick recap of the important ones:

- `select` Array of field paths to be returned, if left empty will return the whole document.
- `where` Comparative operations for filtering the query.
- `from` Set by default for you to eb the current collection of the reference.
- `orderBy` The field and direction to order by.
- `startAt` A reference to a specific document from which to start the query.
- `endAt` A reference to a specific document at which to end the query.
- `offset` Number of results to skip
- `limit` The maximum number of documents to return.

### Read and write in a transaction

A transaction is very powerful because you can use it to perform operations that depend on the current data of a document. Sometimes it is necessary to have a guarantee that we are working with the latest data. Using reads within a transaction can help us accomplish that.

Introducing the `get` method. It works exactly as a `batchGet`, and that makes it different than the other `Transaction` methods because it is asynchronous.

When using the `get` method inside a transaction we make sure that any write operation on a document returned from it will be atomic. So if the data in that document changed concurrently, and the one we have is no longer up-to-date, the whole transaction will fail.

Here is how you can use it:

```js
const tx = db.transaction();
const [doc1, doc2, doc3] = await tx.get(['col/doc1', 'col/doc2', 'col/doc3']);

// Work and change the data.

tx.set('col/doc1', doc1);
tx.update('col/doc2', doc2);
tx.delete('col/doc3', doc3);

// Lastly commit
await commit();
```

If you end up using the same Document instances returned from the
`tx.get` method, then there is no need to pass the document path
again and again when describing an operations. You can omit the path
and just pass the Document instance instead:

```js
// Instead of
tx.set('col/doc1', doc1);
tx.update('col/doc2', doc2);
tx.delete('col/doc3', doc3);

// Do
tx.set(doc1);
tx.update(doc2);
tx.delete(doc3);
```

But remember, this works only if you pass the same document instance returned from the `tx.get()` method. If you end up generating a new object, then you have to pass the path to it.

### The `runTransaction` method

There is a cleaner way to make a transaction with writes, and can also help you retry the transaction when failed.

The `db.runTransaction()` method can help you keep things cleaner.
It receives a function as its first argument, and the number of attempts as the second argument(defaults to 5).

It will commit and retry the function for you if the transaction fails because the data changed, but it will throw immediately if the code failed due to any other reason.

Here is how you can use it:

```js
function updateFunction(tx) {
	const [doc1, doc2, doc3] = tx.get([ ... ]);

	// Manipulate the data.
	doc1.title = 'new title';
	// ...

	tx.update('col/doc1', doc1);
}

// Will resolve if and when the transaction is done.
// Will try up to 10 times.
await db.runTransaction(updateFunction, 10);
```

## Firestore emulator

In order to configure the library to work with the Firestore emulator we need to change two settings when creating the Database instance.

- `host` set it to `localhost:8080` to work with the official emulator.
- `ssl` set to false.

This is how it would look:

```js
const auth = new Auth({
	apiKey: '[The Firebase API key]',
	host: 'localhost:8080',
	ssl: false
});
```

## API Reference

The API will be changing up until version 1.0, so it won't always be up-to-date. If something is off, feel free to open an issue.
https://github.com/samuelgozi/firebase-firestore-lite/wiki

## Contributing

I very much welcome any contribution. Grammar issues, docs, examples, features requests, and code. But please open an issue before so that you don't work on anything that someone else is.
