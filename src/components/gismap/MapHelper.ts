/**
 * @file Map helper utilities
 * @description Provides factory helpers for creating OpenLayers map and view instances
 *              with default options (center, zoom, projection).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import "ol/ol.css";
import { Map as olMap, View as olView } from "ol";

import { GisMapOption } from "./GisMap";


export default {
    /**
     * Create a new OpenLayers map instance
     * @param mapTarget - Target element or element id for the map container
     * @param options - Optional map configuration (center, zoom, projection, rotation)
     * @returns A configured olMap instance
     */
    newOlMapInstance(mapTarget: string | HTMLElement , options?: GisMapOption): olMap {
        const defaultOptions: GisMapOption ={
            center: [104.195, 35.8],
            zoom: 4,
            projection: 'EPSG:4490'
        }
        return new olMap({
            target: mapTarget,
            view: new olView(Object.assign(Object.assign(defaultOptions, options)))
        });
    },
}