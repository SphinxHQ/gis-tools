/**
 * @file Highlight styles (selection/flash)
 * @description Provides the OpenLayers style factory for highlighted (selected/flashed) features.
 *              Semantic colors align with scss --gis-geo-* variables:
 *              point=blue(#2563eb), line=green(#16a34a), polygon=orange(#ea580c).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-20
 */
import {Circle, Fill, Stroke, Style} from 'ol/style.js';

/**
 * 高亮样式（选中/闪烁）
 * 语义色与 scss --gis-geo-* 保持一致：
 *   点=蓝(#2563eb) 线=绿(#16a34a) 面=橙(#ea580c)
 */
export default function createHighlightStyle():Record<string,Style[]> {
    const styles:Record<string,Style[]> =  {};
    const white = [255, 255, 255, 1];
    // 语义色
    const pointColor = [37, 99, 235, 1];          // 点=蓝
    const lineColor = [22, 163, 74, 1];           // 线=绿
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
