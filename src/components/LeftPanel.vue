<template>
    
    <el-checkbox v-model="cleanBefore">每次绘制前清除</el-checkbox>
    <el-checkbox v-model="once">单次绘制</el-checkbox>
    <div>
        <el-button type="primary" @click="handleDrawTool('Point')">绘制工具-点</el-button>
        <el-button type="primary" @click="handleDrawTool('LineString')">绘制工具-线</el-button>
        <el-button type="primary" @click="handleDrawTool('Polygon')">绘制工具-面</el-button>
        <el-button type="primary" @click="handleDrawTool('None')">结束绘制工具</el-button>
        <el-button type="primary" @click="handleCleanDraw()">清除绘制</el-button>
        <div>
            <geo-str-editor class="w-full h-40" v-model="inputGeo"></geo-str-editor>
        </div>
        <el-button type="primary" @click="handleTurfDemo()">handleTurfDemo</el-button>
        <el-button type="primary" @click="handleAddGeometry()">添加到地图</el-button>
        
    <el-button type="primary"  @click="toggleDark()">toggleDark</el-button>
    </div>
</template>

<script setup lang="ts">
import { eventBus } from '~/composables/eventBus';
import { GisMapDrawEvent, GisMapCleanDrawEvent , GisMapAddFeaturesEvent, Types as MapTypes } from './gismap/events/GisMapEvents';
import { onMounted, ref } from 'vue';
import * as turf from '@turf/turf';
import * as GeoJSON from 'geojson';
import {toggleDark} from '~/composables/dark'
import { getMainMap } from '~/composables/gisMap';
const inputGeo = ref<string>('')
const cleanBefore = ref<boolean>(true)
const once = ref<boolean>(false)
const handleDrawTool = (type: ('Polygon' | 'Point' | 'LineString' | 'None')) => {
    eventBus.emit(new GisMapDrawEvent({ type, cleanBefore, once }))
}
const handleCleanDraw = () => {
    eventBus.emit(new GisMapCleanDrawEvent())
}
const handleAddGeometry = ()=>{
     const fs = [JSON.parse(inputGeo.value)  as GeoJSON.Feature];
    eventBus.emit(new GisMapAddFeaturesEvent(fs))
}
const handleTurfDemo = ()=>{
  const map =   getMainMap();
  const center = map?.getCenter()
  if(center){
    const point = turf.point([center[0], center[1]])
    inputGeo.value = JSON.stringify(point)
  }
}
onMounted(() => {
    eventBus.on(MapTypes.DRAWEND, async (data: any) => {
        inputGeo.value = data
    })
})
</script>

<style scoped></style>