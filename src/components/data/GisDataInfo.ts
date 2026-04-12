import * as GeoJSON from 'geojson';
import GisCrs from "~/components/data/GisCrs";
import {logger} from "~/common/logger";
import {GisError, GisErrorCode} from "~/common/GisError";

export enum GisDataType {
    // Base64编码格式
    Base64,
    // 地理JSON格式
    GeoJson,
    // Well-Known Text格式
    Wkt,
    // Well-Known Binary格式
    Wkb,
    // 电子报盘格式
    Exchange,
    // CSV格式
    Csv,
    // ANTU响应数据格式
    ResponseBase,
    ShapeFile,
    ShapeZip,
    EXF,
    DXF,
}

export interface DataInfo {
    name: string;
    originalData: unknown;
    descriptions?: Record<string, unknown>;
    features: GeoJSON.Feature[];
    crs?: GisCrs;
}

export class EmptyDataInfo implements DataInfo {
    descriptions?: Record<string, unknown>;
    features: GeoJSON.Feature[] = [];
    name: string = "";
    originalData: unknown = null;
    
    constructor() {}
}

/**
 * 表示地理信息系统数据的信息类
 */
export default class GisDataInfo implements DataInfo {
    // 数据名称
    public name: string;
    // 原始数据内容
    public originalData: unknown;
    // 数据描述信息
    public descriptions?: Record<string, unknown>;
    // 几何要素
    public features: GeoJSON.Feature[];
    // 坐标系统信息
    public crs?: GisCrs

    /**
     * 构造函数，初始化地理信息系统数据的信息
     * @param options 配置参数对象，可选包含EPSG代码
     */
    constructor(_name?: string, _crs?: GisCrs | number) {
        // 根据提供的EPSG代码初始化坐标系统
        this.features = []
        this.name = _name || "未命名";
        if (_crs instanceof GisCrs) {
            this.crs = _crs;
        } else if (typeof _crs === "number") {
            this.crs = new GisCrs(_crs);
        }
    }

    getTypes(): string[] {
        if (this.features.length > 0) {
            const allTypes = this.features
                .map(x => x.geometry?.type)
                .filter((type): type is string => type !== undefined);
            return [...new Set(allTypes)];
        }
        return [];
    }

    static clone(originData: GisDataInfo): GisDataInfo {
        const gisDataInfo = new GisDataInfo(originData.name, originData.crs);
        try {
            gisDataInfo.features = JSON.parse(JSON.stringify(originData.features));
            if (originData.descriptions) {
                gisDataInfo.descriptions = JSON.parse(JSON.stringify(originData.descriptions));
            }
        } catch (e) {
            logger.error('Failed to clone GisDataInfo:', e);
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Clone operation failed', e);
        }
        return gisDataInfo;
    }
}
