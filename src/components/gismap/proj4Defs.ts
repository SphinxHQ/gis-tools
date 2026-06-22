import {register} from 'ol/proj/proj4';
import {get as getProjection, getTransform} from 'ol/proj';
import {applyTransform} from 'ol/extent';
import proj4 from 'proj4';
import {CrsBounds} from '../data/GisProjectedBounds';

declare const self: Window & typeof globalThis;

/**
 * @description:
 * @param {string} name
 * @param {string} str
 * @return {*}
 */
const addProj = function (name: string, str: string) {
    proj4.defs(name, str);
}
/**
 * 动态注册 proj4 定义（用于运行时添加 CrsBounds 中没有的 CRS）
 */
export const registerProj4Def = (epsgCode: number, defString: string) => {
    const key = `EPSG:${epsgCode}`;
    if (!proj4.defs(key)) {
        proj4.defs(key, defString);
    }
}

export const proj4Init = () => {
    //西安80坐标系 3度分带 带号25~45
    let srid = 2349
    for (let i = 25; i < 46; i++) {
        let code = (i - 25) + srid
        addProj('EPSG:' + code, `+title=Xian 1980 / 3-degree Gauss-Kruger zone ${i} +proj=tmerc +lat_0=0 +lon_0=${i * 3} +k=1 +x_0=${i}500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs`)
    }

    //西安80坐标系 3度分带 中央经线75~135
    srid = 2370
    for (let i = 75; i < 136; i = i + 3) {
        let code = (i - 75) / 3 + srid
        addProj('EPSG:' + code, `+title=Xian 1980 / 3-degree Gauss-Kruger CM ${i}E +proj=tmerc +lat_0=0 +lon_0=${i} +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs`)
    }

    //西安80坐标系 6度分带 带号13~23
    srid = 2327
    for (let i = 13; i < 24; i++) {
        let code = (i - 13) + srid
        let e = i * 6 - 3
        addProj('EPSG:' + code, `+title=AXian 1980 / Gauss-Kruger zone ${i} +proj=tmerc +lat_0=0 +lon_0=${e} +k=1 +x_0=${i}500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs`)
    }

    //西安80坐标系 6度分带 中央经线75~135
    srid = 2338
    for (let i = 75; i < 136; i = i + 6) {
        let code = (i - 75) / 6 + srid
        addProj('EPSG:' + code, `+title=AXian 1980 / Gauss-Kruger CM ${i}E +proj=tmerc +lat_0=0 +lon_0=${i} +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs`)
    }

    //北京54 3度分带
    srid = 2401
    for (let i = 25; i < 46; i++) {
        let code = (i - 25) + srid
        addProj('EPSG:' + code, `+title=Beijing 1954 / 3-degree Gauss-Kruger zone ${i} +proj=tmerc +lat_0=0 +lon_0=${i * 3} +k=1 +x_0=${i}500000 +y_0=0 +ellps=krass +units=m +no_defs`)
    }

    //国家2000坐标系 3度分带 带号25~45
    srid = 4513
    for (let i = 25; i < 46; i++) {
        let code = (i - 25) + srid
        addProj('EPSG:' + code, `+title=CGCS2000 / 3-degree Gauss-Kruger zone ${i} +proj=tmerc +lat_0=0 +lon_0=${i * 3} +k=1 +x_0=${i}500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`)
    }

    //国家2000坐标系 3度分带 中央经线75~135
    srid = 4534
    for (let i = 75; i < 136; i = i + 3) {
        let code = (i - 75) / 3 + srid
        addProj('EPSG:' + code, `+title=CGCS2000 / 3-degree Gauss-Kruger CM ${i}E +proj=tmerc +lat_0=0 +lon_0=${i} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`)
    }

    //国家2000坐标系 6度分带 带号13~23
    srid = 4491
    for (let i = 13; i < 24; i++) {
        let code = (i - 13) + srid
        let e = i * 6 - 3
        addProj('EPSG:' + code, `+title=CGCS2000 / Gauss-Kruger zone ${i} +proj=tmerc +lat_0=0 +lon_0=${e} +k=1 +x_0=${i}500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`)
    }

    //国家2000坐标系 6度分带 中央经线75~135
    srid = 4502
    for (let i = 75; i < 136; i = i + 6) {
        let code = (i - 75) / 6 + srid
        addProj('EPSG:' + code, `+title=CGCS2000 / Gauss-Kruger CM ${i}E +proj=tmerc +lat_0=0 +lon_0=${i} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`)
    }
    //西安80地理坐标
    addProj('EPSG:4610', '+proj=longlat +a=6378140 +b=6356755.288157528 +no_defs')

    //国家2000地理坐标
    addProj('EPSG:4490', '+title=China Geodetic Coordinate System 2000 +proj=longlat +ellps=GRS80 +no_defs')

    //北京54地理坐标
    addProj("EPSG:4214","+title=Beijing 1954 +proj=longlat +ellps=krass +towgs84=15.8,-154.4,-82.3,0,0,0,0 +no_defs +type=crs");

    register(proj4)

    // 为投影坐标系设置 extent（OL 重投影必需，否则瓦片无法重投影到自定义投影）
    // 参考官方示例 https://openlayers.org/en/latest/examples/reprojection-by-code.html
    // 标准做法：
    //   1. setWorldExtent(bbox) - 设置投影的经纬度范围
    //   2. setExtent(applyTransform(bbox, fromLonLat)) - 转换为投影坐标范围
    // 对于高斯-克吕格分带投影：
    //   - x 方向固定为中国范围 +5度扩展（68°~140°），避免分带投影远离中央经线时变形过大
    //   - y 方向全球纬度范围（±85°避免极点奇点）
    //   - extent 通过 applyTransform 转换得到，OL 会自动处理变形
    const CHINA_LON_RANGE_WITH_PADDING: [number, number, number, number] = [68, -85, 140, 85]
    for (const key in CrsBounds) {
        const info = CrsBounds[key]
        if (info.projected) {
            const proj = getProjection(key)
            if (proj && !proj.getExtent()) {
                try {
                    proj.setWorldExtent(CHINA_LON_RANGE_WITH_PADDING)
                    // 用 applyTransform 将经纬度范围转换为投影坐标范围
                    const fromLonLat = getTransform('EPSG:4326', key)
                    const extent = applyTransform(CHINA_LON_RANGE_WITH_PADDING, fromLonLat, undefined, 8)
                    proj.setExtent(extent)
                } catch {
                    // 转换失败时回退到 envelope
                    if (info.envelope) {
                        const e = info.envelope
                        proj.setExtent([e.left, e.bottom, e.right, e.top])
                    }
                }
            }
        }
    }

    if (!(self as any).proj4) {
        Object.defineProperty(self, 'proj4', {
            value: proj4,
            writable: false,
            configurable: false,
            enumerable: false,
        })
    }
}
