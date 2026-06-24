/**
 * @file Default map feature styles
 * @description Provides the default OpenLayers style factory for map features.
 *              Semantic colors align with scss --gis-geo-* variables:
 *              point=blue(#2563eb), line=green(#16a34a), polygon=orange(#ea580c), collection=gray(#64748b).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-20
 */
import {Circle, Fill, Stroke, Style,Text} from 'ol/style.js';

/**
 * 默认地图要素样式
 * 语义色与 scss --gis-geo-* 保持一致：
 *   点=蓝(#2563eb) 线=绿(#16a34a) 面=橙(#ea580c) 集合=灰(#64748b)
 */
export default function createDefaultStyle(): Record<string, Style[]> {
    const styles: Record<string, Style[]> = {};
    const white = [255, 255, 255, 1];
    // 语义色
    const pointColor = [37, 99, 235, 0.4];        // 点=蓝
    const pointColorSolid = [37, 99, 235, 0.85];
    const lineColor = [22, 163, 74, 0.85];        // 线=绿
    const polygonFill = [234, 88, 12, 0.15];      // 面填充=橙
    const polygonStroke = [234, 88, 12, 0.85];    // 面描边=橙
    const collectionColor = [100, 116, 139, 0.85]; // 集合=灰
    const selectColor = [255, 33, 0, 0.4];         // 选择高亮（非语义色）
    const width = 2;

    styles['Polygon'] = [
        new Style({
            fill: new Fill({
                color: polygonFill,
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
                color: polygonStroke,
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
    styles['Text'] = [
        new Style({
            text: new Text({
                textBaseline: "middle",
                font: 'normal 14px 微软雅黑',
                textAlign: "center",
                fill: new Fill({color: collectionColor}),
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
                color: selectColor,
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
                color: [255, 33, 0, 0.85],
                width: width,
            }),
        }),
    ];
    return styles;
}
