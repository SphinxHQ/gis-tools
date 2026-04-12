import {DataFormat} from "~/components/data/DataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";

export class DxfDataFormat implements DataFormat {

    async read(content: string | ArrayBuffer): Promise<GisDataInfo> {
        throw new Error('DXF format parsing is not yet implemented. Please use supported formats: GeoJSON, WKT, Shapefile, etc.');
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
