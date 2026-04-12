import * as GeoJSON from 'geojson';

import Common from "~/common/Common";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class ResponseBase {
    status: string = '';
    message: string = '';
    result: unknown;
}

export class ResponseBaseDataFormat implements DataFormat {

    getFeatures(result: unknown): GeoJSON.Feature[] {
        const resultFeatures: GeoJSON.Feature[] = [];
        if (Array.isArray(result)) {
            result.forEach(f => {
                resultFeatures.push(f);
            });
        } else {
            if (typeof result === 'object' && result !== null) {
                const record = result as Record<string, unknown>;
                const struckKeys = ["features", "INTERSECT"]
                const keys = Object.keys(record);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    if (struckKeys.includes(key)) {
                        if (Array.isArray(record[key])) {
                            resultFeatures.push(...(record[key] as GeoJSON.Feature[]));
                        } else {
                            resultFeatures.push(record[key] as GeoJSON.Feature);
                        }
                    }
                }
            }
            const record = result as Record<string, unknown>;
            if (record?.type === 'Feature') {
                resultFeatures.push(result as GeoJSON.Feature);
            }
            if (record?.type !== undefined && Array.isArray(record?.coordinates)) {
                resultFeatures.push({
                    type: "Feature",
                    geometry: result as unknown as GeoJSON.Geometry,
                    properties: {}
                });
            }
        }
        return resultFeatures;
    }

    read(txtContent: ArrayBuffer | string): Promise<GisDataInfo> {
        return new Promise<GisDataInfo>((resolve, reject) => {
            try {
                if (txtContent instanceof ArrayBuffer) {
                    txtContent = Common.arrayBufferToString(txtContent) ?? '';
                }
                const responseBase: ResponseBase = JSON.parse(txtContent as string);
                let result: unknown;
                if (typeof responseBase.result === 'string') {
                    try {
                        result = JSON.parse(responseBase.result)
                    } catch (_e) {
                        result = responseBase.result;
                    }
                }

                const resultFeatures = this.getFeatures(result);
                GisCrs.tryGetCrs(resultFeatures).then((crs: GisCrs) => {
                    const gisDataInfo = new GisDataInfo("ResponseBase " + new Date().getTime(), crs);
                    gisDataInfo.features = resultFeatures;
                    resolve(gisDataInfo);
                }).catch((e: unknown) => {
                    logger.error('ResponseBaseDataFormat: tryGetCrs failed', e);
                    reject(e)
                });

            } catch (e) {
                reject(e)
            }
        })
    }

    write(gisDataInfo: GisDataInfo): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            try {
                const s = JSON.stringify({
                    type: "FeatureCollection",
                    features: gisDataInfo.features
                });
                resolve(s);
            } catch (e) {
                reject(e)
            }

        });
    }
}
