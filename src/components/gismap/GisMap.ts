import "ol/ol.css";
import {Map as olMap, View as olView} from "ol";
import Feature from "ol/Feature";
import GeoJSON from 'ol/format/GeoJSON';
import {applyTransform} from 'ol/extent';
import type Geometry from "ol/geom/Geometry";
import {Draw, Interaction} from "ol/interaction";
import type BaseLayer from "ol/layer/Base";
import {fromLonLat, get as getProjection, getTransform} from "ol/proj";
import {Circle, Fill, Stroke, Style} from "ol/style";
import {isRef, Ref, toValue} from "vue";

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import createDefaultStyle from "~/components/gismap/styles/DefaultStyle";
import {eventBus} from "~/composables/eventBus";
import EventBase from "~/event/EventBase";


import MapHelper from "./MapHelper";
import {buildTianDiTuLayerUrl, getTianDiTuProjSuffix} from "./tiandituConfig";
import {getChinaBoundaryImage} from "./data/chinaBoundaryCache";
import {GisMapDrawEndEvent, GisMapNotifyEvent} from "./events/GisMapEvents";
import {TianDiTuGisMapLayer, GisMapLayer, SysGisMapLayer, GisLayerOption, ImageGisMapLayer} from "./layer/GisLayer";
import GisStyle from "./styles/GisStyle";


export const DefaultLayerNames = {
    SYS_DRAW_TOOL_ACTION: "sys-draw-tool-action",
    SYS_DRAW_TOOL_DISPLAY: "sys-draw-tool-display",
    USER_DRAW: "user-draw",
    USER_TEMP: "user-temp",
    SYS_TEMP_FLASH: "sys-temp-flash",
    SYS_TIANDITU: "sys-tianditu",
    SYS_TIANDITU_VEC: "sys-tianditu-vec",
    SYS_TIANDITU_IMG: "sys-tianditu-img",
    SYS_TIANDITU_TER: "sys-tianditu-ter",
}

export interface GisMapOption {
    center?: number[];
    zoom?: number;
    rotation?: number;
    projection: string | number;
}

export class GisMap extends EventBase {

    private readFeaturesFromGeoJSON(features: GeoJSON.Feature[]): Feature<Geometry>[] {
        const formatter = new GeoJSON();
        const viewProj = this.olView?.getProjection().getCode();
        // GeoJSON 标准规定坐标为 EPSG:4326，但本系统保留原始投影坐标
        // 当视图为地理坐标系时，数据来自标准 GeoJSON，使用 featureProjection 重投影
        // 当视图为投影坐标系时，数据坐标已在投影坐标系中，dataProjection=featureProjection 表示无需转换
        const isGeoView = viewProj === 'EPSG:4326' || viewProj === 'EPSG:4490';
        const readOptions = isGeoView
            ? { featureProjection: viewProj }
            : { dataProjection: viewProj, featureProjection: viewProj };
        return features.map(f => formatter.readFeature(f, readOptions)) as Feature<Geometry>[];
    }
    gisMapId: string;
    mapName: string;
    mapTargetElement: HTMLElement;
    olMap?: olMap;
    olView?: olView;
    baseLayers: GisMapLayer[] = []
    userLayers: GisMapLayer[] = [];
    sysLayers: GisMapLayer[] = [];
    interactionMap: Map<string, Interaction> = new Map();
    private cleanupFunctions: Array<() => void> = [];

    constructor(mapName: string, mapTarget: string | HTMLElement) {
        super();
        this.gisMapId = Common.uuid();
        this.mapName = mapName;
        if (typeof mapTarget === 'string') {
            const el = document.getElementById(mapTarget)
            if (el) {
                this.mapTargetElement = el;
            } else {
                throw new Error(`mapTargetElement is not found by id:${mapTarget}`);
            }
        } else if (mapTarget instanceof HTMLElement) {
            this.mapTargetElement = mapTarget;
        } else {
            throw new Error("mapTarget must be HTMLElement or string");
        }
    }

    init(options?: GisMapOption) {
        this.olMap = MapHelper.newOlMapInstance(this.mapTargetElement, options)
        this.olView = this.olMap?.getView();
        this.addLayer(this.olMap, this.baseLayers)
    }

