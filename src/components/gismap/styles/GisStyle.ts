/**
 * @file GIS style utilities
 * @description Provides style creation, parsing, and application utilities for OpenLayers features.
 *              Supports converting style option objects to OL Style instances, geometry-type-based
 *              style resolution, and style serialization.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-20
 */
import { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { Circle, Fill, Stroke, Style } from 'ol/style';

import { logger } from '~/common/logger';

import { DefaultLayerNames } from '../GisMap';

import createDefaultStyle from './DefaultStyle'
import {createSysDrawStyle,createSysDrawHandleStyle} from './DrawStyle'

/* [UNUSED] drwaHandleStyle - 拼写错误(drwa→draw)，无任何外部引用
const drwaHandleStyle = new Style({
    renderer: () => {
    },
    hitDetectionRenderer: () => {
    },
});
*/
function getDefaultStyleFunction(): (feature: FeatureLike) => Style[] {
    const styles = createDefaultStyle();
    return function (feature: FeatureLike): Style[] {
       const lable = (feature as Feature).get('label');
        const geometryType = feature.getGeometry()?.getType();
        if (geometryType && styles[geometryType] !== undefined) {
            if(lable!==undefined){
                const textStyles: Style[] = styles['Text'];
                textStyles.forEach(s=>s.getText()?.setText?.(`${lable}`));
                return styles[geometryType].concat(textStyles);
            }
            return styles[geometryType];
        } else {
            logger.warn('未找到对应的样式:', geometryType);
            return [new Style({})];
        }
    };
}

function getDrawStyleFunction(): (feature: FeatureLike) => Style[] {
    const styles = createSysDrawStyle();
    return function (feature: FeatureLike): Style[] {
        const geometryType = feature.getGeometry()?.getType();
        if (geometryType && styles[geometryType] !== undefined) {
            return styles[geometryType];
        } else {
            logger.warn('未找到对应的样式:', geometryType);
            return [new Style({})];
        }
    };
}
/* [UNUSED] getFlashStyleFunction - 无任何外部引用
function getFlashStyleFunction(): (feature: FeatureLike) => Style[] {
    return function (): Style[] {
        return [new Style({})];
    };
}
*/
function getDrawHandleStyleFunction(): (feature: FeatureLike) => Style[] {
    const styles = createSysDrawHandleStyle();
    return function (feature: FeatureLike): Style[] {
        const geometryType = feature.getGeometry()?.getType();
        if (geometryType && styles[geometryType] !== undefined) {
            return styles[geometryType];
        } else {
            logger.warn('未找到对应的样式:', geometryType);
            return [new Style({})];
        }
    };
}

function getModifyStyleFunction(): (feature: FeatureLike) => Style[] {
    const vertexStyle = new Style({
        image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#fff' }),
            stroke: new Stroke({ color: '#409EFF', width: 2 }),
        }),
        geometry: (feature) => {
            const geom = feature.getGeometry();
            if (!geom) return geom;
            const type = geom.getType();
            // 为多边形/线显示顶点（不含最后一个闭合点）
            if (type === 'Polygon') {
                const rings = (geom as Polygon).getCoordinates();
                const allCoords: number[][] = [];
                // 外环（不含闭合点）
                if (rings[0] && rings[0].length > 1) {
                    rings[0].slice(0, -1).forEach((c: number[]) => allCoords.push(c));
                }
                // 内环（洞，不含闭合点）
                for (let i = 1; i < rings.length; i++) {
                    rings[i].slice(0, -1).forEach((c: number[]) => allCoords.push(c));
                }
                if (allCoords.length > 0) {
                    return new MultiPoint(allCoords);
                }
            } else if (type === 'LineString') {
                const coords = (geom as LineString).getCoordinates();
                return new MultiPoint(coords);
            } else if (type === 'MultiPolygon') {
                const allCoords: number[][] = [];
                (geom as MultiPolygon).getCoordinates().forEach((polygon: number[][][]) => {
                    polygon.forEach((ring: number[][]) => {
                        ring.slice(0, -1).forEach((c: number[]) => allCoords.push(c));
                    });
                });
                if (allCoords.length > 0) {
                    return new MultiPoint(allCoords);
                }
            } else if (type === 'MultiLineString') {
                const allCoords: number[][] = [];
                (geom as MultiLineString).getCoordinates().forEach((line: number[][]) => {
                    line.forEach((c: number[]) => allCoords.push(c));
                });
                if (allCoords.length > 0) {
                    return new MultiPoint(allCoords);
                }
            } else if (type === 'MultiPoint') {
                return geom;
            }
            return geom;
        },
    });
    const featureStyle = new Style({
        fill: new Fill({ color: 'rgba(64, 158, 255, 0.15)' }),
        stroke: new Stroke({ color: '#409EFF', width: 2, lineDash: [6, 3] }),
        image: new Circle({
            radius: 5,
            fill: new Fill({ color: '#409EFF' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
    });
    return function (): Style[] {
        return [featureStyle, vertexStyle];
    };
}

/* [UNUSED] getDrawToolStyle - 无任何外部引用
const getDrawToolStyle = (): StyleLike => {
    return  getDrawStyleFunction()
}
*/
export default {
    /* [UNUSED] drwaHandleStyle, */
    getDefaultStyleFunction,
    /* [UNUSED] getDrawToolStyle, */
    getDrawHandleStyleFunction,
    getDrawStyleFunction,
    getModifyStyleFunction
}
export const defaultStyle = getDefaultStyleFunction();
export const drawStyle = getDrawStyleFunction();

/**
 * 拓扑错误图层颜色映射（柔和色调）
 * key 为检查项 code，对应 layer_topo_err_{code} 图层
 */
export const TOPO_ERROR_COLORS: Record<string, { fill: string; stroke: string }> = {
    self_intersection: { fill: 'rgba(224,124,124,0.35)', stroke: '#e07c7c' },
    hole_outside_shell: { fill: 'rgba(217,164,65,0.35)', stroke: '#d9a441' },
    holes_overlap: { fill: 'rgba(144,128,208,0.35)', stroke: '#9080d0' },
    multipart_overlap: { fill: 'rgba(95,184,196,0.35)', stroke: '#5fb8c4' },
}

/** 拓扑错误图层前缀 */
export const TOPO_ERR_LAYER_PREFIX = 'layer_topo_err_'

/**
 * 拓扑错误图层样式函数
 * 按图层名中的 code 查找颜色，生成对应样式的要素
 */
function getTopoErrorStyleFunction(layerName: string): (feature: FeatureLike) => Style[] {
    const code = layerName.startsWith(TOPO_ERR_LAYER_PREFIX) ? layerName.slice(TOPO_ERR_LAYER_PREFIX.length) : ''
    const colors = TOPO_ERROR_COLORS[code] || { fill: 'rgba(224,124,124,0.35)', stroke: '#e07c7c' }
    const white = [255, 255, 255, 1]
    return function (feature: FeatureLike): Style[] {
        const geometryType = feature.getGeometry()?.getType()
        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
            return [new Style({
                image: new Circle({
                    radius: 5,
                    fill: new Fill({ color: colors.stroke }),
                    stroke: new Stroke({ color: white as [number, number, number, number], width: 1.5 }),
                }),
                zIndex: Infinity,
            })]
        }
        const styles: Style[] = []
        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon' || geometryType === 'Circle') {
            styles.push(new Style({ fill: new Fill({ color: colors.fill }) }))
            styles.push(new Style({ stroke: new Stroke({ color: white as [number, number, number, number], width: 3 }) }))
            styles.push(new Style({ stroke: new Stroke({ color: colors.stroke, width: 2 }) }))
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
            styles.push(new Style({ stroke: new Stroke({ color: white as [number, number, number, number], width: 4 }) }))
            styles.push(new Style({ stroke: new Stroke({ color: colors.stroke, width: 2.5 }) }))
        }
        return styles.length > 0 ? styles : [new Style({})]
    }
}

export const getLayerStyles = (layerName: string) => {
    // 拓扑错误图层：按错误类型着色
    if (layerName.startsWith(TOPO_ERR_LAYER_PREFIX)) {
        return getTopoErrorStyleFunction(layerName)
    }
    switch (layerName) {
        case DefaultLayerNames.SYS_DRAW_TOOL_ACTION:
        case DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY:
            return getDrawStyleFunction();
        /* [UNUSED] case DefaultLayerNames.SYS_TEMP_FLASH: return getFlashStyleFunction(); */
        default:
            return getDefaultStyleFunction();
    }
}
