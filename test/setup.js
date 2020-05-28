require('jest-fetch-mock').enableMocks();
global.crypto = {
	getRandomValues(arr) {
		for (const i in arr) {
			arr[i] = i % arr.length;
		}

		return arr;
	}
};
