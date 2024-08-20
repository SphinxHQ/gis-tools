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
import GeomUtils from "~/common/GeomUtils";
import GisStyle from "./styles/GisStyle";
import { Style } from "ol/style";
const tiandituApiKey: string = '23c0fc2a183d6d35b0458286e79ff99f';

export const DefaultLayerNames = {
    SYS_DRAW_TOOL_ACTION: "sys-draw-tool-action",
    SYS_DRAW_TOOL_DISPLAY: "sys-draw-tool-display",
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
    getLayerByName(name: string): GisMapLayer {
        if (this.olMap) {
            let layer = this.sysLayers?.find(x => x.name === name) ||
                this.userLayers?.find(x => x.name === name) ||
                this.baseLayers.find(x => x.name === name)
            if (!layer) {
                layer = new SysGisMapLayer({ name })
                this.sysLayers.push(layer);
                this.addLayer(this.olMap, [layer])
            }
            return layer;
        }
        throw new Error("olMap is not initialized");
    }
    drawTool(option: {
        type: ('Polygon' | 'Point' | 'LineString' | 'None'),
        cleanBefore: Ref<boolean> | boolean,
        once: Ref<boolean> | boolean,
        keep: Ref<boolean> | boolean,
        allowHole: Ref<boolean> | boolean,
    }) {
        if (!this.olMap) {
            return Promise.reject('olMap is not initialized');
        }

        const allowHole = toValue(option.allowHole === undefined ? true : option.allowHole);
        let once: boolean = toValue((option.once === undefined ? true : option.once));
        const cleanBefore: boolean = toValue(option.cleanBefore === undefined ? true : option.cleanBefore);
        const keep: boolean = toValue(option.keep === undefined ? true : option.keep);
        const drawType = option.type;
        if (drawType === 'Polygon' && allowHole) {
            once = false;
            if (isRef(option.once)) {
                option.once.value = false;
            }
        }


        let drawTool = this.interactionMap.get('draw-tool') as Draw;
        if (drawTool) {
            drawTool.abortDrawing();
            this.olMap?.removeInteraction(drawTool);
            this.interactionMap.delete('draw-tool');
        }




        let drawLayerAction: SysGisMapLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_ACTION) as SysGisMapLayer;
        let drawLayerDisplay: SysGisMapLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY) as SysGisMapLayer;


        if (drawType !== 'None') {
            drawTool = new Draw({
                source: drawLayerAction.source,
                type: drawType,
                style: GisStyle.getDrawHandleStyleFunction(),
            });

            drawTool.addEventListener('drawstart', (e) => {
                if (drawType === 'Polygon' && allowHole) {
                    if (isRef(option.once)) {
                        option.once.value = false;
                    }
                }

                const startPosition = e?.feature?.getGeometry()?.getFirstCoordinate();
                if (startPosition) {
                    const point = { type: 'Point', coordinates: startPosition };
                    const source = drawLayerDisplay?.source;
                    if (source) {
                        for (let index = 0; index < drawLayerDisplay.features.length; index++) {
                            const fea = drawLayerDisplay.features[index];
                            if (GeomUtils.intersects(fea.geometry, point)) {
                                drawTool.set('intersectId', fea.id); 
                                break;
                            }
                        }
                    }
                }
                // if (cleanBefore) {
                //     source?.clear();
                // }

            })

            drawTool.addEventListener('drawend', (e:any) => {
                let drawFeature = e.feature;
                const intersectId = drawTool.get("intersectId");
                const displayLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY);
                this.cleanSource(DefaultLayerNames.SYS_DRAW_TOOL_ACTION).then(() => {
                    if (drawType === 'Polygon') {
                        if (keep) {
                            if (displayLayer) {
                                if (intersectId && allowHole) {
                                    const overlayFeature = displayLayer.getJSONFeatureById(intersectId);
                                    const jsonFeature = GeomUtils.olFeatureToGeoJSON(drawFeature);
                                    const newGeo = GeomUtils.difference(overlayFeature, jsonFeature);
                                    displayLayer.removeFeatureById(intersectId);
                                    drawTool.set("intersectId",undefined)

                                    drawFeature = displayLayer.addFeature(newGeo);
                                } else {
                                    drawFeature = displayLayer.addFeature(drawFeature);
                                }


                            } else {
                                console.error('displayLayer is not defined.');
                            }
                        }
                    }else{
                        drawFeature = displayLayer.addFeature(drawFeature);
                    }
                })

                const json = new GeoJSON().writeFeature(drawFeature);
                eventBus.emit(new GisMapDrawEndEvent(json))
                if (once) {
                    this.olMap?.removeInteraction(drawTool);
                    this.interactionMap.delete('draw-tool');
                }
            })
            this.interactionMap.set('draw-tool', drawTool);
            this.olMap?.addInteraction(drawTool);
        }

        eventBus.emit(new GisMapNotifyEvent('GisMap::drawTool', option));
    }
    cleanSource(layerName: string): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                let curLayer: GisMapLayer | undefined = this.getLayerByName(layerName) as GisMapLayer;
                if (curLayer) {
                    curLayer.source?.clear();
                }
                eventBus.emit(new GisMapNotifyEvent('GisMap::cleanSource::' + layerName));
                resolve(undefined);
            }, 0);
        })
    }

    getCenter(): Array<number> | undefined {
        return this?.olView?.getCenter() as Array<number>;
    }

    addFeaturesToLayer(features: GeoJSON.Feature[], layerName: string, options?: any) {
        const lay = this.getLayerByName(layerName);
        if (lay.source) {
            const formatter = new GeoJSON();
            const feas = features.map(f => formatter.readFeature(f));
            lay.source.addFeatures(feas)
        }
    }
    addFeatures(features: GeoJSON.Feature[], options?: any) {
        this.addFeaturesToLayer(features, DefaultLayerNames.USER_DRAW);
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