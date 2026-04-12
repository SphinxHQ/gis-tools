import * as GeoJSON from 'geojson';
import shp from 'shpjs';

import Common from "~/common/Common";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class ShapeFileDataFormat implements DataFormat {
    read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        return new Promise<GisDataInfo>((resolve, reject) => {
            try {
                if (typeof content === 'string') {
                    content = Common.base64ToArrayBuffer(content);
                }
                shp({shp: content}).then((result: GeoJSON.GeoJsonObject | GeoJSON.GeoJsonObject[]) => {
                    GisCrs.tryGetCrs(result).then((crs: GisCrs) => {
                        const gisDataInfo = new GisDataInfo("ShapeFile" + new Date().getTime(), crs);
                        if (Array.isArray(result)) {
                            result.forEach(geojson => {
                                if ('features' in geojson && Array.isArray(geojson.features)) {
                                    gisDataInfo.features.push(...geojson.features);
                                }
                            });
                        } else if ('features' in result && Array.isArray(result.features)) {
                            gisDataInfo.features.push(...result.features);
                        }
                        resolve(gisDataInfo);
                    }).catch((e: unknown) => {
                        logger.error('ShapeFile tryGetCrs failed:', e);
                        reject(e);
                    });
                }).catch(e => {
                    reject(e);
                });
            } catch (e) {
                reject(e)
            }
        })
    }

    write(): Promise<string> {
        return Promise.reject(new Error("ShapeFileDataFormat::write Not implemented"));
    }
}
