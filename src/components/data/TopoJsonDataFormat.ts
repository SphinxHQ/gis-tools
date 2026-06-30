/**
 * @file TopoJSON data format parser
 * @description TopoJSON 转换器：read 时将 TopoJSON 归一化为 GeoJSON.Feature[]（统一内存模型），
 *              write 时将 GeoJSON.Feature[] 转换为 TopoJSON 拓扑结构。
 *              仅作为数据存储类型，使用过程中一律使用 GeoJSON。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-27
 */
import * as GeoJSON from 'geojson';
import { feature } from 'topojson-client';
import { topology } from 'topojson-server';
import type { Topology, GeometryObject } from 'topojson-specification';
import { markRaw } from "vue";

import Common from "~/common/Common";
import { GisError, GisErrorCode } from "~/common/GisError";
import { logger } from "~/common/logger";
import { DataFormat } from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class TopoJsonDataFormat implements DataFormat {

    /**
     * 判断对象是否为 TopoJSON 拓扑结构
     * TopoJSON 规范要求顶层包含 type="Topology"、objects、arcs 字段
     */
    static isTopoJson(obj: unknown): boolean {
        if (!obj || typeof obj !== 'object') return false;
        const record = obj as Record<string, unknown>;
        return record.type === 'Topology'
            && record.objects !== undefined
            && record.arcs !== undefined;
    }

    read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        return new Promise(async (resolve, reject) => {
            try {
                let txtContent: string;
                if (content instanceof ArrayBuffer) {
                    txtContent = Common.arrayBufferToString(content) ?? '';
                } else {
                    txtContent = content;
                }

                const topoObj = JSON.parse(txtContent);
                if (!TopoJsonDataFormat.isTopoJson(topoObj)) {
                    reject(new GisError(GisErrorCode.DATA_PARSE_FAILED,
                        "TopoJsonDataFormat.read: invalid TopoJSON structure (missing type/objects/arcs)"));
                    return;
                }

                const topologyObj = topoObj as Topology;
                // 遍历 objects，每个对象转成 FeatureCollection 或 Feature
                const features: GeoJSON.Feature[] = [];
                const objectNames = Object.keys(topologyObj.objects);
                for (const name of objectNames) {
                    const geoObj = topologyObj.objects[name] as GeometryObject;
                    if (!geoObj) continue;
                    // feature() 返回 FeatureCollection 或 Feature
                    const result = feature(topologyObj, geoObj);
                    if ((result as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
                        features.push(...(result as GeoJSON.FeatureCollection).features);
                    } else if ((result as GeoJSON.Feature).type === 'Feature') {
                        features.push(result as GeoJSON.Feature);
                    }
                }

                if (features.length === 0) {
                    reject(new GisError(GisErrorCode.DATA_PARSE_FAILED,
                        "TopoJsonDataFormat.read: no features found in topology objects"));
                    return;
                }

                // CRS 提取：优先使用 TopoJSON 中的 crs 属性，否则自动识别
                let crs: GisCrs | undefined;
                const crsObj = (topoObj as Record<string, unknown>).crs as
                    { type: string; properties: { name: string } } | undefined;
                const crsName = crsObj?.properties?.name;
                if (crsName && crsName.startsWith('EPSG:')) {
                    const epsgCode = parseInt(crsName.replace('EPSG:', ''));
                    crs = new GisCrs(epsgCode);
                } else {
                    try {
                        crs = await GisCrs.tryGetCrs(features);
                    } catch (e) {
                        logger.warn('TopoJsonDataFormat: tryGetCrs failed', e);
                    }
                }

                const gisDataInfo = new GisDataInfo("TopoJson" + new Date().getTime(), crs);
                gisDataInfo.features = markRaw(features);
                // 保留原始 TopoJSON 以便溯源（仅作存储参考，使用时仍按 features 处理）
                gisDataInfo.originalData = topoObj;
                resolve(gisDataInfo);
            } catch (e) {
                reject(e);
            }
        });
    }

    write(dataInfo: GisDataInfo): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const { features, crs } = dataInfo;
                if (!features || features.length === 0) {
                    reject(new GisError(GisErrorCode.DATA_PARSE_FAILED,
                        "TopoJsonDataFormat.write: no features to convert"));
                    return;
                }
                const geojson: GeoJSON.FeatureCollection = {
                    type: "FeatureCollection",
                    features: features
                };
                // 使用 topojson-server 的 topology() 将 GeoJSON 转 TopoJSON
                // key 命名为 'data'，对应 topology.objects.data
                const topo = topology({ data: geojson }) as Topology;
                // 附加 CRS 信息（与 GeoJSON 导出格式保持一致）
                if (crs && crs.isValid) {
                    (topo as unknown as Record<string, unknown>).crs = {
                        type: "name",
                        properties: { name: `EPSG:${crs.epsgCode}` }
                    };
                }
                resolve(JSON.stringify(topo));
            } catch (e) {
                reject(e);
            }
        });
    }
}
