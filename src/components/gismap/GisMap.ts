import "ol/ol.css";
import { ref, onMounted, isRef, Ref, toValue } from "vue";
import { Map as olMap, View as olView } from "ol";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import * as Proj from "ol/proj";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Point } from 'ol/geom';
import { Circle, Icon, Style, Stroke, Fill } from "ol/style";
import Common from "~/common/Common";
import MapBrowserEventType from 'ol/MapBrowserEventType';
import { EventTypes } from "ol/Observable";
import { ToolBarAction, ToolBarItem, toolBarItemProcess } from "./toolbar/MapToolBar";
import BaseLayer from "ol/layer/Base";
import { TianDiTuGisMapLayer, GisMapLayer, SysGisMapLayer } from "./layer/GisLayer";
import MapHelper from "./MapHelper";
import { serialize } from "v8";
import GeoJSON from 'ol/format/GeoJSON';
import { Draw, Interaction } from "ol/interaction";
import { eventBus, EventPromise } from "~/composables/eventBus";
import { GisMapDrawEndEvent, GisMapDrawEvent, GisMapNotifyEvent, Types as MapTypes } from "./events/GisMapEvents";
import { resolve } from "path";
const tiandituApiKey: string = '23c0fc2a183d6d35b0458286e79ff99f';

export const DefaultLayerNames = {
    SYS_DRAW: "sys-draw",
    USER_DRAW: "user-draw",
    SYS_TIANDITU: "sys-tianditu",
    SYS_TIANDITU_VEC: "sys-tianditu-vec",
    SYS_TIANDITU_IMG: "sys-tianditu-img",
    SYS_TIANDITU_TER: "sys-tianditu-ter",
}
export interface GisMapOption {
    /**
     * 地图中心点
     */
    center?: number[];
    /**
     * 地图缩放级别
     */
    zoom?: number;
    /**
     * 地图旋转角度
     */
    rotation?: number;
}

export class GisMap {
    gisMapId: string;
    mapTargetElement: HTMLElement;
    olMap?: olMap;
    olView?: olView;
    baseLayers: GisMapLayer[] = []
    userLayers: GisMapLayer[] = [];
    sysLayers: GisMapLayer[] = [];
    interactionMap: Map<string, Interaction> = new Map();
    constructor(mapTarget: string | HTMLElement, options?: GisMapOption) {

        this.gisMapId = Common.uuid();
        if (typeof mapTarget === 'string') {
            const el = document.getElementById(mapTarget)
            if (el) {
                this.mapTargetElement = document.getElementById(mapTarget) as HTMLElement;
            } else {
                throw new Error(`mapTargetElement is not found by id:${mapTarget}`);
            }
        } else if (mapTarget instanceof HTMLElement) {
            this.mapTargetElement = mapTarget;
        } else {
            throw new Error("mapTarget must be HTMLElement or string");
        }
    }
    init() {
        this.olMap = MapHelper.newOlMapInstance(this.mapTargetElement)
        this.olView = this.olMap?.getView();
        this.addLayer(this.olMap, this.baseLayers)
    }
    getMap(): olMap | undefined {
        return this.olMap;
    }
    getMapOptions(gisMap: GisMap): GisMapOption | undefined {
        const map = gisMap.getMap();
        if (map) {
            return {
                center: map.getView().getCenter(),
                zoom: map.getView().getZoom(),
                rotation: map.getView().getRotation(),
            }
        }
    }
    addLayer(map: olMap, baseLayers: GisMapLayer[]) {
        console.log("---------------------addLayer-----------------------")
        console.log(baseLayers)
        const layers: BaseLayer[] = []
        baseLayers.forEach(lay => {
            const l = lay.init();
            map?.addLayer(l);
        });

    }
    saveMapStatusToLocal() {
        const conf = this.getMapOptions(this);
        if (conf) {
            Common.saveLocal(this.gisMapId, conf);
        }
    }
    loadMapStatusFromLocal() {
        if (this.olMap) {
            const mapStatus = Common.loadLocal("mapStatus");
            if (mapStatus) {
                const { center, zoom } = mapStatus;
                const lonLat = toLonLat(center);
                this.olMap.getView().setCenter(center);
                this.olMap.getView().setZoom(zoom);
            }

        }
    }
    getLayerByName(name: string): GisMapLayer  {
        if (this.olMap) {
            let layer = this.sysLayers?.find(x => x.name === name) ||
                this.userLayers?.find(x => x.name === name) ||
                this.baseLayers.find(x => x.name === name)
            if (!layer) {
                layer = new SysGisMapLayer({ name: DefaultLayerNames.SYS_DRAW })
                this.sysLayers.push(layer);
                this.addLayer(this.olMap, [layer])
            }
            return layer;
        }
        throw new Error("olMap is not initialized");
    }
    drawTool(option: any) {
        if (!this.olMap) {
            return Promise.reject('olMap is not initialized');
        }

        const once: Ref<boolean> | boolean = option.once === undefined ? true : option.once;
        const cleanBefore: Ref<boolean> | boolean = option.cleanBefore === undefined ? true : option.cleanBefore;
        const drawType = option.type;


        let drawTool = this.interactionMap.get('draw-tool') as Draw;
        if (drawTool) {
            drawTool.abortDrawing();
            this.olMap?.removeInteraction(drawTool);
            this.interactionMap.delete('draw-tool');
        }



        let drawLayer: SysGisMapLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW) as SysGisMapLayer;


        if (drawType !== 'None') {
            drawTool = new Draw({
                source: drawLayer.source,
                type: option.type,
            });

            drawTool.addEventListener('drawstart', (e) => {
                let _needClean = toValue(cleanBefore);
                if (_needClean) {
                    drawLayer?.source?.clear();
                }

            })

            drawTool.addEventListener('drawend', (e) => {
                const json = new GeoJSON().writeFeature(e.feature);
                eventBus.emit(new GisMapDrawEndEvent(json))
                let _once = toValue(once);
                if (_once) {
                    this.cleanDraw().then(() => {
                        this.olMap?.removeInteraction(drawTool);
                        this.interactionMap.delete('draw-tool');
                    })
                }
            })
            this.interactionMap.set('draw-tool', drawTool);
            this.olMap?.addInteraction(drawTool);
        }

        eventBus.emit(new GisMapNotifyEvent('GisMap::drawTool', option));
    }
    cleanDraw(): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                let drawLayer: SysGisMapLayer | undefined = this.getLayerByName("sys-draw") as SysGisMapLayer;
                if (drawLayer) {
                    drawLayer.source?.clear();
                }
                eventBus.emit(new GisMapNotifyEvent('GisMap::cleanDraw'));
                resolve(undefined);
            }, 0);
        })
    }

    getCenter(): Array<number> | undefined {
        return this?.olView?.getCenter() as Array<number>;
    }
    addFeatures(features: GeoJSON.Feature[], options?: any) {
       const lay =  this.getLayerByName(DefaultLayerNames.USER_DRAW);
       if(lay.source){
        const formatter = new GeoJSON();
        const feas = features.map(f=>formatter.readFeature(f));
        lay.source.addFeatures(feas)
       }
    }
}
export class BaseTianDiTuMap extends GisMap {
    constructor(mapTarget: string | HTMLElement) {
        super(mapTarget);

        this.baseLayers = [
            new TianDiTuGisMapLayer({ url: "http://t0.tianditu.com/DataServer?T=vec_w" }),
            new TianDiTuGisMapLayer({ url: "http://t0.tianditu.com/DataServer?T=cva_w" })
        ]

        this.init();
    }
}