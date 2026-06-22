import { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import type { StyleLike } from 'ol/style/Style';

import { logger } from '~/common/logger';

import { DefaultLayerNames } from '../GisMap';

import createDefaultStyle from './DefaultStyle'
import {createSysDrawStyle,createSysDrawHandleStyle} from './DrawStyle'

const drwaHandleStyle = new Style({
    renderer: () => {
    },
    hitDetectionRenderer: () => {
    },
});
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
function getFlashStyleFunction(): (feature: FeatureLike) => Style[] {
    return function (): Style[] {
        return [new Style({})];
    };
}
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

const getDrawToolStyle = (): StyleLike => {
    return  getDrawStyleFunction()
}
export default {
    drwaHandleStyle,
    getDefaultStyleFunction,
    getDrawToolStyle,
    getDrawHandleStyleFunction,
    getDrawStyleFunction,
    getModifyStyleFunction
}
export const defaultStyle = getDefaultStyleFunction();
export const drawStyle = getDrawStyleFunction();
export const getLayerStyles = (layerName: string) => {
    switch (layerName) {
        case DefaultLayerNames.SYS_DRAW_TOOL_ACTION:
        case DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY:
            return getDrawStyleFunction();
        case DefaultLayerNames.SYS_TEMP_FLASH:
            return getFlashStyleFunction();
        default:
            return getDefaultStyleFunction();
    }
}
