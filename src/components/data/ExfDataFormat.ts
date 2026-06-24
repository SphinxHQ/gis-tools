/**
 * @file EXF data format parser
 * @description Parses EXF (Exchange Format) data into GisDataInfo datasets using the ExfPaser.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import type * as GeoJSON from 'geojson';

import Common from "~/common/Common";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import ExfPaser from "~/components/data/ExfPaser";
import GisDataInfo from "~/components/data/GisDataInfo";

export class ExfDataFormat implements DataFormat {

    async read(content: string | ArrayBuffer): Promise<GisDataInfo> {
        let textContent: string | ArrayBuffer = content;
        if (content instanceof ArrayBuffer) {
            textContent = Common.arrayBufferToString(content) ?? '';
        }

        const gisDataInfo = new GisDataInfo("EXF" + new Date().getTime());
        const exfPaser = new ExfPaser();
        exfPaser.parse(textContent as string);
        const blocks = exfPaser.blocks as Record<string, Array<{ wkt: string; properties: { F_BUILDING_NO: string; ID: string }; [k: string]: unknown }>> | undefined;
        if (blocks && Array.isArray(blocks.Polygon) && blocks.Polygon.length > 0) {
            gisDataInfo.features = blocks.Polygon
                .map((x): GeoJSON.Feature => {
                    return { wkt: x.wkt, info: x.properties.F_BUILDING_NO, handle: x.properties.ID, data: x } as unknown as GeoJSON.Feature
                })
        } else {
            logger.warn('ExfDataFormat 解析失败');
        }
        return gisDataInfo;
    }

    write(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                resolve([]);
            } catch (e) {
                reject(e)
            }
        })
    }
}
