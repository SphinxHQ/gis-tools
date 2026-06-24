<template>

    <el-checkbox v-model="cleanBefore">绘制前清除</el-checkbox>
    <el-checkbox v-model="once">单次绘制</el-checkbox>
    <el-checkbox v-model="keep">保留绘制</el-checkbox>
    <div>
        <el-button type="primary" @click="handleDrawTool('Point')">绘制工具-点</el-button>
        <el-button type="primary" @click="handleDrawTool('LineString')">绘制工具-线</el-button>
        <el-button type="primary" @click="handleDrawTool('Polygon')">绘制工具-面</el-button>
        <el-button type="primary" @click="handleDrawTool('None')">结束绘制工具</el-button>
        <el-button type="primary" @click="handleCleanDraw()">清除绘制</el-button>
        <el-button type="primary" @click="handleAddGeometry()">添加到地图</el-button>
    </div>
</template>

<script setup lang="ts">
/**
 * @file Left panel component
 * @description Collapsible left sidebar panel for data tools and CRS selection.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */

import * as GeoJSON from 'geojson';
import { onMounted, ref } from 'vue';

import { eventBus } from '~/composables/eventBus';

import { GisMapDrawEvent, GisMapCleanDrawEvent , GisMapAddFeaturesEvent, Types as MapTypes } from './gismap/events/GisMapEvents';

/** GeoJSON input text for adding geometry to map */
const inputGeo = ref<string>('')
/** Whether to clear existing features before drawing */
const cleanBefore = ref<boolean>(true)
/** Whether to stop after one drawing session */
const once = ref<boolean>(false)
/** Whether to keep the drawn feature on the map */
const keep = ref<boolean>(true)

/**
 * Emit a draw tool event to the map
 * @param type - Geometry type to draw
 */
const handleDrawTool = (type: ('Polygon' | 'Point' | 'LineString' | 'None')) => {
    eventBus.emit('main',new GisMapDrawEvent({ type, cleanBefore, once,keep }))
}

/** Emit a clean draw event to clear drawn features */
const handleCleanDraw = () => {
    eventBus.emit('main',new GisMapCleanDrawEvent())
}

/** Parse the GeoJSON input and add it as features to the map */
const handleAddGeometry = ()=>{
     const fs = [JSON.parse(inputGeo.value)  as GeoJSON.Feature];
    eventBus.emit('main',new GisMapAddFeaturesEvent(fs))
}

/** Listen for draw-end events to update the GeoJSON input */
onMounted(() => {
    eventBus.on('main',MapTypes.DRAWEND, async (data: any) => {
        inputGeo.value = data
    })
})
</script>

<style scoped></style>
