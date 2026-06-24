/**
 * @file GIS CRS (Coordinate Reference System) class
 * @description Provides CRS identification, recognition, and transformation logic.
 *              Supports automatic recognition of geographic/projected CRS by coordinate value ranges,
 *              Gauss-Kruger zone calculation, and proj4-based coordinate transformation.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as GeoJSON from 'geojson';
import proj4 from "proj4";

import {GisError, GisErrorCode} from "~/common/GisError";
/* [UNUSED] import {UIHelper} from "~/common/UIHelper"; */
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
            this.proj4Def = proj4.defs(`EPSG:${epsgCode}`)
            if (!this.proj4Def) {
                throw new GisError(GisErrorCode.CRS_NOT_FOUND, `epsgCode:${epsgCode} not found in proj4 defs`);
            }
            try {
                this.crsInfo = GisProjectedBounds.getCrsInfo(epsgCode);
            } catch {
                // EPSG 代码不在 CrsBounds 中（如自定义 proj4 注册），提供默认 CrsInfo
                const defStr = typeof this.proj4Def === 'object' ? JSON.stringify(this.proj4Def) : String(this.proj4Def);
                const isProjected = !defStr.includes('+proj=longlat');
                this.crsInfo = {
                    projected: isProjected,
                    envelope: { top: 90, left: -180, bottom: -90, right: 180 },
                    minLon: -180,
                    maxLon: 180,
                    withZone: false,
                    crs: { type: 'name', properties: { name: `EPSG:${epsgCode}` } },
                    epsgCode,
                    name: `EPSG:${epsgCode}`,
                    centralMeridian: 0,
                    zoneDegree: -1,
                    zoneNumber: -1,
                };
            }
            this.name = this.crsInfo.name
        }
    }

    static validPointProjectionCrs(p: number[], _crs: GisCrs | CrsInfo) {
        let crs = _crs
        if (crs instanceof GisCrs) {
            crs = crs.crsInfo
        }
        if (!crs.projected) {
            // 地理坐标：不做 "not in china" 限制，直接通过
            // 经纬度坐标除非有坐标系文件/用户指定/其他有效坐标系信息，否则全部视为 4490
            return Promise.resolve(this);
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
        } else if (epsgCode >= 4490 && epsgCode <= 4554) {
            // 仅 CGCS2000 投影系列自动识别
            toGeoEpsgCode = 4490;
        }
        if (toGeoEpsgCode === 0) {
            // 无法确定地理坐标系的投影，不自动识别
            return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED,
                `无法自动识别 EPSG:${epsgCode} 的地理坐标系。\n` +
                `EPSG:${epsgCode} 不在已知的西安80(2300~2400)、北京54(2400~2500)、CGCS2000投影(4490~4554)范围内。\n` +
                `建议：手动指定坐标系`));
        }
        try {
            const point = proj4(proj4.defs(`EPSG:${epsgCode}`), proj4.defs(`EPSG:${toGeoEpsgCode}`), p);
            if (!LonLatInChina(point)) {
                return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED,
                    `坐标(${p[0]}, ${p[1]}) 按 EPSG:${epsgCode} 投影坐标解释后，转换到地理坐标为(${point[0]}, ${point[1]})，不在中国大陆范围内(${CHINA_EXTENT.left}~${CHINA_EXTENT.right}, ${CHINA_EXTENT.bottom}~${CHINA_EXTENT.top})。\n` +
                    `可能原因：\n` +
                    `1. 坐标实际为地理坐标(经纬度)，被误判为投影坐标(米)\n` +
                    `2. 坐标系选择不正确\n` +
                    `3. 坐标数据本身有误`));
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
            // 经纬度坐标（< 180）：默认 4490，不做 "not in china" 限制
            if (point[0] < 180 && point[0] > -180 && point[1] < 90 && point[1] > -90) {
                return Promise.resolve({ point, crs: new GisCrs(4490) });
            }
            // 投影坐标：尝试自动识别 CGCS2000 投影系列
            let crsInfos: CrsInfo[] = GisProjectedBounds.findByLon(point[0]);
            if (crsInfos.length > 0) {
                if (crsInfos.length == 1) {
                    return Promise.resolve({
                        point,
                        crs: new GisCrs(crsInfos[0].epsgCode)
                    });
                } else {
                    /* [UNUSED] UIHelper.selectConfirm - UIHelper 已注释掉
                    return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, crsInfos).then(data => {
                        return {point, crs: new GisCrs(data.epsgCode)}
                    });
                    */
                    return Promise.reject(new GisError(GisErrorCode.CRS_NOT_FOUND, `无法识别[${point[0]},${point[1]}]所在坐标系，有${crsInfos.length}个候选`));
                }
            } else {
                try {
                    const crsInfosFull: CrsInfo[] = GisProjectedBounds.findByPoint(point);
                    if (crsInfosFull.length === 1) {
                        return Promise.resolve({
                            point,
                            crs: new GisCrs(crsInfosFull[0].epsgCode)
                        });
                    } else if (crsInfosFull.length > 1) {
                        /* [UNUSED] UIHelper.selectConfirm
                        return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, crsInfosFull).then(data => {
                            return {point, crs: new GisCrs(data.epsgCode)}
                        });
                        */
                        return Promise.reject(new GisError(GisErrorCode.CRS_NOT_FOUND, `无法识别[${point[0]},${point[1]}]所在坐标系，有${crsInfosFull.length}个候选`));
                    }
                } catch (e) {
                    logger.warn('GisCrs::_tryGetCrs coordinate recognition failed:', e);
                }

                /* [UNUSED] UIHelper.selectConfirm
                return UIHelper.selectConfirm(`无法识别[${point[0]},${point[1]}]所在坐标系，请选择`, null, Object.values(CrsBounds)).then(data => {
                    return {point, crs: new GisCrs(data.epsgCode)}
                });
                */
                return Promise.reject(new GisError(GisErrorCode.CRS_NOT_FOUND, `无法识别[${point[0]},${point[1]}]所在坐标系`));
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
                // 顺序尝试数组中的元素，await 每个 Promise
                // 修复：之前 Promise 被当作 truthy 值，导致只检查第一个元素
                const tryNext = (index: number): Promise<{ point: number[], crs: GisCrs }> => {
                    if (index >= obj.length) {
                        return Promise.reject(new GisError(GisErrorCode.CRS_RECOGNITION_FAILED, `数组中无法识别坐标系`));
                    }
                    return GisCrs._tryGetCrs(obj[index]).catch(() => tryNext(index + 1));
                };
                return tryNext(0);
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

    /**
     * 当前 CRS 是否有效（epsgCode > 0 且有 proj4 定义）
     */
    get isValid(): boolean {
        return this.epsgCode > 0 && !!this.proj4Def && Object.keys(this.proj4Def).length > 0;
    }

    /**
     * 从 CrsInfo.name 提取族名（第一个 `/` 前的部分）
     * 例如 "CGCS2000 / 3-degree Gauss-Kruger zone 25" → "CGCS2000"
     */
    static familyName(crsInfo: CrsInfo): string {
        return crsInfo.name.split('/')[0].trim();
    }

    /**
     * 投影坐标系 → 对应的地理坐标系 EPSG 代码
     */
    static getGeographicEpsg(epsgCode: number): number {
        if (epsgCode > 2300 && epsgCode < 2400) return 4610; // 西安80
        if (epsgCode > 2400 && epsgCode < 2500) return 4214; // 北京54
        if (epsgCode === 3857) return 4326;                    // Web Mercator
        if (epsgCode >= 4490 && epsgCode <= 4554) return 4490; // CGCS2000 投影系列
        return 0;
    }

    /**
     * 根据源 CRS 返回合法转换目标列表
     * 规则：
     * - 地理坐标 → 任何坐标系的投影坐标系
     * - 投影坐标 → 同系投影坐标 + 对应的地理坐标
     */
    static getCompatibleTargetCrsList(sourceCrs: CrsInfo): CrsInfo[] {
        const allCrs = Object.values(CrsBounds);
        if (!sourceCrs.projected) {
            // 地理坐标 → 任何投影坐标系
            return allCrs.filter(c => c.projected);
        } else {
            // 投影坐标 → 同系投影 + 对应地理
            const sourceFamily = GisCrs.familyName(sourceCrs);
            const geoEpsg = GisCrs.getGeographicEpsg(sourceCrs.epsgCode);
            return allCrs.filter(c => {
                if (c.epsgCode === sourceCrs.epsgCode) return false;
                const targetFamily = GisCrs.familyName(c);
                return targetFamily === sourceFamily || c.epsgCode === geoEpsg;
            });
        }
    }
}
