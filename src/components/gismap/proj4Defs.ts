import {register} from 'ol/proj/proj4';
import proj4 from 'proj4';

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
    Object.defineProperty(self, 'proj4', {
        value: proj4,
        writable: false,
        configurable: false,
        enumerable: false,
    })
}
