<template>
    <div class="main-map-container">
        <div w="full" h="full" :id="mapContainerId"></div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, Ref, ref } from 'vue';
import Common from '~/common/Common';
import { BaseTianDiTuMap, GisMap } from './gismap/GisMap';
import { eventBus } from '~/composables/eventBus';
import { Types as MapTypes } from './gismap/events/GisMapEvents'; 
import { setMainMap } from '~/composables/gisMap';
const uuid: string = Common.uuid()
const mapContainerId: string = 'map-' + uuid;
let map: GisMap;
onBeforeMount(() => {
    eventBus.on(MapTypes.DRAWTOOL, async (data: any) =>map.drawTool(data))
    eventBus.on(MapTypes.CLEANDRAW, async () =>map.cleanDraw())
    eventBus.on(MapTypes.ADD_FEATURES, async (features:GeoJSON.Feature[],options?:any) =>map.addFeatures(features,options))
});
onMounted(() => {
    map = new BaseTianDiTuMap(mapContainerId);
    setMainMap(map);
});
</script>

<style scoped>
.main-map-container {
    width: 100%;
    height: 100%;
}
</style>