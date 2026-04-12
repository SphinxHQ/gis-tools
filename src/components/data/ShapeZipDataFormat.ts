import {ShapefileParser} from '@sphinx_hq/shapefile-parser';
import * as GeoJSON from 'geojson';

import Common from "~/common/Common";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class ShapeZipDataFormat implements DataFormat {
    private parser = new ShapefileParser();

    async read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        if (typeof content === 'string') {
            content = Common.base64ToArrayBuffer(content);
        }

        const result = await this.parser.read(content as ArrayBuffer);
        const keys = Object.keys(result);

        // 获取第一个图层的 CRS
        const firstKey = keys[0];
        const firstGeojson = result[firstKey];

        let crs: GisCrs;
        if (firstGeojson.crs) {
            const epsgCode = typeof firstGeojson.crs === 'string'
                ? parseInt(firstGeojson.crs.replace('EPSG:', ''))
                : firstGeojson.crs.code || 0;
            crs = epsgCode ? new GisCrs(epsgCode) : await GisCrs.tryGetCrs(firstGeojson);
        } else {
            crs = await GisCrs.tryGetCrs(firstGeojson);
        }

        const gisDataInfo = new GisDataInfo("ShapeZip_" + keys.join('_'), crs);

        // 合并所有图层的 features，过滤掉 geometry 为 null 的要素
        for (const key of keys) {
            const validFeatures = result[key].features.filter(f => f.geometry !== null);
            gisDataInfo.features.push(...validFeatures as GeoJSON.Feature[]);
        }

        return gisDataInfo;
    }

    write(): Promise<string> {
        return Promise.reject(new Error("ShapeZipDataFormat::write Not implemented"));
    }
}
