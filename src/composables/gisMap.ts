import { ref } from "vue";
import { GisMap } from "~/components/gismap/GisMap";
import proj4 from 'proj4';

const  _mainMap = ref<GisMap>();
export const setMainMap = (map:GisMap)=>{
    _mainMap.value = map;
}
export const getMainMap = ()=>{
    return _mainMap.value;
}
export interface proj4DefItem {
    name:string,
    proj4:any
}
export const getAllProj4Defs = ()=>{
   const names =  Object.getOwnPropertyNames(proj4.defs);
    return Object.getOwnPropertyNames(proj4.defs);
}