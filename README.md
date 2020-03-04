# Firebase Cloud Firestore lite (currently being built)

This project goal is to provide an alternative library to the official Firestore JS SDK.
The problem with the official library is that it is too heavy (30kb at the time of the writing),
and if you include the Auth library as well, and firebase.app(which you have too), then it could add up to hundreds
of kilobytes without any app logic...

## What will we give up for a lighter bundle?

Hopefully nothing, but as it seems right now I will leave the "real time" part for last, and the API might be a bit different.
About browser support, I'm thinking about targeting only "evergreen" ones, but im not sure about that yet.

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

You don't have to use authentication in order to use this library.
First I'll show you how to use it without it:

```js
import Firestore from 'firebase-firestore-lite';

// All you need is the projectId. It can be found on the firebase console and in the firebase config.
const db = new Firestore({ projectId: 'nano-inventory' });
```

Now you can start working with the Firestore database, but of course, only if the firebase permissions allow it.

Most apps don't let anyone access the database. If you want to access the database as an authenticated user it can be done with the ["firebase-auth-lite"](https://github.com/samuelgozi/firebase-auth-lite) package. Here's how:

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

# API

The API reference can be found in the wiki of this repo.

The API consists of two classes. The first one is the "Firestore" and the second one is "Reference". They both have instance methods, and between them there is most of what you need to know.

In addition to those classes, there are the "custom types" which are classes that represent types of the database that don't exist on JS natively.

And lastly there are "Helper types" which are classes that represent results from the database, and are there to help you navigate query results etc.

Don't worry, there is not much to learn, and most of it is pretty intuitive anyways.

# Contributing

I very much welcome any contribution. Grammar issues, docs, examples, features requests, and code. Please feel free to open an issue and ask anything.
