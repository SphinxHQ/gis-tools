<template>
  <div style="padding: 10px 0 0 40px;">
    <map-city-selector :map-name="mapName" style="width: 140px; margin-right: 10px;" />
    <el-button type="primary" @click="handleDrawTool('Point')">绘制-点</el-button>
    <el-button type="primary" @click="handleDrawTool('LineString')">绘制-线</el-button>
    <el-button type="primary" @click="handleDrawTool('Polygon')">绘制-面</el-button>
    <el-button type="primary" @click="handleDrawTool('None')">结束绘制</el-button>
    <el-button type="primary" @click="handleCleanDraw()">清除绘制</el-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import MapCitySelector from "~/components/gismap/MapCitySelector.vue";
import { eventBus } from '~/composables/eventBus';

import { GisMapDrawEvent, GisMapCleanDrawEvent, Types as MapTypes } from './events/GisMapEvents';
const props = defineProps({
  mapName:{
    type: String,
    default: 'main'
  }
})
const inputGeo = ref<string>('')
const cleanBefore = ref<boolean>(true)
const once = ref<boolean>(false)
const keep = ref<boolean>(true)
const handleDrawTool = (type: ('Polygon' | 'Point' | 'LineString' | 'None')) => {
    eventBus.emit(props.mapName,new GisMapDrawEvent({ type, cleanBefore, once,keep }))
}
const handleCleanDraw = () => {
    eventBus.emit(props.mapName,new GisMapCleanDrawEvent())
}

onMounted(() => {
    eventBus.on(props.mapName,MapTypes.DRAWEND, async (data: any) => {
        inputGeo.value = data
    })
})
</script>

<style scoped></style>
