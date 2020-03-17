export default class GeoPoint {
	constructor(lat, lon) {
		if (typeof lat !== 'number') throw Error('The latitude argument should be of type number');
		if (typeof lat !== 'number') throw Error('The longitude argument should be of type number');
		if (lat >= 90 && lat <= -90) throw Error("GeoPoint's latitude should be within the range of -90.0 and 90.0");
		if (lon >= 180 && lon <= -180) throw Error("GeoPoint's longitude should be within the range of -180.0 and 180.0");
		this.latitude = lat;
		this.longitude = lon;
	}

	toJSON() {
		return {
			geoPointValue: { ...this }
		};
	}
}
