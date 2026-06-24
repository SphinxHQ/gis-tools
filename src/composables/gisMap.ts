/**
 * @file Map instance management
 * @description Provides global access to the main GisMap instance and proj4 definition registry.
 *              Exports setters/getters for the main map and a collection of registered proj4 definitions.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */
import proj4 from 'proj4';
import { ref } from "vue";

import { GisMap } from "~/components/gismap/GisMap";

const  _mainMap = ref<GisMap>();
/**
 * Set the main map instance
 * @param map - The GisMap instance to set as main
 */
export const setMainMap = (map:GisMap)=>{
    _mainMap.value = map;
}
/**
 * Get the main map instance
 * @returns The current main GisMap instance or undefined
 */
export const getMainMap = ()=>{
    return _mainMap.value;
}
/**
 * Represents a proj4 definition item
 */
export interface proj4DefItem {
    /** Definition name */
    name:string,
    /** Proj4 definition object */
    proj4: unknown
}
export const getAllProj4Defs = ()=>{
    return Object.getOwnPropertyNames(proj4.defs);
}