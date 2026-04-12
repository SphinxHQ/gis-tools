import proj4 from 'proj4';
import { ref } from "vue";

import { GisMap } from "~/components/gismap/GisMap";

const  _mainMap = ref<GisMap>();
export const setMainMap = (map:GisMap)=>{
    _mainMap.value = map;
}
export const getMainMap = ()=>{
    return _mainMap.value;
}
export interface proj4DefItem {
    name:string,
    proj4: unknown
}
export const getAllProj4Defs = ()=>{
    return Object.getOwnPropertyNames(proj4.defs);
}