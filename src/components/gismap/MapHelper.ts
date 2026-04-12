import "ol/ol.css";
import { Map as olMap, View as olView } from "ol";

import { GisMapOption } from "./GisMap";


export default {
    newOlMapInstance(mapTarget: string | HTMLElement , options?: GisMapOption): olMap {
        const defaultOptions: GisMapOption ={
            center: [106.6, 29.6],
            zoom: 12,
            projection: 'EPSG:4490'
        }
        return new olMap({
            target: mapTarget,
            view: new olView(Object.assign(Object.assign(defaultOptions, options)))
        });
    },
}