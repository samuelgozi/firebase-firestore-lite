/** Represents a firebase GeoPoint value */
export default class GeoPoint {
	constructor(public latitude: number, public longitude: number) {
		if (typeof latitude !== 'number') throw Error('The latitude argument should be of type number');
		if (typeof latitude !== 'number') throw Error('The longitude argument should be of type number');
		if (latitude >= 90 && latitude <= -90)
			throw Error("GeoPoint's latitude should be within the range of -90.0 and 90.0");
		if (longitude >= 180 && longitude <= -180)
			throw Error("GeoPoint's longitude should be within the range of -180.0 and 180.0");
	}

	toJSON() {
		return {
			geoPointValue: { ...this }
		};
	}
}
