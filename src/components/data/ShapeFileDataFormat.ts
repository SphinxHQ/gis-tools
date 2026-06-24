/**
 * @file Shapefile data format parser
 * @description Parses Shapefile (.shp) binary data into GisDataInfo datasets
 *              using the @sphinx_hq/shapefile-parser library.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {ShapefileParser} from '@sphinx_hq/shapefile-parser';
import * as GeoJSON from 'geojson';

import Common from "~/common/Common";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class ShapeFileDataFormat implements DataFormat {
    private parser = new ShapefileParser();

    async read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        if (typeof content === 'string') {
            content = Common.base64ToArrayBuffer(content);
        }

        const result = await this.parser.read(content as ArrayBuffer);
        const keys = Object.keys(result);
        const firstKey = keys[0];
        const geojson = result[firstKey];

        let crs: GisCrs;
        if (geojson.crs) {
            const epsgCode = typeof geojson.crs === 'string'
                ? parseInt(geojson.crs.replace('EPSG:', ''))
                : geojson.crs.code || 0;
            crs = epsgCode ? new GisCrs(epsgCode) : await GisCrs.tryGetCrs(geojson);
        } else {
            crs = await GisCrs.tryGetCrs(geojson);
        }

        const gisDataInfo = new GisDataInfo("ShapeFile_" + firstKey, crs);
        // 过滤掉 geometry 为 null 的要素
        const validFeatures = geojson.features.filter(f => f.geometry !== null);
        gisDataInfo.features.push(...validFeatures as GeoJSON.Feature[]);

        return gisDataInfo;
    }

    write(): Promise<string> {
        return Promise.reject(new Error("ShapeFileDataFormat::write Not implemented"));
    }
}
