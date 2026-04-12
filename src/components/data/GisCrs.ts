import * as GeoJSON from 'geojson';
import proj4 from "proj4";

import {GisError, GisErrorCode} from "~/common/GisError";
import {UIHelper} from "~/common/UIHelper";
import {logger} from "~/common/logger";
import GisProjectedBounds, {CrsBounds, CrsInfo} from "~/components/data/GisProjectedBounds";

const CHINA_EXTENT = {
    top: 53.56,
    left: 73.62,
    bottom: 16.7,
    right: 134.77
}
const LonLatInChina = (point: number[]): boolean => {
    const [lon, lat] = point;
    return lon >= CHINA_EXTENT.left && lon <= CHINA_EXTENT.right && lat >= CHINA_EXTENT.bottom && lat <= CHINA_EXTENT.top
}
export default class GisCrs {
    name: string;
    epsgCode: number;
    proj4Def: proj4.ProjectionDefinition;
    crsInfo: CrsInfo;
    private static Empty: GisCrs = new GisCrs(0);

    constructor(epsgCode: number) {
        if (epsgCode <= 0) {
            this.epsgCode = 0;
            this.proj4Def = {} as proj4.ProjectionDefinition;
            this.crsInfo = {} as CrsInfo;
            this.name = "EPSG:EMPTY";
        } else {
            this.epsgCode = epsgCode;
            this.crsInfo = GisProjectedBounds.getCrsInfo(epsgCode);
            this.proj4Def = proj4.defs(`EPSG:${epsgCode}`)
            this.name = this.crsInfo.name
            if (!this.proj4Def) {
                throw new GisError(GisErrorCode.CRS_NOT_FOUND, `epsgCode:${epsgCode} not found in proj4 defs`);
            }
        }
    }

    static validPointProjectionCrs(p: number[], _crs: GisCrs | CrsInfo) {
        let crs = _crs
        if (crs instanceof GisCrs) {
            crs = crs.crsInfo
        }
        if (!crs.projected) {
            if (LonLatInChina(p)) {
                return Promise.resolve(this);
            } else {
                return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `${p} is not in china`));
            }
        }
        const epsgCode: number = crs.epsgCode;
        const projectionDefinition = proj4.defs(`EPSG:${epsgCode}`);
        if (!projectionDefinition) {
            return Promise.reject(new GisError(GisErrorCode.CRS_NOT_FOUND, `${epsgCode} projectionDefinition not found`));
        }
        let toGeoEpsgCode: number = 0

        if (epsgCode > 2300 && epsgCode < 2400) {
            toGeoEpsgCode = 4610;
        } else if (epsgCode > 2400 && epsgCode < 2500) {
            toGeoEpsgCode = 4214;
        } else if (epsgCode === 3857) {
            toGeoEpsgCode = 4326;
        } else if (epsgCode > 4000) {
            toGeoEpsgCode = 4490;
        }
        try {
            const point = proj4(proj4.defs(`EPSG:${epsgCode}`), proj4.defs(`EPSG:${toGeoEpsgCode}`), p);
            if (!LonLatInChina(point)) {
                return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `${p} is not in china`));
            } else {
                return Promise.resolve(this);
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    static _tryGetCrs(x: unknown): Promise<{ point: number[], crs: GisCrs }> {
        if (x === undefined || x === null) {
            return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `GisCrs::_tryGetCrs input is undefined or null`));
        }
        if (Array.isArray(x) && x.length === 0) {
            return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `GisCrs::_tryGetCrs input is empty array`))
        }
        if (Array.isArray(x) && x.length > 1 && x.every((n: unknown) => typeof n === 'number')) {
            const point: [number, number] = [x[0], x[1]];
            let crsInfos: CrsInfo[] = GisProjectedBounds.findByLon(point[0]);
            if (crsInfos.length > 0) {
                if (crsInfos.length == 1) {
                    return Promise.resolve({
                        point,
                        crs: new GisCrs(crsInfos[0].epsgCode)
                    });
                } else {
                    return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, crsInfos).then(data => {
                        return {point, crs: new GisCrs(data.epsgCode)}
                    });
                }
            } else {
                try {
                    if (point[0] < 180) {
                        return Promise.resolve({
                            point,
                            crs: new GisCrs(4490)
                        });
                    } else {
                        const crsInfosFull: CrsInfo[] = GisProjectedBounds.findByPoint(point);
                        if (crsInfosFull.length === 1) {
                            return Promise.resolve({
                                point,
                                crs: new GisCrs(crsInfosFull[0].epsgCode)
                            });
                        } else if (crsInfosFull.length > 1) {
                            return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, crsInfosFull).then(data => {
                                return {point, crs: new GisCrs(data.epsgCode)}
                            });
                        }
                    }
                } catch (e) {
                    logger.warn('GisCrs::_tryGetCrs coordinate recognition failed:', e);
                }

                return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, Object.values(CrsBounds)).then(data => {
                    return {point, crs: new GisCrs(data.epsgCode)}
                });
            }
        } else if (typeof x === "string") {
            if (!isNaN(Number(x))) {
                return GisCrs._tryGetCrs(Number(x));
            } else {
                logger.error(`GisCrs::_tryGetCrs ${x} is not a number`);
                return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `GisCrs::_tryGetCrs ${x} is not a number`));
            }
        } else if (typeof x === "object") {
            const obj = x as Record<string, unknown>;
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    const find = GisCrs._tryGetCrs(obj[i]);
                    if (find) {
                        return find
                    }
                }
            }
            if (obj?.type === 'Feature') {
                const geom = (obj as unknown as GeoJSON.Feature).geometry;
                if (geom && 'coordinates' in geom) {
                    return GisCrs._tryGetCrs((geom as GeoJSON.Geometry & { coordinates: unknown }).coordinates);
                }
            }
            if (obj?.type === 'FeatureCollection') {
                return GisCrs._tryGetCrs((obj as unknown as GeoJSON.FeatureCollection).features);
            }
            if (obj?.coordinates) {
                return GisCrs._tryGetCrs(obj.coordinates);
            }
        }
        return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `Assert _tryGetCrs`));
    }

    static tryGetCrs(obj: unknown): Promise<GisCrs> {
        return GisCrs._tryGetCrs(obj).then((data: {
            point: number[],
            crs: GisCrs
        }) => this.validPointProjectionCrs(data.point, data.crs).then(() => data.crs))
    }

    /**
     * 获取 proj4 定义字符串
     * @returns proj4 定义或 null
     */
    getProj4Def(): string | null {
        if (!this.proj4Def || !this.epsgCode) {
            return null;
        }
        const def = proj4.defs(`EPSG:${this.epsgCode}`);
        return def ? JSON.stringify(def) : null;
    }

    /**
     * 比较两个 CRS 是否相等
     * @param other 另一个 CRS 实例或 EPSG 代码
     * @returns 是否相等
     */
    equals(other: GisCrs | number): boolean {
        if (other instanceof GisCrs) {
            return this.epsgCode === other.epsgCode;
        }
        return this.epsgCode === other;
    }

    /**
     * 获取 CRS 的友好名称
     * @returns CRS 名称
     */
    getName(): string {
        return this.name || `EPSG:${this.epsgCode}`;
    }
}
