/**
 * @file WKB data format parser
 * @description Parses WKB (Well-Known Binary) data into GisDataInfo datasets using the wkx library.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import * as Wkx from "wkx";

import {GisError, GisErrorCode} from "~/common/GisError";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";

export class WkbDataFormat implements DataFormat {

    async read(_content: string | ArrayBuffer): Promise<GisDataInfo> {
        throw new Error('WKB format reading is not yet implemented. Please use supported formats: GeoJSON, WKT, Shapefile, etc.');
    }

    async write(gisDataInfo: GisDataInfo): Promise<string[]> {
        if (!gisDataInfo.features || gisDataInfo.features.length === 0) {
            logger.warn('WkbDataFormat: No features to convert');
            return [];
        }

        const wkbs = gisDataInfo.features.map(fea => {
            if (!fea.geometry) {
                throw new GisError(GisErrorCode.DATA_PARSE_FAILED,
                    `Feature has null or undefined geometry: ${JSON.stringify(fea)}`);
            }
            return Wkx.Geometry.parseGeoJSON(fea.geometry).toWkb();
        });

        return wkbs.map(buf => buf.toString('hex'));
    }
}
