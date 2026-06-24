/**
 * @file Exchange data format parser
 * @description Parses electronic exchange format (电子报盘) data into GisDataInfo datasets,
 *              supporting structured text with coordinate and attribute sections.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as GeoJSON from 'geojson';
import {markRaw} from "vue";

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";
import { CrsInfo} from "~/components/data/GisProjectedBounds";

export class ExchangeDataInfo extends GisDataInfo {

}

const FLIP_XY = true;
const LINE_TAG1: string = "[属性描述]";
const LINE_TAG2: string = "[地块坐标]";
const DES_NAME_BBH: string = "格式版本号";
const DES_NAME_SJDW: string = "数据产生单位";
const DES_NAME_SJRQ: string = "数据产生日期";
const DES_NAME_ZBX: string = "坐标系";
const DES_NAME_FD: string = "几度分带";
const DES_NAME_TY: string = "投影类型";
const DES_NAME_DW: string = "计量单位";
const DES_NAME_DH: string = "带号";
const DES_NAME_JD: string = "精度";
const DES_NAME_CS: string = "转换参数";
const PROPS_NAME_JZDS: string = "界址点数";
const PROPS_NAME_DKMJ: string = "地块面积";
const PROPS_NAME_DKBH: string = "地块编号";
const PROPS_NAME_DKMC: string = "地块名称";
const PROPS_NAME_TXSX: string = "图形属性";
const PROPS_NAME_TFH: string = "图幅号";
const PROPS_NAME_DKYT: string = "地块用途";
const PROPS_NAME_DLBM: string = "地类编码";
const getExCrsName = (crsInfo: CrsInfo): string => {
    const simpleName:string =  crsInfo?.name?.split?.("/")[0].trim() || '';
    if(simpleName.includes("2000")){
        return "2000国家大地坐标系";
    }
    if(simpleName.includes("54")){
        return "54北京坐标系";
    }
    if(simpleName.includes("80")){
        return "西安80坐标系";
    }
    return "";
}
const getEpsgCode = (crsName: string, degree: string, zoneNum: string): number | null => {
    let srid: number | undefined;
    if (crsName && degree && zoneNum) {
        if (crsName.includes("80")) {
            if (degree == "3") {
                srid = Number(zoneNum) - 25 + 2349;
            }
            else if (degree == "6") {
                srid = Number(zoneNum) - 13 + 2327;
            }
        }
        if (crsName.includes("54")) {
            if (degree == "3") {
                srid = Number(zoneNum) - 25 + 2401;
            }
        }
        if (crsName.includes("2000")) {
            if (degree == "3") {
                srid = Number(zoneNum) - 25 + 4513;
            }
            else if (degree == "6") {
                srid = Number(zoneNum) - 13 + 4491;
            }
        }
    }
    return srid ? srid : null;
};

export class ExchangeDataFormat implements DataFormat {
    read(content: ArrayBuffer | string): Promise<ExchangeDataInfo> {
        return new Promise((resolve, reject) => {
            try {
                let txtContent: string | ArrayBuffer = content;
                if (content instanceof ArrayBuffer) {
                    txtContent = Common.arrayBufferToString(content) ?? '';
                }
                const lines: string[] = (txtContent as string).split(/[\r\n]/).filter((x: string) => x != "")
                const desStart = lines.indexOf(LINE_TAG1);
                const dataStart = lines.indexOf(LINE_TAG2);
                let fIndex = -1;

                const descriptions: Record<string, string> = {}
                const geoDatas: Map<number, string[]> = new Map();
                if (desStart > -1 && dataStart > -1) {
                    for (let i = 0; i < lines.length; i++) {
                        const line: string = lines[i];
                        if (i > desStart && i < dataStart) {
                            const j = line.indexOf("=");
                            if (j > 0) {
                                const key = line.substring(0, j);
                                const value = line.substring(j + 1);
                                if (key !== null && key !== undefined && key !== '') {
                                    descriptions[key] = value;
                                }
                            }
                        } else if (i > dataStart) {
                            if (line.endsWith("@")) {
                                fIndex++;
                            }
                            if (geoDatas.get(fIndex) === undefined) {
                                geoDatas.set(fIndex, []);
                            }

                            const stringList: string[] | undefined = geoDatas.get(fIndex);
                            stringList?.push(line);
                        }
                    }
                } else {
                    const datas: string[] = [];
                    datas.push(",,,,面,,,,@");
                    datas.push(...lines);
                    geoDatas.set(0, datas);
                }

                const features: GeoJSON.Feature[] = [];

                geoDatas.forEach((_value) => {
                    const geoDataLines: string[] = _value;
                    const rings: number[][][] = [];
                    const ringNumbers: number[] = [];
                    for (let i = 1; i < geoDataLines.length; i++) {
                        const split: string[] = geoDataLines[i].split(",");
                        const ringNumber = Number(split[1]);
                        if (!ringNumbers.includes(ringNumber)) {
                            ringNumbers.push(ringNumber);
                        }

                        let x: number = Number(split[2]);
                        let y: number = Number(split[3]);
                        if (FLIP_XY) {
                            y = Number(split[2]);
                            x = Number(split[3]);
                        }

                        const idx = ringNumbers.indexOf(ringNumber);
                        if (rings.length < idx + 1) {
                            rings.push([]);
                        }
                        try {
                            rings[idx].push([x, y]);
                        } catch (e) {
                            logger.error('ExchangeDataFormat: coordinate parsing failed', e);
                            throw new Error("坐标转换异常");
                        }
                    }

                    const properties: Record<string, unknown> = {};

                    const propKeys = [
                        PROPS_NAME_JZDS,
                        PROPS_NAME_DKMJ,
                        PROPS_NAME_DKBH,
                        PROPS_NAME_DKMC,
                        PROPS_NAME_TXSX,
                        PROPS_NAME_TFH,
                        PROPS_NAME_DKYT,
                        PROPS_NAME_DLBM,
                    ]
                    const propsArr = geoDataLines[0].split(',');
                    propKeys.forEach((key, idx) => {
                        properties[key] = propsArr[idx];
                    })

                    const geoTypeName: string = properties[PROPS_NAME_TXSX] as string

                    let geometry: { type: string, coordinates: number[][] | number[][][] } = {
                        type: "",
                        coordinates: []
                    };

                    switch (geoTypeName) {
                        case "点":
                            throw new Error("暂不支持点");
                        case "线":
                            if (rings.length === 1) {
                                geometry.type = "LineString";
                                geometry.coordinates = rings[0];
                            } else {
                                geometry.type = "MultiLineString";
                                geometry.coordinates = rings;
                            }
                            break;
                        case "面":
                            geometry.type = "Polygon";
                            geometry.coordinates = rings;
                            break;
                        default:
                            throw new Error("暂不支持点、线、面之外的图形类型");
                    }

                    features.push({
                        type: "Feature",
                        properties,
                        geometry: geometry as unknown as GeoJSON.Geometry
                    });
                })

                let epsgCode: number | null | undefined;
                if ([DES_NAME_ZBX, DES_NAME_DH, DES_NAME_FD].every(key => descriptions?.[key])) {
                    const crsName = descriptions[DES_NAME_ZBX];
                    const degree = descriptions[DES_NAME_FD];
                    const zoneNum = descriptions[DES_NAME_DH];
                    epsgCode = getEpsgCode(`${crsName}`, `${degree}`, `${zoneNum}`);
                }
                // 地理坐标系：计量单位为"度"且坐标系名称已知时，直接指定地理 EPSG
                if (!epsgCode && descriptions[DES_NAME_DW] === '度' && descriptions[DES_NAME_ZBX]) {
                    const crsName = descriptions[DES_NAME_ZBX];
                    if (crsName.includes('2000')) epsgCode = 4490;
                    else if (crsName.includes('80')) epsgCode = 4610;
                    else if (crsName.includes('54')) epsgCode = 4214;
                }
                if (epsgCode !== null && epsgCode !== undefined) {
                    const crs = new GisCrs(epsgCode);
                    const exDatainfo: ExchangeDataInfo = new ExchangeDataInfo("ExchangeData" + new Date().getTime(), crs);
                    exDatainfo.features = markRaw(features)
                    exDatainfo.descriptions = descriptions;
                    resolve(exDatainfo)
                }else {
                    GisCrs.tryGetCrs(features).then(crs => {
                        const info = crs.crsInfo;
                        descriptions[DES_NAME_ZBX] = getExCrsName(info)
                        descriptions[DES_NAME_FD] = String(info.zoneDegree ?? '')
                        descriptions[DES_NAME_TY] = info.projected ? "高斯克吕格" : ""
                        descriptions[DES_NAME_DW] = info.projected ? "米" : "度"
                        descriptions[DES_NAME_DH] = (info.zoneNumber ?? 0) > 0 ? String(info.zoneNumber) : ""
                        const exDatainfo: ExchangeDataInfo = new ExchangeDataInfo("ExchangeData" + new Date().getTime(), crs);
                        exDatainfo.features = markRaw(features)
                        exDatainfo.descriptions = descriptions;
                        resolve(exDatainfo)
                    }).catch((e: unknown) => {
                        logger.error('ExchangeDataFormat: tryGetCrs failed', e);
                        reject(e)
                    });
                }


            } catch (e) {
                reject(e);
            }
        })
    }

    write(exchangeDataInfo: GisDataInfo) {
        const descKeys = [
            DES_NAME_BBH,
            DES_NAME_SJDW,
            DES_NAME_SJRQ,
            DES_NAME_ZBX,
            DES_NAME_FD,
            DES_NAME_TY,
            DES_NAME_DW,
            DES_NAME_DH,
            DES_NAME_JD,
            DES_NAME_CS,
        ]
        const propKeys = [
            PROPS_NAME_JZDS,
            PROPS_NAME_DKMJ,
            PROPS_NAME_DKBH,
            PROPS_NAME_DKMC,
            PROPS_NAME_TXSX,
            PROPS_NAME_TFH,
            PROPS_NAME_DKYT,
            PROPS_NAME_DLBM,
        ]

        return new Promise<string[]>((resolve, reject) => {
            if (!exchangeDataInfo) {
                reject(new Error('Data is Empty'));
                return;
            }
            try {
                const lines: string[] = [];
                let descriptions: Record<string, unknown> = exchangeDataInfo?.descriptions as Record<string, unknown>;
                if (descriptions === undefined) {
                    descriptions = {}
                }
                // 始终根据当前 crs 更新坐标系相关描述，确保坐标转换后头部信息同步
                const crs: GisCrs | undefined = exchangeDataInfo.crs
                if (crs) {
                    const info = crs.crsInfo;
                    descriptions[DES_NAME_ZBX] = getExCrsName(info);
                    descriptions[DES_NAME_FD] = (info.zoneDegree ?? 0) > 0 ? info.zoneDegree : ""
                    descriptions[DES_NAME_TY] = info.projected ? "高斯克吕格" : ""
                    descriptions[DES_NAME_DW] = info.projected ? "米" : "度"
                    descriptions[DES_NAME_DH] = (info.zoneNumber ?? 0) > 0 ? info.zoneNumber : ""
                    // 数据产生日期始终更新为当前时间
                    descriptions[DES_NAME_SJRQ] = new Date().toLocaleString();
                }
                const features = exchangeDataInfo.features;
                lines.push(LINE_TAG1)

                descKeys.forEach(key => {
                    const description = (descriptions === undefined || descriptions[key] === undefined) ? "" : descriptions[key];
                    lines.push(`${key}=${description}`)
                })
                lines.push(LINE_TAG2)
                features.forEach((feature, idx) => {
                    const props: unknown[] = []
                    if (!feature.properties) {
                        let idxLabel = '000000' + (idx + 1);
                        idxLabel = idxLabel.substring(idxLabel.length - 6);
                        const count: number = GeomUtils.getCoordinatesCount(feature);
                        feature.properties = {
                            [PROPS_NAME_JZDS]: count,
                            [PROPS_NAME_DKBH]: idxLabel,
                            [PROPS_NAME_DKMC]: "地块" + idxLabel,
                        }

                    } else {
                        const properties = feature.properties;
                        propKeys.forEach(key => {
                            props.push(properties[key])
                        })
                    }

                    const coordinates = (feature.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates;
                    let point_idx = 1;
                    const firstLevel = coordinates[0] as unknown[];
                    const secondLevel = firstLevel?.[0] as unknown[];
                    if (Array.isArray(secondLevel?.[0])) {
                        (coordinates as unknown[][][][]).forEach((geo: unknown[][][]) => {
                            lines.push(`${props.join(",")}@`)
                            geo.forEach((ring: unknown[][], ring_idx: number) => {
                                let firstPointIdx = point_idx
                                for (let i = 0; i < ring.length; i++) {
                                    const isLast = i === ring.length - 1;
                                    const point = (ring[i] as number[]).slice();
                                    if (FLIP_XY) {
                                        point.reverse()
                                    }
                                    if (isLast) {
                                        lines.push(`J${firstPointIdx},${ring_idx + 1},${point.join(",")}`)
                                    } else {
                                        lines.push(`J${point_idx},${ring_idx + 1},${point.join(",")}`)
                                    }
                                    point_idx++
                                }
                            })
                        })
                    } else if (Array.isArray((coordinates as unknown[][])?.[0]?.[0])) {
                        lines.push(`${props.join(",")}@`);
                        (coordinates as unknown[][][]).forEach((ring: unknown[][], ring_idx: number) => {
                            let firstPointIdx = point_idx
                            for (let i = 0; i < ring.length; i++) {
                                const isLast = i === ring.length - 1;
                                const point = (ring[i] as number[]).slice();
                                if (FLIP_XY) {
                                    point.reverse()
                                }
                                if (isLast) {
                                    lines.push(`J${firstPointIdx},${ring_idx + 1},${point.join(",")}`)
                                } else {
                                    lines.push(`J${point_idx},${ring_idx + 1},${point.join(",")}`)
                                }
                                point_idx++
                            }
                        })
                    }
                })
                resolve(lines);
            } catch (e) {
                reject(e)
            }
        })
    }

}