    initMapPointermove(): void {
        const map = this.olMap;
        const defaultStyles = createDefaultStyle();
        const selectStyle = defaultStyles['select'];
        const textStyles: Style[] = defaultStyles['Text'];

        interface SelectableFeature extends Feature {
            setStyle(style?: Style | Style[]): void;
            get(key: string): unknown;
        }

        let selected: SelectableFeature | null = null;
        let curFeature: unknown = null;

        const pointerMoveHandler = (() => {
            let lastPixel: [number, number] | null = null;
            let rafId = 0;
            return (e: unknown) => {
                const event = e as { pixel: [number, number] };
                // 相同像素不重复处理
                if (lastPixel && lastPixel[0] === event.pixel[0] && lastPixel[1] === event.pixel[1]) return;
                lastPixel = event.pixel;
                // 用 RAF 节流，避免每帧多次查询
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    if (selected) {
                        selected.setStyle(undefined);
                        selected = null;
                    }
                    // 用 layerFilter 跳过坐标系范围框图层，避免遍历框内大量几何造成卡顿
                    map?.forEachFeatureAtPixel(event.pixel, (f) => {
                        const feature = f as SelectableFeature;
                        // 跳过坐标系范围框等非交互图层
                        if (feature.get('_crsExtentBox')) {
                            return false;
                        }
                        // 仅对显式标记 _selectable 的 feature 启用交互
                        // 默认 GeoJSON 等图层不参与 hover/高亮，需调用 enableFeatureSelect 显式启用
                        if (!feature.get('_selectable')) {
                            return false;
                        }
                        // 临时全局禁用所有要素交互，hover/选择/FeatureOver 都禁用
                        // 需要时注释掉该 return false 即可恢复
                        // return false;
                        if (selected !== feature) {
                            selected?.setStyle(undefined);
                            selected = feature;
                            const label = feature.get("label");
                            if (label !== undefined) {
                                const txtStyles = textStyles.map(x => x.clone());
                                txtStyles.forEach(s => s.getText()?.setText?.(`${label}`))
                                feature.setStyle([...selectStyle, ...txtStyles])
                            } else {
                                feature.setStyle(selectStyle)
                            }
                        }
                        return true;
                    }, {
                        // 跳过坐标系范围框图层
                        layerFilter: (layer) => {
                            return !layer.get('_crsExtentLayer');
                        }
                    });
                    if (curFeature !== selected) {
                        curFeature = selected;
                        this.dispatchEvent('FeatureOver', curFeature);
                    }
                });
            };
        })();

        map?.on('pointermove', pointerMoveHandler);

        this.cleanupFunctions.push(() => {
            map?.un('pointermove', pointerMoveHandler);
        });
    }

    /**
     * 启用 feature 的 pointermove 交互（hover 高亮、FeatureOver 事件）
     * 给图层的所有 feature 打上 _selectable 标记
     * @param layer OL 图层
     */
    enableFeatureSelect(layer: unknown): void {
        if (!layer) return;
        const l = layer as { getSource?: () => { getFeatures?: () => unknown[]; forEachFeature?: (cb: (f: unknown) => void) => void } | undefined };
        const source = l.getSource?.();
        if (!source) return;
        if (typeof source.forEachFeature === 'function') {
            source.forEachFeature((f: unknown) => {
                const feat = f as { set?: (k: string, v: unknown) => void; get?: (k: string) => unknown };
                if (typeof feat.set === 'function' && !feat.get?.('_selectable')) {
                    feat.set('_selectable', true);
                }
            });
        } else if (typeof source.getFeatures === 'function') {
            const feats = source.getFeatures() as unknown[];
            feats.forEach((f) => {
                const feat = f as { set?: (k: string, v: unknown) => void; get?: (k: string) => unknown };
                if (typeof feat.set === 'function' && !feat.get?.('_selectable')) {
                    feat.set('_selectable', true);
                }
            });
        }
    }

    getMap(): olMap | undefined {
        return this.olMap;
    }

    /**
     * 获取当前地图视图投影代码
     */
    getViewProjCode(): string {
        return this.olView?.getProjection().getCode() ?? 'EPSG:4490'
    }

    getMapOptions(gisMap: GisMap): GisMapOption | undefined {
        const map = gisMap.getMap();
        if (map) {
            return {
                center: map.getView().getCenter() ?? undefined,
                zoom: map.getView().getZoom() ?? undefined,
                rotation: map.getView().getRotation(),
                projection: map.getView().getProjection().getCode(),
            }
        }
    }

    addLayer(map: olMap, baseLayers: GisMapLayer[]) {
        baseLayers.forEach(lay => {
            const l = lay.init() as BaseLayer;
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
            const mapStatus = Common.loadLocal("mapStatus") as { center: number[], zoom: number } | null;
            if (mapStatus) {
                const {center, zoom} = mapStatus;
                this.olMap.getView().setCenter(center);
                this.olMap.getView().setZoom(zoom);
            }
        }
    }

    getLayerByName(name: string, options?: GisLayerOption): GisMapLayer {
        if (this.olMap) {
            let layer = this.sysLayers?.find(x => x.name === name) ||
                this.userLayers?.find(x => x.name === name) ||
                this.baseLayers.find(x => x.name === name)
            if (!layer) {
                const projection = this.olView?.getProjection().getCode();
                const newLayer = new SysGisMapLayer({...options, name: name})
                newLayer.projection = projection;
                this.sysLayers.push(newLayer);
                this.addLayer(this.olMap, [newLayer])
                return newLayer;
            }
            return layer;
        }
        throw new Error("olMap is not initialized");
    }

    drawTool(option: {
        type: ('Polygon' | 'Point' | 'LineString' | 'None'),
        cleanBefore?: Ref<boolean> | boolean,
        once?: Ref<boolean> | boolean,
        keep?: Ref<boolean> | boolean,
        allowHole?: Ref<boolean> | boolean,
    }) {
        if (!this.olMap) {
            return Promise.reject('olMap is not initialized');
        }

        const allowHole = toValue(option.allowHole === undefined ? true : option.allowHole);
        let once: boolean = toValue((option.once === undefined ? true : option.once));
        toValue(option.cleanBefore === undefined ? true : option.cleanBefore);
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

        const drawLayerAction: SysGisMapLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_ACTION) as SysGisMapLayer;
        const drawLayerDisplay: SysGisMapLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY) as SysGisMapLayer;

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
                const startPosition = (e as { feature?: { getGeometry?: () => { getFirstCoordinate?: () => number[] } } })
                    ?.feature?.getGeometry?.()?.getFirstCoordinate?.();
                if (startPosition) {
                    const point: GeoJSON.Point = {type: 'Point', coordinates: startPosition};
                    const source = drawLayerDisplay?.source;
                    if (source) {
                        for (let index = 0; index < drawLayerDisplay.features.length; index++) {
                            const fea = drawLayerDisplay.features[index] as unknown as Record<string, unknown>;
                            if (GeomUtils.intersects(fea.geometry as GeoJSON.Geometry, point)) {
                                drawTool.set('intersectId', fea.id);
                                break;
                            }
                        }
                    }
                }
            })

            drawTool.addEventListener('drawend', (e: unknown) => {
                let drawFeature: unknown = (e as { feature: unknown }).feature;
                const intersectId = drawTool.get("intersectId") as string | undefined;
                const displayLayer = this.getLayerByName(DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY);
                this.cleanLayer(DefaultLayerNames.SYS_DRAW_TOOL_ACTION).then(() => {
                    if (drawType === 'Polygon') {
                        if (keep) {
                            if (displayLayer) {
                                if (intersectId && allowHole) {
                                    const overlayFeature = displayLayer.getJSONFeatureById?.(intersectId);
                                    const jsonFeature = GeomUtils.olFeatureToGeoJSON(drawFeature as GeoJSON.Feature);
                                    const newGeo = GeomUtils.difference(overlayFeature as unknown as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>, jsonFeature as unknown as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
                                    displayLayer.removeFeatureById?.(intersectId);
                                    drawTool.set("intersectId", undefined)
                                    drawFeature = displayLayer.addFeature?.(newGeo as unknown as Feature);
                                } else {
                                    drawFeature = displayLayer.addFeature?.(drawFeature as unknown as Feature);
                                }
                            } else {
                                logger.error('displayLayer is not defined.');
                            }
                        }
                    } else {
                        drawFeature = displayLayer.addFeature?.(drawFeature as unknown as Feature);
                    }
                    eventBus.emit(this.mapName, new GisMapNotifyEvent({}, 'GisMap::drawTool::drawend', displayLayer, drawFeature));
                    // 将绘制结果转为 EPSG:4326 的 GeoJSON（GeoJSON 标准要求 WGS84 坐标）
                    const json = new GeoJSON().writeFeature(drawFeature as Feature, {
                        featureProjection: this.olView?.getProjection().getCode(),
                        rightHanded: true,
                    });
                    eventBus.emit(this.mapName, new GisMapDrawEndEvent(json))
                })
                if (once) {
                    this.olMap?.removeInteraction(drawTool);
                    this.interactionMap.delete('draw-tool');
                }
            })
            this.interactionMap.set('draw-tool', drawTool);
            this.olMap?.addInteraction(drawTool);
        }

        eventBus.emit(this.mapName, new GisMapNotifyEvent({}, 'GisMap::drawTool', option));
    }

    cleanLayer(layerName: string): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const curLayer: GisMapLayer | undefined = this.getLayerByName(layerName) as GisMapLayer;
                if (curLayer) {
                    curLayer.clear();
                }
                eventBus.emit(this.mapName, new GisMapNotifyEvent({}, 'GisMap::cleanSource', curLayer));
                resolve();
            }, 0);
        })
    }

    getCenter(): number[] | undefined {
        return this?.olView?.getCenter() as number[];
    }

    addFeaturesToLayer(features: GeoJSON.Feature[], layerName: string, options?: {
        clear?: boolean,
        fit?: unknown,
        style?: unknown
    }) {
        const lay = this.getLayerByName(layerName, {style: options?.style as GisLayerOption['style']});
        if (options?.clear) {
            lay.clear();
        }
        if (lay.source) {
            const feas = this.readFeaturesFromGeoJSON(features);
            lay.addFeatures?.(feas)
            eventBus.emit(this.mapName, new GisMapNotifyEvent({}, 'GisMap::addFeaturesToLayer', undefined, feas, lay));
            const extent = lay.getExtent?.() as import("ol/extent").Extent | undefined;
            if (extent) {
                this.olView?.fit(extent, {
                    padding: Array(4).fill(10)
                });
            }
        }
    }

    addFeatures(features: GeoJSON.Feature[], options?: {
        layerName?: string,
        clear?: boolean,
        fit?: unknown,
        style?: unknown
    }) {
        const layerName = options?.layerName || DefaultLayerNames.USER_TEMP;
        this.addFeaturesToLayer(features, layerName, {clear: options?.clear, fit: options?.fit, style: options?.style});
    }

    flashFeatures(features: GeoJSON.Feature[], options?: {
        layerName?: string,
        clear?: boolean,
        fit?: unknown,
        style?: unknown
    }) {
        const layerName = options?.layerName || DefaultLayerNames.SYS_TEMP_FLASH;
        const lay = this.getLayerByName(layerName, {style: options?.style as GisLayerOption['style']});
        lay.clear();

        const start = new Date().getTime();
        const duration = 2000;
        const raido = 5;
        const styles = [
            new Style({
                fill: new Fill({color: 'rgba(255,0,0,0.2)'}),
                stroke: new Stroke({color: 'red', width: 2}),
                image: new Circle({
                    radius: 2 * 2,
                    fill: new Fill({color: 'red'}),
                    stroke: new Stroke({color: 'white', width: 1}),
                }),
            }),
            new Style({
                fill: new Fill({color: 'rgba(0,0,255,0.2)'}),
                stroke: new Stroke({color: 'blue', width: 2}),
                image: new Circle({
                    radius: 2 * 2,
                    fill: new Fill({color: 'blue'}),
                    stroke: new Stroke({color: 'white', width: 1}),
                }),
            }),
        ];
        const handle = (event: { frameState: { time: number } }) => {
            const frameState = event.frameState;
            const elapsed = frameState.time - start;
            const flag = elapsed % (duration / raido) > (duration / raido / 2);
            lay.setStyle(styles[flag ? 0 : 1])
            if (elapsed > duration) {
                lay.off('postrender', handle);
                lay.clear();
                return;
            }
            this?.olMap?.render();
        }
        lay.on('postrender', handle);

        if (lay.source) {
            const feas = this.readFeaturesFromGeoJSON(features);
            lay.addFeatures?.(feas)
            eventBus.emit(this.mapName, new GisMapNotifyEvent({}, 'GisMap::addFeaturesToLayer', undefined, feas, lay));
            const extent2 = lay.getExtent?.() as import("ol/extent").Extent | undefined;
            if (extent2) {
                this.olView?.fit(extent2, {padding: Array(4).fill(40)});
            }
        }
    }

    cleanDraw() {
        this.drawTool({type: 'None'});
        this.cleanLayer(DefaultLayerNames.SYS_DRAW_TOOL_ACTION);
        this.cleanLayer(DefaultLayerNames.SYS_DRAW_TOOL_DISPLAY);
    }

    flyTo(geoCenter: number[], zoom?: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {
                const viewProj = this.olView?.getProjection().getCode();
                const center = viewProj && viewProj !== 'EPSG:4326' && viewProj !== 'EPSG:4490'
                    ? fromLonLat(geoCenter, viewProj)
                    : geoCenter;
                this.olMap?.getView().animate({
                    center,
                    zoom: zoom,
                    duration: 2000
                }, (isEnd => {
                    resolve(isEnd ?? false);
                }))
            } catch (e) {
                reject(e)
            }
        })
    }

    zoomTo(geoCenter: number[], zoom?: number) {
        const viewProj = this.olView?.getProjection().getCode();
        const center = viewProj && viewProj !== 'EPSG:4326' && viewProj !== 'EPSG:4490'
            ? fromLonLat(geoCenter, viewProj)
            : geoCenter;
        this.olMap?.getView().setCenter(center);
        if (zoom !== undefined) {
            this.olMap?.getView().setZoom(zoom);
        }
    }

    dispose(): void {
        // 执行所有注册的清理函数
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];

        // 清理所有交互
        this.interactionMap.forEach((interaction) => {
            this.olMap?.removeInteraction(interaction);
        });
        this.interactionMap.clear();

        // 清理所有图层
        const allLayers = [...this.baseLayers, ...this.userLayers, ...this.sysLayers];
        allLayers.forEach(layer => {
            (layer as GisMapLayer & { dispose?: () => void }).dispose?.();
        });
        this.baseLayers = [];
        this.userLayers = [];
        this.sysLayers = [];

        // 清理事件监听器
        this.clear();

        // 清理地图实例
        if (this.olMap) {
            this.olMap.setTarget(undefined);
            this.olMap = undefined;
        }
        this.olView = undefined;
    }

    /**
     * 切换底图图层组
     * 移除当前所有底图（不 dispose，便于切回），添加新的底图图层组
     * @param newBaseLayers 新的底图图层组
     */
    setBaseLayers(newBaseLayers: GisMapLayer[]): void {
        if (!this.olMap) {
            logger.warn('setBaseLayers: olMap is not initialized')
            return
        }
        // 仅从地图移除旧底图（不 dispose，便于切回时复用）
        this.baseLayers.forEach(layer => {
            const l = layer.layer as BaseLayer | undefined
            if (l) {
                this.olMap?.removeLayer(l)
            }
        })
        this.baseLayers = newBaseLayers
        // 添加新底图：若图层未初始化则 init，否则直接添加
        newBaseLayers.forEach(lay => {
            let l = lay.layer as BaseLayer | undefined
            if (!l) {
                l = lay.init() as BaseLayer
            }
            if (l) {
                this.olMap?.addLayer(l)
            }
        })
    }

    /**
     * 获取当前底图图层组
     */
    getBaseLayers(): GisMapLayer[] {
        return this.baseLayers
    }
}

