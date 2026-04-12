import { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import { Style } from 'ol/style';
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

const getDrawToolStyle = (): StyleLike => {
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
        case DefaultLayerNames.SYS_TEMP_FLASH:
            return getFlashStyleFunction();
        default:
            return getDefaultStyleFunction();
    }
}
