import {Circle, Fill, Stroke, Style,Text} from 'ol/style.js';

export default function createDefaultStyle(): Record<string, Style[]> {
    const styles: Record<string, Style[]> = {};
    const white = [255, 255, 255, 1];
    const blue = [0, 153, 255, 0.4];
    const blue_dark = [0, 53, 155, 0.4];
    const red = [255, 33, 0, 0.4];
    const width = 2;
    styles['Polygon'] = [
        new Style({
            fill: new Fill({
                color: blue,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 1,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: blue_dark,
                width: width,
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
    styles['Text'] = [
        new Style({
            text: new Text({
                textBaseline: "middle",
                font: 'normal 14px 微软雅黑',
                textAlign: "center",
                fill: new Fill({color: [255,0,0,1]}),
                overflow:true,
                stroke: new Stroke({
                    color: white,
                    width: width / 2
                })
            })
        }),
    ]

    styles['select'] = [
        new Style({
            fill: new Fill({
                color: red,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 1,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: red,
                width: width,
            }),
        }),
    ];
    return styles;
}
