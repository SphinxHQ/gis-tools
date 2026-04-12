import * as GeoJSON from 'geojson';
import {markRaw} from "vue";

import Common from "~/common/Common";
import {GisError, GisErrorCode} from "~/common/GisError";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";
import {WktDataFormat} from "~/components/data/WktDataFormat";

export class GeoJsonDataFormat implements DataFormat {

    static TYPES = ["Feature", "FeatureWkt", "FeatureCollection", "Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"]

    async toFeatureCollection(obj: unknown): Promise<GeoJSON.FeatureCollection> {
        if (Array.isArray(obj)) {
            return {
                type: "FeatureCollection",
                features: obj.map((data) => {
                    if (data.type === "Feature") {
                        return data;
                    } else {
                        return this.toFeatureCollection(data)
                    }
                }).flat()
            } as GeoJSON.FeatureCollection
        }
        const record = obj as Record<string, unknown>;
        if (GeoJsonDataFormat.TYPES.includes(record?.type as string)) {
            const theType = record.type;
            switch (theType) {
                case "FeatureCollection":
                    return this.toFeatureCollection(record.features);
                case "Feature":
                    return this.toFeatureCollection([obj]);
                case "FeatureWkt":
                    if (record?.geometry !== undefined && typeof record?.geometry === 'string') {
                        const wktStr: string = record.geometry as string;
                        const gisDataInfo: GisDataInfo = await new WktDataFormat().read(wktStr);
                        return { type: "FeatureCollection", features: gisDataInfo.features } as GeoJSON.FeatureCollection;
                    } else {
                        throw new GisError(GisErrorCode.DATA_PARSE_FAILED, "EMPTY geometry context , type: FeatureWkt");
                    }
                default:
                    if(Array.isArray(record?.coordinates) && record?.type) {
                        return this.toFeatureCollection({
                            geometry: obj,
                            properties: {},
                            type: "Feature"
                        });
                    }else {
                        throw new GisError(GisErrorCode.DATA_PARSE_FAILED, "Input Object is not a Geometry : " + JSON.stringify(obj));
                    }
            }
        }else {
            if(Common.isPrimitive(obj)) {
                throw new GisError(GisErrorCode.DATA_PARSE_FAILED, "Input is primitive, not valid GeoJSON");
            }
            return { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;
        }
    }

    read(content: ArrayBuffer | string): Promise<GisDataInfo> {
        return new Promise(async (resolve, reject) => {
            try {
                let txtContent: string | ArrayBuffer = content;
                if (content instanceof ArrayBuffer) {
                    txtContent = Common.arrayBufferToString(content) ?? '';
                }

                const jsonObj = JSON.parse(txtContent as string);
                const descriptions: Record<string, unknown> = jsonObj?.descriptions;
                const fc = await this.toFeatureCollection(jsonObj);
                const features: GeoJSON.Feature[] = fc?.features || [];
                if (features.length === 0) {
                    reject(new GisError(GisErrorCode.DATA_PARSE_FAILED, "GeoJsonDataFormat.read: no features found"));
                    return;
                }
                GisCrs.tryGetCrs(features).then((crs: GisCrs) => {
                    const gisDataInfo = new GisDataInfo("GeoJson" + new Date().getTime(), crs);
                    gisDataInfo.features = markRaw(features)
                    gisDataInfo.descriptions = descriptions;
                    resolve(gisDataInfo);
                }).catch((e: unknown) => {
                    logger.error('GeoJsonDataFormat: tryGetCrs failed', e);
                    reject(e)
                });

            } catch (e) {
                reject(e)
            }
        })
    }

    write(dataInfo: GisDataInfo): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const {features} = dataInfo;
                const geoJson = {
                    type: "FeatureCollection",
                    features: features
                }
                resolve(JSON.stringify(geoJson))
            } catch (e) {
                reject(e)
            }
        })
    }
}
