import { Circle, Fill, Stroke, Style } from 'ol/style';
import * as Render from 'ol/render'
import { Feature } from 'ol';
import { StyleLike } from 'ol/style/Style';
import createDefaultStyle from './DefaultStyle'
import {createSysDrawStyle,createSysDrawHandleStyle} from './DrawStyle'
import { DefaultLayerNames } from '../GisMap';

const drwaHandleStyle = new Style({
    renderer: (coordinates, state) => {
        // console.log('renderer')
        // console.log(coordinates)
        // console.log(state)
    },
    hitDetectionRenderer: (coordinates, state) => {
        //console.log('hitDetectionRenderer')

    },
});
function getDefaultStyleFunction(): any {
    const styles = createDefaultStyle();
    return function (feature: Feature, resolution: Number): Style[] {
        const geometryType = feature.getGeometry()?.getType(); // 使用可选链确保getGeometry()不是undefined
        if (geometryType && styles[geometryType] !== undefined) {
            return styles[geometryType];
        } else {
            // 可以返回一个默认样式或者处理找不到对应类型的情况
            console.log('未找到对应的样式');
            return [new Style({})]; // 假设defaultStyle是预先定义好的默认样式
        }
        return [new Style({})]
    };
}

function getDrawStyleFunction(): any {
    const styles = createSysDrawStyle();
    return function (feature: Feature, resolution: Number): Style[] {
        const geometryType = feature.getGeometry()?.getType(); // 使用可选链确保getGeometry()不是undefined
        if (geometryType && styles[geometryType] !== undefined) {
            return styles[geometryType];
        } else {
            // 可以返回一个默认样式或者处理找不到对应类型的情况
            console.log('未找到对应的样式');
            return [new Style({})]; // 假设defaultStyle是预先定义好的默认样式
        }
        return [new Style({})]
    };
}
function getDrawHandleStyleFunction(): any {
    const styles = createSysDrawHandleStyle();
    return function (feature: Feature, resolution: Number): Style[] {
        const geometryType = feature.getGeometry()?.getType(); // 使用可选链确保getGeometry()不是undefined
        if (geometryType && styles[geometryType] !== undefined) {
            return styles[geometryType];
        } else {
            // 可以返回一个默认样式或者处理找不到对应类型的情况
            console.log('未找到对应的样式');
            return [new Style({})]; // 假设defaultStyle是预先定义好的默认样式
        }
        return [new Style({})]
    };
}

const getDrawToolStyle = (drawType:string): StyleLike => {
    return  getDrawStyleFunction()
}
export default {
    drwaHandleStyle,
    getDefaultStyleFunction,
    getDrawToolStyle,
    getDrawHandleStyleFunction,
    getDrawStyleFunction
}
export const defaultStyle = getDefaultStyleFunction();
export const drawStyle = getDrawStyleFunction();
export const getLayerStyles = (layerName: string) => {
    switch (layerName) {
        case DefaultLayerNames.SYS_DRAW_TOOL_ACTION:
        case DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY:
            return getDrawStyleFunction();
        default:
            return getDefaultStyleFunction();
    }
}