export class BaseTianDiTuMap extends GisMap {
    constructor(mapName: string, mapTarget: string | HTMLElement, options?: GisMapOption) {
        super(mapName, mapTarget);
        const projection = options?.projection === undefined ? 3857 : options?.projection;
        const _projection = (typeof projection === 'string') ? projection : `EPSG:${projection}`;

        // 先用地理中心初始化，投影坐标系稍后 fit 中国范围
        const geoCenter = [104.195, 35.8];
        const isGeo = _projection === 'EPSG:4326' || _projection === 'EPSG:4490';
        const center = isGeo ? geoCenter : fromLonLat(geoCenter, _projection);
        this.init({
            center,
            zoom: isGeo ? 4 : 1,
            projection: _projection
        });
        const projSuffix = getTianDiTuProjSuffix(_projection);
        this.baseLayers = [
            new TianDiTuGisMapLayer({url: buildTianDiTuLayerUrl('vec', projSuffix)}),
            new TianDiTuGisMapLayer({url: buildTianDiTuLayerUrl('cva', projSuffix)})
        ];
        // 添加底图（init 只初始化 map，不会自动 addLayer）
        if (this.olMap) {
            this.addLayer(this.olMap, this.baseLayers);
        }

        // 投影坐标系：fit 中国范围确保完整显示
        if (!isGeo) {
            try {
                const proj = getProjection(_projection);
                const view = this.olMap?.getView();
                if (view && proj) {
                    // fit 到中国范围附近
                    const extent = proj.getExtent();
                    if (extent) {
                        view.fit(extent, { padding: [20, 20, 20, 20], maxZoom: 4 });
                    } else {
                        // 用默认中国经纬度范围
                        const chinaExtent = applyTransform([73, 16, 136, 54], getTransform('EPSG:4326', _projection), undefined, 8);
                        view.fit(chinaExtent, { padding: [20, 20, 20, 20], maxZoom: 4 });
                    }
                }
            } catch (e) {
                logger.warn(`BaseTianDiTuMap fit failed for ${_projection}:`, e);
            }
        }

        this.initMapPointermove();
        logger.info('BaseTianDiTuMap initialized:', mapName, _projection);
    }
}

