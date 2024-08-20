import "ol/ol.css";
import { ref, onMounted } from "vue";
import { Map as olMap, View as olView } from "ol";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import * as Proj from "ol/proj";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Point } from 'ol/geom';
import * as Interaction from 'ol/interaction';
import { Circle, Icon, Style, Stroke, Fill } from "ol/style";
import Common from "~/common/Common";
import MapBrowserEventType from 'ol/MapBrowserEventType';
import { EventTypes } from "ol/Observable"; 
import { ToolBarAction, ToolBarItem, toolBarItemProcess } from "../toolbar/MapToolBar";
import BaseLayer from "ol/layer/Base";
import GeoJSON from 'ol/format/GeoJSON';
import GisStyle, { getLayerStyles } from "../styles/GisStyle";

export interface GisLayerOption{
    id?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    url?: string;
}

export class SysGisMapLayer implements GisMapLayer {
    id?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    layer?: VectorLayer;
    url?: string;
    source?:VectorSource;
    style: Style | undefined;
    features: any[] = [];
    sercurityTokens: Map<string, string> = new Map();
    constructor(options:GisLayerOption) {
        this.id = options.id || Common.uuid();
        this.name = options.name || '系统图层';
        this.visible = options.visible || true;
        this.opacity = options.opacity || 1;
        this.zIndex = options.zIndex || 0;  
        this.style = getLayerStyles(this.name);  
    }
    init() {
        const source = new VectorSource({wrapX: false});
        this.source = source;
        const vector = new VectorLayer({
          source: source,
          style: this.style,
        }); 
        this.layer = vector;
        return this.layer;
    }
    
    addFeature(feature:any):any {
        if(feature instanceof Feature){
            feature.setId(Common.uuid());
            this.source?.addFeature(feature);
            const jsonStr=  new GeoJSON().writeFeature(feature);
            const fea = JSON.parse(jsonStr);
            fea.id =  feature.getId()
            this.features.push(fea);
            return feature;
        }
        if(feature?.type === 'Feature'){
            feature.id=Common.uuid();
            const fea = new GeoJSON().readFeature(feature);
            this.source?.addFeature(fea);
            this.features.push(feature);

            return this.getFeatureById(feature.id);
        }
    }
    getJSONFeatureById(id:string){
       return this.features.find(f=>f.id===id);
    }
    getFeatureById(id:string){
       return this.source?.getFeatureById(id);
    }
    removeFeatureById(id:string){
       const fea =  this.source?.getFeatureById(id)
       if(fea){
        this.source?.removeFeature(fea);
       }
       this.features = this.features.filter(f=>f.id!==id);
    }
}


export class TianDiTuGisMapLayer implements GisMapLayer {
    id?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    layer?: BaseLayer;
    url: string;
    sercurityTokens: Map<string, string> = new Map();
    constructor(options:GisLayerOption) {
        
        const tiandituApiKey = Common.getTiandituApiKey();
        this.sercurityTokens.set('tdt', tiandituApiKey);
        let url = options.url || ''; // 提供一个默认URL

        if(url===''){
            throw new Error('url is required');
        }
        const _url = new URL(url);
        if(_url.search==''){
            url += '?gismap=1'
        }
        this.url = url;
    }
    init() {
        const tiandituApiKey = this.sercurityTokens.get('tdt');
        this.layer = new TileLayer({
            source: new XYZ({
                url: `${this.url}&x={x}&y={y}&l={z}&tk=${tiandituApiKey}`,
            }),
        });
        return this.layer;
    }
}

export interface GisMapLayer {
    id?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    style?:Style;
    layer?: BaseLayer;
    url?: string;
    sercurityTokens: Map<string, string>;
    source?:VectorSource;
    features?:any[];
    init():BaseLayer;
    addFeature?(features:any| undefined):any;
    getFeatureById?(id:string):any;
    removeFeatureById?(id:string):any;
}