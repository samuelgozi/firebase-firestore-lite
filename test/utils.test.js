import { isRawDocument } from '../src/utils.js';

describe('Utils', () => {
	describe('isRawDocument', () => {
		test('Returns true for a valid document', () => {
			const raw = {
				name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
				fields: {},
				createTime: '2014-10-02T15:01:23.045123456Z',
				updateTime: '2014-10-02T15:01:23.045123456Z'
			};

			const obj = {
				test: 'testing...',
				other: 'prop'
			};

			expect(isRawDocument(raw)).toEqual(true);
			expect(isRawDocument(obj)).toEqual(false);
		});

		test('Returns false when a document has missing props', () => {
			const missingName = {
				fields: {},
				createTime: '2014-10-02T15:01:23.045123456Z',
				updateTime: '2014-10-02T15:01:23.045123456Z'
			};

			const missingCreate = {
				name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
				fields: {},
				updateTime: '2014-10-02T15:01:23.045123456Z'
			};

			const missingUpdate = {
				name: 'projects/{project_id}/databases/{database_id}/documents/{document_path}.',
				fields: {},
				createTime: '2014-10-02T15:01:23.045123456Z'
			};

			expect(isRawDocument(missingName)).toEqual(false);
			expect(isRawDocument(missingCreate)).toEqual(false);
			expect(isRawDocument(missingUpdate)).toEqual(false);
		});
	});
});
