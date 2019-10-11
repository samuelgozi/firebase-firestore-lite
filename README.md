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

### Documents and collections REST API implementation

- [x] [get](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/get) Get a single document.
- [x] [patch](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/patch) Update or insert a document.
- [x] [createDocument](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/createDocument) Create a new document.
- [x] [delete](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/delete) Delete a document.
- [x] [runQuery](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/runQuery) Run a query. (partially implemented, little left)
- [ ] [batchGet](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/batchGet) Get multiple documents.
- [ ] [beginTransaction](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/beginTransaction) Start a new transaction.
- [ ] [commit](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/commit) Commit a transaction, while optionally updating documents.
- [ ] [list](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/list) List documents.
- [ ] [listCollectionIds](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/listCollectionIds) List all the collection IDs underneath a document.
- [ ] [rollback](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/rollback) Rolls back a transaction.
- [ ] [write](https://firebase.google.com/docs/firestore/reference/rest/v1beta1/projects.databases.documents/write) Streams batches of document updates and deletes, in order.

### Indexes REST API implementation

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