export class BlankMap extends GisMap {
    constructor(mapName: string, mapTarget: string | HTMLElement, options?: GisMapOption) {
        super(mapName, mapTarget);
        const projection = options?.projection === undefined ? 4490 : options?.projection;
        const _projection = (typeof projection === 'string') ? projection : `EPSG:${projection}`;

        // 先用地理中心初始化，投影坐标系稍后 fit 中国范围
        const geoCenter = [104.195, 35.8];
        const isGeo = _projection === 'EPSG:4326' || _projection === 'EPSG:4490';
        const center = isGeo ? geoCenter : fromLonLat(geoCenter, _projection);
        this.init({
            center,
            zoom: isGeo ? 4 : 1,
            projection: _projection
        });

        // 中国轮廓底图：渲染到 canvas 后缓存为 ImageStatic，零交互开销
        // Canvas 在 EPSG:4326 下绘制，OL 自动重投影到视图坐标系
        const { url, extent: geoExtent } = getChinaBoundaryImage(_projection);
        // 包装为 ImageGisMapLayer 加入 baseLayers，便于底图切换
        const chinaImageLayer = new ImageGisMapLayer({
            url,
            imageExtent: geoExtent,
            imageProjection: 'EPSG:4326',
            name: '本地底图',
            zIndex: -1,
        });
        this.baseLayers = [chinaImageLayer];
        this.addLayer(this.olMap!, this.baseLayers);

        // 投影坐标系：fit 中国范围确保完整显示
        if (!isGeo && this.olView) {
            const bl = fromLonLat([73.5, 18], _projection);
            const tr = fromLonLat([136, 54], _projection);
            const projExtent: [number, number, number, number] = [bl[0], bl[1], tr[0], tr[1]];
            this.olView.fit(projExtent, { padding: [20, 20, 20, 20] });
        }
        this.initMapPointermove();
        logger.info('BlankMap initialized:', mapName, _projection);
    }
}
