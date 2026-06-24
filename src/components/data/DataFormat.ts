/**
 * @file Data format registry and parsing
 * @description Central data format module that aggregates all supported spatial data format parsers
 *              (GeoJSON, WKT, WKB, Shapefile, ShapeZip, DXF, EXF, Exchange, ResponseBase, Base64)
 *              and provides a unified parsing interface via SimpleDataFormat.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {GisError, GisErrorCode} from "~/common/GisError";
import {DxfDataFormat} from "~/components/data/DxfDataFormat";
import {ExchangeDataFormat} from "~/components/data/ExchangeDataFormat";
import {ExfDataFormat} from "~/components/data/ExfDataFormat";
import {GeoJsonDataFormat} from "~/components/data/GeoJsonDataFormat";
import GisDataInfo, {GisDataType} from "~/components/data/GisDataInfo";
import {ResponseBaseDataFormat} from "~/components/data/ResponseBaseDataFormat";
import {ShapeFileDataFormat} from "~/components/data/ShapeFileDataFormat";
import {ShapeZipDataFormat} from "~/components/data/ShapeZipDataFormat";
import {WkbDataFormat} from "~/components/data/WkbDataFormat";
import {WktDataFormat} from "~/components/data/WktDataFormat";

export interface DataFormat {
    read(content: unknown): Promise<GisDataInfo>;
    write(dataInfo: GisDataInfo): Promise<unknown>;
}

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    let b64 = base64;
    if (b64.startsWith("data:")) {
        b64 = b64.substring(b64.indexOf("base64,") + 7)
    }
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export const getDataType = (content: unknown): GisDataType => {
    let geoString: string;
    if (content instanceof ArrayBuffer) {
        if (content.byteLength < 4) {
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Content is too small to identify format');
        }
        const dataView = new DataView(content);
        const fileFlag = dataView.getInt32(0);
        if (fileFlag === 0x504B0304) {
            return GisDataType.ShapeZip;
        }
        if (fileFlag === 0x0000270a) {
            return GisDataType.ShapeFile;
        }
        if (fileFlag === 0x48656164) {
            return GisDataType.EXF;
        }
        if (fileFlag === 0x2020300D) {
            return GisDataType.DXF;
        }
        geoString = new TextDecoder("GBK").decode(content)
    } else {
        geoString = content as string;
        if (!content || content === '') {
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'Content is null');
        }
    }
    const val = geoString.trim();
    let _type: GisDataType | undefined;

    if (val.startsWith("data:")) {
        const arrayBuffer = base64ToArrayBuffer(content as string);
        return getDataType(arrayBuffer);
    }
    if (val.startsWith("{") && val.endsWith("}")) {
        try {
            const jsonObj = JSON.parse(geoString);
            const geoJsonTypes = GeoJsonDataFormat.TYPES;
            if (geoJsonTypes.includes(jsonObj.type)) {
                _type = GisDataType.GeoJson;
            } else {
                if (jsonObj.status !== undefined &&
                    jsonObj.message !== undefined &&
                    jsonObj.result !== undefined) {
                    _type = GisDataType.ResponseBase;
                }
            }
        } catch {
            throw new GisError(GisErrorCode.DATA_PARSE_FAILED, 'GeoString is not GeoJson');
        }
    }

    const WKT_PREFIX = ["POINT", "LINESTRING", "POLYGON", "MULTIPOINT", "MULTILINESTRING", "MULTIPOLYGON", "GEOMETRYCOLLECTION"];
    for (const prefix of WKT_PREFIX) {
        if (val.startsWith(prefix)) {
            _type = GisDataType.Wkt;
            break;
        }
    }

    if (val.startsWith("01") || val.startsWith("00")) {
        _type = GisDataType.Wkb;
    }

    if (val.startsWith("[属性描述]")) {
        _type = GisDataType.Exchange;
    }

    if (_type !== undefined) {
        return _type;
    } else {
        const rows = val.split('\n');
        if (rows.length > 1) {
            return GisDataType.Csv
        }
    }

    throw new GisError(GisErrorCode.DATA_FORMAT_UNSUPPORTED, 'This GeoString is not supported ：' + val);
}

export class SimpleDataFormat implements DataFormat {
    createFormatter(content: ArrayBuffer | string): DataFormat {
        const type = getDataType(content);
        let formatter: DataFormat;
        switch (type) {
            case GisDataType.Base64:
                throw new GisError(GisErrorCode.DATA_FORMAT_UNSUPPORTED, "Unsupported data type: Base64");
            case GisDataType.GeoJson:
                formatter = new GeoJsonDataFormat();
                break;
            case GisDataType.Wkt:
                formatter = new WktDataFormat();
                break;
            case GisDataType.Wkb:
                formatter = new WkbDataFormat();
                break;
            case GisDataType.Csv:
            case GisDataType.Exchange:
                formatter = new ExchangeDataFormat();
                break;
            case GisDataType.ResponseBase:
                formatter = new ResponseBaseDataFormat();
                break;
            case GisDataType.ShapeFile:
                formatter = new ShapeFileDataFormat();
                break;
            case GisDataType.ShapeZip:
                formatter = new ShapeZipDataFormat();
                break;
            case GisDataType.EXF:
                formatter = new ExfDataFormat();
                break;
            case GisDataType.DXF:
                formatter = new DxfDataFormat();
                break;
            default:
                throw new GisError(GisErrorCode.DATA_FORMAT_UNSUPPORTED, "Unsupported data type:" + type);
        }
        return formatter
    }

    read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        if (typeof content === 'string') {
            if (content.startsWith("data:")) {
                content = base64ToArrayBuffer(content);
            }
        }
        const formatter = this.createFormatter(content);
        return formatter.read(content);
    }

    write(dataInfo: GisDataInfo): Promise<unknown> {
        // Default to GeoJSON format for writing
        const formatter = new GeoJsonDataFormat();
        return formatter.write(dataInfo);
    }
}
