import * as Wkx from "wkx";

import Common from "~/common/Common";
import {logger} from "~/common/logger";
import {DataFormat} from "~/components/data/DataFormat";
import GisCrs from "~/components/data/GisCrs";
import GisDataInfo from "~/components/data/GisDataInfo";

export class WktDataFormat implements DataFormat {

    read(content: string | ArrayBuffer): Promise<GisDataInfo> {
        return new Promise<GisDataInfo>((resolve, reject) => {
            try {
                let textContent: string | ArrayBuffer = content;
                if (content instanceof ArrayBuffer) {
                    const str = Common.arrayBufferToString(content);
                    textContent = str ?? '';
                }
                if ((textContent as string).startsWith("GEOMETRYCOLLECTION")) {
                    const geometryCollection = Wkx.Geometry.parse((textContent as string).replace(/[\r\n]/g, "")) as Wkx.Geometry & { geometries: Wkx.Geometry[] };
                    const features: GeoJSON.Feature[] = geometryCollection.geometries.map((geometry: Wkx.Geometry) => {
                        const geoJson = geometry.toGeoJSON()
                        return {
                            type: "Feature" as const,
                            geometry: geoJson as GeoJSON.Geometry,
                            properties: {}
                        }
                    })

                    GisCrs.tryGetCrs(features).then((crs: GisCrs) => {
                        const gisDataInfo = new GisDataInfo("Wkt" + new Date().getTime(), crs);
                        gisDataInfo.features = features;
                        resolve(gisDataInfo);
                    }).catch((e: unknown) => {
                        logger.error('WktDataFormat: tryGetCrs failed', e);
                        reject(e)
                    });
                } else {
                    const wktKeys = ["POINT", "LINESTRING", "POLYGON", "MULTIPOLYGON", "MULTILINESTRING", "MULTIPOINT"];

                    const wkts: string[] = [];
                    let matchAll: RegExpExecArray[] = [];

                    if ((textContent as string).trim() === '') {
                        logger.warn('textContent is empty');
                        reject(new Error('textContent is empty'));
                        return;
                    }

                    if (!wktKeys || wktKeys.length === 0) {
                        logger.warn('wktKeys is empty');
                        reject(new Error('wktKeys is empty'));
                        return;
                    }

                    const regex = new RegExp(`(${wktKeys.join('|')})`, 'g');

                    let match: RegExpExecArray | null;
                    while ((match = regex.exec(textContent as string)) !== null) {
                        matchAll.push(match);
                    }

                    let curIdx = 0;
                    for (const item of matchAll) {
                        const wkt = (textContent as string).substring(curIdx, item.index).replace(/[\r\n]/g, "").trim();
                        if (wkt.length > 0) {
                            wkts.push(wkt);
                        }
                        curIdx = item.index;
                    }
                    if (curIdx < (textContent as string).length) {
                        const lastWkt = (textContent as string).substring(curIdx).replace(/[\r\n]/g, "").trim();
                        if (lastWkt.length > 0) {
                            wkts.push(lastWkt);
                        }
                    }
                    const features: GeoJSON.Feature[] = wkts.map(wkt => {
                        const geometry = Wkx.Geometry.parse(wkt);
                        const geoJson = geometry.toGeoJSON()
                        return {
                            type: "Feature" as const,
                            geometry: geoJson as GeoJSON.Geometry,
                            properties: {}
                        }
                    })
                    GisCrs.tryGetCrs(features).then((crs: GisCrs) => {
                        const gisDataInfo = new GisDataInfo("Wkt" + new Date().getTime(), crs);
                        gisDataInfo.features = features;
                        resolve(gisDataInfo);
                    }).catch((e: unknown) => {
                        logger.error('WktDataFormat: tryGetCrs failed', e);
                        reject(e)
                    });
                }

            } catch (e) {
                reject(e)
            }
        })
    }

    write(gisDataInfo: GisDataInfo): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                const wkts = gisDataInfo.features.map(fea => Wkx.Geometry.parseGeoJSON(fea.geometry).toWkt())
                resolve(wkts);
            } catch (e) {
                reject(e)
            }
        })
    }
}
