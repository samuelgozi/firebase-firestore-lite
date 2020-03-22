# Firebase firestore lite (WIP) [![codecov](https://codecov.io/gh/samuelgozi/firebase-firestore-lite/branch/master/graph/badge.svg)](https://codecov.io/gh/samuelgozi/firebase-firestore-lite) ![bundlephobia](https://badgen.net/bundlephobia/minzip/firebase-auth-lite)

This project goal is to provide an alternative library to the official Firestore JS SDK.
The problem with the official library is that it is too heavy ([92kb at the time of writing](https://bundlephobia.com/result?p=@firebase/firestore@1.11.2)),
and if you include the Auth library as well, and `firebase/app`(which you have too), then it could [add up to hundreds
of kilobytes without any app logic](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks#sizes-and-loading-times)...

[Our Alternative SDK performs in average 13 times better and is 27 times smaller than the official ones](https://github.com/samuelgozi/firebase-firestore-lite/wiki/Firebase-Alternative-SDK-Benchmarks).

## What will we give up for a lighter bundle?

Hopefully nothing, but as it seems right now I will leave the "real time" and "offline support" parts for last, and the API might be a bit different.
And the browser support, will be targeting only "evergreen" ones.

## Roadmap

### Internal functionality needed before implementing the rest of the API

- [x] Decode Firebase Documents into JS Objects.
- [x] Encode Firebase Documents from JS Objects.
- [x] Create "DocumentMasks" for changes in retrieved documents.
- [x] Cover all supported types(Except bytes for now)
- [x] Authentication with firebase-auth-lite

### Documents and collections REST API implementation

- [x] [get](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/get) Get a single document.
- [x] [patch](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/patch) Update or insert a document.
- [x] [createDocument](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/createDocument) Create a new document.
- [x] [delete](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/delete) Delete a document.
- [x] [runQuery](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/runQuery) Run a query. (partially implemented, little left)
- [x] [batchGet](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/batchGet) Get multiple documents.
- [ ] [beginTransaction](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/beginTransaction) Start a new transaction.
- [ ] [commit](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/commit) Commit a transaction, while optionally updating documents.
- [x] [list](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/list) List documents.
- [ ] [listCollectionIds](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/listCollectionIds)\* List all the collection IDs underneath a document.
- [ ] [rollback](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/rollback) Rolls back a transaction.
- [ ] [write](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/write) Streams batches of document updates and deletes, in order.

**\* Features with an astrix("\*") require authenticating with permissions to manage Firebase projects, in other words these features are "firebase-admin" features and are currently not a high priority.**

### Indexes REST API implementation

**Note: All Indexes features require authenticating with permissions to manage Firebase projects, in other words these features are "firebase-admin" features and are currently not a high priority.**

- [ ] [create](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.indexes/create)Create a specified index.
- [ ] [delete](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.indexes/delete) Delete an index
- [ ] [get](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.indexes/get) Get an index
- [ ] [list](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.indexes/list) List the indexes that match the specified filters.

### Types support

- [x] null (native)
- [x] boolean (native)
- [x] integer (native)
- [x] double (native)
- [x] timestamp (All JS Dates are auto converted to Timestamps)
- [x] string (native)
- [ ] bytes - **It wont be supported for now**
- [x] reference (Custom class)
- [x] geoPoint (Custom class)
- [x] array (native)
- [x] map (native objects)

### Other

Somewhere in the future I'm planing on implementing out of the box offline support, and realtime updates. But those features are currently not a high priority. The first priority if to provide a fully functional, light weight and versatile API, when we get there well focus on all the other shiny features.

## Getting started

Install this package with NPM/Yarn:

```
npm install firebase-firestore-lite
```

Or

```
yarn add firebase-firestore-lite
```

### Import and initialize an instance

It is possible to use authentication but not neccesary.
First I'll show you how to use it without it:

```js
import Firestore from 'firebase-firestore-lite';

// All you need is the projectId. It can be found on the firebase console and in the firebase config.
const db = new Firestore({ projectId: 'nano-inventory' });
```

Now you can start working with the Firestore database, but of course, only if the firebase permissions allow it.

Most apps don't let everyone access the database. If you want to access the database as an authenticated user it can be done with the ["firebase-auth-lite"](https://github.com/samuelgozi/firebase-auth-lite) package. Here's how:

```js
import Firestore from 'firebase-firestore-lite';
import { AuthFlow } from 'firebase-auth-lite';

// Please read the libraries docs to see how to configure auth.
// Nothing special needs to be done in order for it to work with
// "firebase-firestore-lite" library other than the written below.
const auth = new Auth({
	/* ... */
});
auth.addProvider({ provider: 'google' });

// Now pass the auth instance as well as the projectId.
const db = new Firestore({ projectId: 'nano-inventory', auth });
```

Now you are ready to go with authentication.

### Working with references

In order to work with data on the database, we need to use and understand the "Reference" instance.
A Reference represents a document in the database that we didn't necessarily download, and it doesn't really have to exist.
We can create a reference to a document or a collection that doesn't exist and later create them, and we can also create a reference to a document that exists and delete or update it without reading it.

A reference can point to a document or a collection, and after creating one we will have some methods and properties that will help us manipulate and navigate the data it represents.

Lets create one:

```js
// Reference to a collection
const usersCollection = db.reference('users');

// Reference to a document
const samuel = db.reference('users/samuel');
```

Some times you don't want to write the whole path. You can also get a reference by the using child method or parent prop.

```js
// Get the parent collection/document.
// Returns a reference.
const root = usersCollection.parent; // Now point to the root of the database.

// Or you can get a child collection/document
const daniel = usersCollection.child('daniel'); // Same as doing db.reference('users/daniel');
```

You can also jump right away to the nearest parent collection:

```js
daniel.parentCollection; // Points to "users"
```

If you are not sure whether your reference point to an object or a collection you can always check it with the `isCollection` prop.

```js
daniel.isCollection; // will be false.
```

## Add and manage data

There are two ways to write data to Cloud Firestore:

- Set the data of a document within a collection, explicitly specifying a document identifier.
- Add a new document to a collection. In this case, Cloud Firestore automatically generates the document identifier.

This guide explains how to use the set and update methods in order to manipulate individual documents in Cloud Firestore. If you want to write data in bulk, see Transactions(WIP) and Batched Writes.

### Set a document

Set can be used to either create a new document and/or update one with a known ID, or create a new document with a generated ID.

To update or create a document with a known identifier just create a reference that points to it(even if it doesn't exist):

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

If the document does not exist, it will be created. If the document does exist, its contents will be overwritten with the newly provided data. If you with to merge the data with the existing, use the "update" methods instead.

### Update a document

The update method works the same as the set one with one difference, it will merge instead of overwrite the data if the document already exists.

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

## API Reference

The API will be changing before version 1.0, so it won't always be up-to-date, so if something doesn't work, feel free to open an issue.
https://github.com/samuelgozi/firebase-firestore-lite/wiki

## Contributing

I very much welcome any contribution. Grammar issues, docs, examples, features requests, and code. Please feel free to open an issue and ask anything.
