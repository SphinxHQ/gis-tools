import {Circle, Fill, Stroke, Style} from 'ol/style.js';

export default function createHighlightStyle():Record<string,Style[]> {
    const styles:Record<string,Style[]> =  {};
    const white = [255, 255, 255, 1];
    const blue = [0, 153, 255, 1];
    const red = [255, 33, 0, 1];
    const width = 2;
    styles['Polygon'] = [
        new Style({
            fill: new Fill({
                color: [255, 255, 255, 0.5],
            }),
        }),
    ];
    styles['MultiPolygon'] = styles['Polygon'];

    styles['LineString'] = [
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 2,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: blue,
                width: width,
            }),
        }),
    ];
    styles['MultiLineString'] = styles['LineString'];

    styles['Circle'] = styles['Polygon'].concat(styles['LineString']);

    styles['Point'] = [
        new Style({
            image: new Circle({
                radius: width * 2,
                fill: new Fill({
                    color: red,
                }),
                stroke: new Stroke({
                    color: white,
                    width: width / 2,
                }),
            }),
            zIndex: Infinity,
        }),
    ];
    styles['MultiPoint'] = styles['Point'];

    styles['GeometryCollection'] = styles['Polygon'].concat(
        styles['LineString'],
        styles['Point'],
    );

    return styles;
}