import * as GeoJSON from "geojson";
import * as turf from "@turf/turf";
import * as Format from "ol/format";


const getRingclockwise = (ringPoings: number[][]): boolean => {

    const left = {
        idx: -1,
        point: [Number.MAX_VALUE, Number.MIN_VALUE]
    }
    for (let i = 0; i < ringPoings.length; i++) {
        const p = ringPoings[i];
        if (p[0] < left.point[0] || (p[0] == left.point[0] && p[1] > left.point[1])) {
            left.idx = i;
            left.point = p;
        }
    }
    const nextPoint = ringPoings[left.idx + 1] || ringPoings[0];
    const prevPoint = ringPoings[left.idx - 1] || ringPoings[ringPoings.length - 1];

    const angleNext = Math.atan(nextPoint[1] - left.point[1] / nextPoint[0] - left.point[0]) * (180 / Math.PI);
    const anglePrev = Math.atan(prevPoint[1] - left.point[1] / prevPoint[0] - left.point[0]) * (180 / Math.PI);

    const clockwise = angleNext - anglePrev > 0;
    return clockwise;
}
const isValidClickwise = (geometry: GeoJSON.Geometry, shellClockwise: boolean): { isValid: boolean, errRings: { index: number[], ring: number[][], validClockwise: boolean }[] } => {
    let isValid = true;

    let errRings = []
    const holeClockwise = !shellClockwise
    switch (geometry.type) {
        case "Polygon":
            for (let i = 0; i < geometry.coordinates.length; i++) {
                const ring = geometry.coordinates[i];
                const validClockwise = i == 0 ? shellClockwise : holeClockwise;
                if (getRingclockwise(ring) !== validClockwise) {
                    isValid = false;
                    errRings.push({
                        index: [0, i],
                        ring: ring,
                        validClockwise: validClockwise
                    })
                }

            }
            break;
        case "MultiPolygon":
            for (let i = 0; i < geometry.coordinates.length; i++) {
                const polygonIn = geometry.coordinates[i];
                for (let j = 0; j < polygonIn.length; j++) {
                    const ring = polygonIn[j];
                    const validClockwise = j == 0 ? shellClockwise : holeClockwise;
                    if (getRingclockwise(ring) !== validClockwise) {
                        isValid = false;
                        errRings.push({
                            index: [i, j],
                            ring: ring,
                            validClockwise: validClockwise
                        })
                    }
                }
            }
            break;
        default:
            throw new Error("not support geometry type:" + geometry.type);
    }

    return {
        isValid,
        errRings
    };
}
const contains = function (geometry: GeoJSON.Geometry, overlay: GeoJSON.Geometry): boolean {
    return turf.booleanContains(geometry, overlay);
}
const overlap = function (geometry: GeoJSON.Geometry, overlay: GeoJSON.Geometry): boolean {
    return turf.booleanOverlap(geometry, overlay);
}
const within = function (geometry: GeoJSON.Geometry, overlay: GeoJSON.Geometry): boolean {
    return turf.booleanWithin(geometry, overlay);
}
const intersects = function (geometry: GeoJSON.Geometry, overlay: GeoJSON.Geometry): boolean {
    return turf.booleanIntersects(geometry, overlay);
}
const difference = function (feature1: GeoJSON.Feature, feature2: GeoJSON.Feature): any {

    const featureCollection = turf.featureCollection([feature1,feature2]);
    return turf.difference(featureCollection);
}
const olFeatureToGeoJSON = (feature: any): GeoJSON.Feature => {
    return JSON.parse(new Format.GeoJSON().writeFeature(feature));
}
const geoJSONToOlFeature = (geojson: GeoJSON.Feature): any => {
    return new Format.GeoJSON().readFeature(geojson);
}
export default {
    getRingclockwise,
    isValidClickwise,
    contains,
    overlap,
    within,
    intersects,
    difference,
    olFeatureToGeoJSON,
    geoJSONToOlFeature
}