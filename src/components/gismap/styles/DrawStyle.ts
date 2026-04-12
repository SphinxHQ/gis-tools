import {Circle, Fill, Stroke, Style} from 'ol/style.js';
export  function createSysDrawStyle():Record<string,Style[]> {
    const styles:Record<string,Style[]> =  {};
    const white = [255, 255, 255, 1];
    const red = [255, 33, 0, 1];
    const blue = [0, 153, 255, 1];
    const width = 2;
    styles['Polygon'] = [
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 2,
            }),
        }),
        new Style({
            fill: new Fill({
                color: [255, 33, 0, 0.1],
            }),
            stroke: new Stroke({
                color: red,
                width: width,
            })
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


export  function createSysDrawHandleStyle():Record<string,Style[]> {
    const styles:Record<string,Style[]> =  {};
    const white = [255, 255, 255, 1];
    const red = [255, 33, 0, 1];
    const width = 2;
    styles['Polygon'] = [
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 2,
            }),
        }),
        new Style({
            fill: new Fill({
                color: [255, 33, 0, 0.1],
            }),
            stroke: new Stroke({
                color: red,
                width: width,
            })
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
                color: red,
                width: width,
            }),
        }),
        // new Style({
        //     renderer: function (coordinates:Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][], state:State) {
        //        // const render:CanvasImmediateRenderer =  toContext(state.context, {pixelRatio:state.pixelRatio});
        //        // console.log(state)
        //     }
        // }),
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