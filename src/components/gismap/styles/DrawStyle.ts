import {Circle, Fill, Stroke, Style} from 'ol/style.js';

/**
 * 绘制工具样式
 * 语义色与 scss --gis-geo-* 保持一致：
 *   点=蓝(#2563eb) 线=绿(#16a34a) 面=橙(#ea580c)
 */
export  function createSysDrawStyle():Record<string,Style[]> {
    const styles:Record<string,Style[]> =  {};
    const white = [255, 255, 255, 1];
    // 语义色
    const pointColor = [37, 99, 235, 1];          // 点=蓝
    const lineColor = [22, 163, 74, 1];           // 线=绿
    const polygonFill = [234, 88, 12, 0.1];       // 面填充=橙
    const polygonStroke = [234, 88, 12, 1];       // 面描边=橙
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
                color: polygonFill,
            }),
            stroke: new Stroke({
                color: polygonStroke,
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
                color: lineColor,
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
                    color: pointColor,
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
    // 语义色（handle 用纯色）
    const pointColor = [37, 99, 235, 1];          // 点=蓝
    const lineColor = [22, 163, 74, 1];           // 线=绿
    const polygonFill = [234, 88, 12, 0.1];       // 面填充=橙
    const polygonStroke = [234, 88, 12, 1];       // 面描边=橙
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
                color: polygonFill,
            }),
            stroke: new Stroke({
                color: polygonStroke,
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
                color: lineColor,
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
                    color: pointColor,
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
