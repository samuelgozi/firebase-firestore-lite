<p align="center">
<img src="https://raw.githubusercontent.com/samuelgozi/firebase-firestore-lite/master/logo.png" alt="logo" width="400"/>

[![codecov](https://codecov.io/gh/samuelgozi/firebase-firestore-lite/branch/master/graph/badge.svg)](https://codecov.io/gh/samuelgozi/firebase-firestore-lite) ![bundlephobia](https://badgen.net/bundlephobia/minzip/firebase-auth-lite)

</p>

This project goal is to provide an alternative library to the official Firestore JS SDK.
The problem with the official library is that it is too heavy ([92kb at the time of writing](https://bundlephobia.com/result?p=@firebase/firestore@1.11.2)),
and if you include the Auth library as well, and `firebase/app`(which you have to), then it could [add up to hundreds
of kilobytes without any app logic](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks#sizes-and-loading-times).

[Our Alternative SDK performs in average 13 times better and is 27 times smaller than the official ones](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks).

## What am I giving up by using this?

No realtime support (yet*) and no out of the box offline support*. You should also transpile and polyfill the code yourself for your target browsers. I don't try to support old browsers (ehm... IE), but it is possible and was done by some of the community.

\* Realtime is planned, but will take some time because of lack of documentation on how the API works.

\* Offline support will be available in the future, but probably as a third-party addition, and is currently not a high priority.

## API Reference

You can access the full API Reference here: https://samuelgozi.github.io/firebase-firestore-lite/

## Getting started

### NPM

Install this package with NPM/Yarn:

```bash
npm install firebase-firestore-lite

# or

yarn add firebase-firestore-lite
```

## Create a Database instance

It is possible to use authentication but not necessary.
First I'll show you how to use it without it:

```js
import { Database } from 'firebase-firestore-lite';

// All you need is the projectId. It can be found on the firebase console and in the firebase config.
const db = new Database({ projectId: 'sandbox' });
```

Now you can start working with the database.

Most apps apply some kind of user-based restrictions. If you want to access the database as an authenticated user it can be done with the ["firebase-auth-lite"](https://github.com/samuelgozi/firebase-auth-lite) library. Here's how:

```js
import { Database } from 'firebase-firestore-lite';
import Auth from 'firebase-auth-lite';

// Please read the docs on Auth library for further instructions on all the Auth features.
const auth = new Auth({
	apiKey: '[The Firebase API key]'
});

// Now pass the auth instance as well as the projectId.
const db = new Database({ projectId: 'sandbox', auth });
```

The firestore instance will now make all the requests with the authenticates user's credentials.

## Working with references

References point to specific documents or collections in a database. A reference doesn't really know anything about the data itself, in fact, you can and will use references with documents that don't even exist.

A Reference is just a helper class that encapsulates some helpful methods that are designed to save us (the devs) some time. But in their essence, they are just a fancy abstraction over paths.

Let's create one:

```js
// Reference to a collection
const usersCollection = db.ref('users');

// Reference to a document
const samuel = db.ref('users/samuel');
```

`usersCollection` points to a collection. The way we know it is because of the path. The path is `users` and we know that the root of the database only has collections. So, it is the same as writing `/users`.

`samuel` points to a document because the path we used to create it was a path to a document.

We can also create a reference to the root of the database:

```js
const root = db.ref('/');

// Or

const root = db.ref('');
```

### Reference's props and methods

A reference has some helpful instance methods and properties.
Please read more about them in the [API Reference](https://github.com/samuelgozi/firebase-auth-lite).

## Add and manage data

There are multiple ways to manipulate data in Firestore:

- Directly getting, adding, updating or deleting by using a `Reference`.
- Getting all documents within a collection.
- `batchGet` to retrieve a list of documents.
- `Transaction` to either batch write or read and write at the same time.

### Get a document

You can use `get` to fetch a single document from the database.

```js
const ref = db.ref('users/samuel');
const doc = await ref.get(); // Returns an instance of Document
```

### Get all the documents in a collection

You can use `list` to fetch a all the documents in a collection.
Be mindful that this request is expensive in terms of bandwidth and writes.

```js
const ref = db.ref('users');
const doc = await ref.list(); // Returns an instance of List
```

### Add a document

This method is only accessible through collection references. It will create a document with a randomly generated name.

```js
// Create a reference to the collection to which the new document will be added
const ref = db.ref('users');

// Creates the new document with the provided data, and if successful it will return a Reference it.
const newRef = await ref.add({
	email: 'samuel@example.com'
});

console.log(newRef.id); // q9YUI8CQWa1KEYgZTK6t
```

### Set a document

Set can be used to create/update a document with a known ID.

If the document does not exist, it will be created. If the document does exist, its contents will be overwritten with the newly provided data. If you want to merge the data instead, use the "update" (below) method.

```js
const ref = db.ref('users/samuel');

await ref.set({
	email: 'samuel@example.com'
});
```

### Update a document

The `update` method will merge the data passed to it with the data of the document in the database and the write will fail if the document doesn't exist.

```js
await ref.update({
	profession: 'web-dev'
});
```

### Delete a document

This will delete the document from the database.

```js
ref.delete(); // Returns a promise that resolves if deleted successfully.
```

Just like that, it's gone.

## Batch reads

It is possible to get multiple documents with one request by using the `db.batchGet` method.

The `batchGet` method can receives an array of References (of documents) or if you prefer you can just pass the paths.

```js
// Using an array of references:
const doc1 = db.ref('col/doc1');
const doc2 = db.ref('col/doc2');
const doc3 = db.ref('col/doc3');

const docs = await db.batchGet([doc1, doc2, doc3]);
const sameDocs = await db.batchGet(['col/doc1', 'col/doc2', 'col/doc3']);
```

As you can see, using document paths instead of references is much cleaner, and it also performs a tiny bit better.

This method will return an array of `Document` instances.

## Transactions and batch writes

Transactions allow us to perform batch reads, or reads and writes. All of the operations done as a part of a transaction are atomic; Either all of them succeed, or none of them are applied.

They are subject to the [Quotas and Limits of Firestore](https://firebase.google.com/docs/firestore/quotas#writes_and_transactions), so make sure you read them.

Let's start with a batch write. First, we create a transaction:

```js
const tx = db.transaction();
```

Now `tx` holds a `Transaction` instance. The instance has four methods that help us describe operations:

- `add` Add a document with a randomly generated id to a collection.
- `set` Add or overwrite a document.
- `update` Update (merge) data of an existing document.
- `delete` Delete a document.

These methods do not make any network requests yet. They are just helpers to describe the operations to be done as part of this transaction. In order to commit those changes, we use the `commit` method. Now let's describe the transaction, and then commit it:

```js
// Add a new document with a random id
tx.add('users', { name: 'random', email: 'random@example.com' });
// Create a new document or overwrite an existing one.
tx.set('users/samuel', { name: 'samuel', email: 'samuel@example.com' });
// Update an existing document.
tx.update('users/daniel', { email: 'newEmail@example.com' });
// Delete a document.
tx.delete('users/george');

// Now let's commit them. This one is asynchronous and does
// indeed make the request.
try {
	await tx.commit();
} catch (e) {
	// Handle the failed transaction.
}
```

### Read and write in a transaction

A transaction is very powerful because you can use it to perform operations that depend on the current data of a document. Sometimes it is necessary to have a guarantee that we are working with the latest data. Using reads within a transaction can help us accomplish that.

Introducing the `get` method. It works exactly as a `batchGet`, and that makes it different than the other `Transaction` methods because it is asynchronous.

When using the `get` method inside a transaction we make sure that any write operation on a document returned from it will be atomic. So, if the data in that document changed concurrently, and the one we have is no longer up-to-date, the whole transaction will fail.

Here is how you can use it:

```js
const tx = db.transaction();
const [doc1, doc2, doc3] = await tx.get(['col/doc1', 'col/doc2', 'col/doc3']);

// Work and change the data.

tx.set('col/doc1', doc1);
tx.update('col/doc2', doc2);
tx.delete('col/doc3', doc3);

// Lastly, commit.
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
It receives a function as its first argument, and the number of attempts as the second argument (defaults to 5).

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

## Queries

Queries are done by using the `query` method of a reference instance. The query will search through the children of document/collection.

let's look at an example:

```js
const users = db.ref('users');
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

The `users.query()` method optionally accepts an options object, and then returns a new Query instance. All the options can also be set by using the query methods, and they can also be chained (as seen in the second example). You can then `run()` the query:

```js
const results = await usersQuery.run(); // Will return the query results.
```

All the query options can be seen in the [API reference for Query](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Query-instance#queryoptions--object), bet here is a quick recap of the important ones:

- `select` Array of field paths to be returned, when empty will return the whole document.
- `where` Comparative operations for filtering the query.
- `from` Set by default for your current collection of the reference.
- `orderBy` The field and direction to order by.
- `startAt` A Document instance to start the query from.
- `endAt` A Document instance at which to end the query.
- `offset` Number of results to skip
- `limit` The maximum number of documents to return.

## Collection Group Queries

Sometimes you want to query all collections with a certain name.
Lets say for example that you have a collection called `users` which contains the users of your app.
Each user document inside of that collection has a child collection called `posts`, at it contains all of the posts that user has published.

What if I want to make a query that will search all the posts regardless of which user created it?
Well, in order to do that you will want to query a "Collection Group", and this is done from the `Database` instance:

```js
const query = db.collectionGroup('posts');
```

This will return a query that will be performed on all collections called `posts`.

But what if we want to narrow the scope of the query? For example, lets say that we have a `sections` collection,
with the _documents_ `movies` and `songs`, which represent different type of content. Each one of them has a `posts` collection with `post` documents, and each of these has a `comments` collection with the comments on each `post`.

If we only want to query the `comments` collection that are children of the `songs` _document_ we can do that by using one of the options of the `collectionGroup` method:

```js
const songsDoc = db.ref('sections/songs');
const query = db.collectionGroup('comments', { parent: songsDoc });
```

The returned query will not include documents of the `comments` collection that are children of the `movies` document.
_NOTE:_ The parent has to be a document, you will need to organize your data accordingly.

## Firestore emulator

In order to configure the library to work with the Firestore emulator we need to change two settings when creating the Database instance.

- `host` set it to `localhost:8080` to work with the official emulator.
- `ssl` set to false.

This is how it would look:

```js
const db = new Database({
	projectId: 'sandbox',
	host: 'localhost:8080',
	ssl: false
});
```

## Contributing

I very much welcome any contribution. Grammar issues, docs, examples, features requests, and code. But please open an issue before so that you don't work on anything that someone else is.
