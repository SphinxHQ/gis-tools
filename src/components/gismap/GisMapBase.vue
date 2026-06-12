<template>
  <div class="main-map-container">
    <div v-if="featureProps" class="fea-props">
      <div v-for="(value,key) in featureProps" :key="key" class="row">
          <span class="key">{{ key }}</span>
          <span class="value">&nbsp;{{ `${value}` }}</span>
      </div>
    </div>
    <div class="mouse-coord" v-if="mouseCoord">{{ mouseCoord }}</div>
    <div ref="mapContainerRef" class="main-map" />
  </div>
</template>
<script setup lang="ts">
import GeoJSON from 'ol/format/GeoJSON';
import { nextTick, onBeforeUnmount, onMounted, ref} from 'vue';

import {logger} from '~/common/logger';
import {eventBus, GisEvent} from '~/composables/eventBus';
import {setMainMap, getMainMap} from '~/composables/gisMap';

import {BaseTianDiTuMap, BlankMap, GisMap, GisMapOption} from './GisMap';
import {Types as MapTypes} from './events/GisMapEvents';
import {toLonLat} from 'ol/proj';


const mapContainerRef = ref<HTMLElement | null>(null);
let map: GisMap;
const mouseCoord = ref<string>('');
const mapTypes = {
  blank: BlankMap,
  tianditu: BaseTianDiTuMap
}
const props = defineProps({
  mapName: { type: String, default: '' },
  options: { type: Object, default: () => ({}) },
  mapType: { type: String, default: 'blank' }
})
const featureProps = ref<Record<string, unknown>>();
const handles: Record<string, (...args: unknown[]) => unknown> = {
  [MapTypes.DRAWTOOL]: async (_options: unknown, data: unknown) => map.drawTool(data as { type: 'Polygon' | 'Point' | 'LineString' | 'None'; cleanBefore?: boolean; once?: boolean; keep?: boolean; allowHole?: boolean }),
  [MapTypes.CLEANDRAW]: async () => map.cleanDraw(),
  [MapTypes.ADD_FEATURES]: async (_options: unknown, features: unknown) => map.addFeatures(features as GeoJSON.Feature[], _options as { layerName?: string; clear?: boolean; fit?: unknown; style?: unknown } | undefined),
  [MapTypes.FLY_TO]: async (_options: unknown, center: unknown, zoom?: unknown) => await map.flyTo(center as number[], zoom as number | undefined),
  [MapTypes.ZOOM_TO]: async (_options: unknown, center: unknown, zoom?: unknown) => map.zoomTo(center as number[], zoom as number | undefined),
  [MapTypes.FLASH]: async (_options: unknown, features: unknown) => map.flashFeatures(features as GeoJSON.Feature[], _options as { layerName?: string; clear?: boolean; fit?: unknown; style?: unknown } | undefined),
}
onMounted(async () => {
  await nextTick();
  
  if (!mapContainerRef.value) {
    logger.error('Map container ref is not available');
    return;
  }

  let mapClass = BlankMap
  const mapTypeKey = (props.mapType || 'blank').toLowerCase() as keyof typeof mapTypes;
  if (props.mapType && mapTypeKey in mapTypes) {
    mapClass = mapTypes[mapTypeKey];
  }
  map = new mapClass(props.mapName || '', mapContainerRef.value, props.options as GisMapOption);
  map.on('FeatureOver', (feature?: unknown) => {
    if (feature && typeof feature === 'object' && 'getProperties' in feature) {
      const feat = feature as { getProperties: () => Record<string, unknown> };
      let fp = feat.getProperties();
      const keys = Object.keys(fp).filter(x => x !== 'geometry')
      featureProps.value = keys.reduce((p: Record<string, unknown>, c) => {
        p[c] = fp[c]
        return p
      }, {});
    } else {
      featureProps.value = undefined
    }
  })

  // 鼠标位置坐标显示
  const olMap = map.getMap();
  if (olMap) {
    olMap.on('pointermove', (evt: any) => {
      const viewProj = olMap.getView().getProjection().getCode();
      const coord = evt.coordinate as number[];
      if (viewProj === 'EPSG:4326' || viewProj === 'EPSG:4490') {
        mouseCoord.value = `${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}`;
      } else {
        // 投影坐标：同时显示经纬度
        const lonLat = toLonLat(coord, viewProj);
        mouseCoord.value = `${lonLat[0].toFixed(6)}, ${lonLat[1].toFixed(6)} | ${coord[0].toFixed(2)}, ${coord[1].toFixed(2)}`;
      }
    });
    olMap.on('pointermoveout', () => {
      mouseCoord.value = '';
    });
  }
  setMainMap(map);
  logger.info('GisMapBase initialized:', props.mapName);

  const mapName = props.mapName || '';
  eventBus.on(mapName, MapTypes.DRAWTOOL, handles[MapTypes.DRAWTOOL])
  eventBus.on(mapName, MapTypes.CLEANDRAW, handles[MapTypes.CLEANDRAW])
  eventBus.on(mapName, MapTypes.ADD_FEATURES, handles[MapTypes.ADD_FEATURES])
  eventBus.on(mapName, MapTypes.FLY_TO, handles[MapTypes.FLY_TO])
  eventBus.on(mapName, MapTypes.ZOOM_TO, handles[MapTypes.ZOOM_TO])
  eventBus.on(mapName, MapTypes.FLASH, handles[MapTypes.FLASH])

  // 通知父组件地图已准备好，可以发送事件
  const mapReadyEvent = new GisEvent('map-ready', null);
  eventBus.emit(mapName, mapReadyEvent);
  logger.info('GisMapBase emitted map-ready event for:', mapName);
});
onBeforeUnmount(() => {
  const mapName = props.mapName || '';
  eventBus.off(mapName, MapTypes.DRAWTOOL, handles[MapTypes.DRAWTOOL])
  eventBus.off(mapName, MapTypes.CLEANDRAW, handles[MapTypes.CLEANDRAW])
  eventBus.off(mapName, MapTypes.ADD_FEATURES, handles[MapTypes.ADD_FEATURES])
  eventBus.off(mapName, MapTypes.FLY_TO, handles[MapTypes.FLY_TO])
  eventBus.off(mapName, MapTypes.ZOOM_TO, handles[MapTypes.ZOOM_TO])
  eventBus.off(mapName, MapTypes.FLASH, handles[MapTypes.FLASH])
  map.dispose();
  setMainMap(null as any);
})
</script>

<style scoped>
.main-map-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.fea-props,.main-map{
  position: absolute;
}
.fea-props {
  width: 150px;
  font-size: 12px;
  bottom: 0;
  right: 0;
  z-index: 2;
  background: var(--gis-map-props-bg);
  color: var(--gis-map-props-text);
}
.fea-props .row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;

}
.fea-props .row .key {
  display: inline-block;
  width: 50px;
  text-align: right;
  padding-right: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  color: var(--el-color-primary-dark-2);
  border: 1px solid var(--gis-map-props-border);
  border-width: 1px 0 0 1px;
}
.fea-props .row .value {
  display: inline-block;
  width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  border: 1px solid var(--gis-map-props-border);
  border-width: 1px 0 0 1px;
}

.mouse-coord {
  position: absolute;
  bottom: 4px;
  left: 4px;
  z-index: 3;
  font-size: 11px;
  font-family: monospace;
  padding: 2px 6px;
  background: var(--gis-map-props-bg);
  color: var(--gis-map-props-text);
  border-radius: 3px;
  pointer-events: none;
}

.main-map {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  filter: var(--gis-map-filter);
  transition: filter 0.3s ease;
}
</style>
