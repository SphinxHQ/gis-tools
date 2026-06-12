<template>
  <div style="padding: 10px 0 0 40px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
    <map-city-selector :map-name="mapName" style="width: 140px;" />
    <el-popover ref="crsPopoverRef" placement="bottom" :width="320" trigger="click" @show="crsSelectorKey++">
      <template #reference>
        <el-button size="small">坐标系: EPSG:{{ crsCode }}</el-button>
      </template>
      <gis-crs-selector
        :key="crsSelectorKey"
        mode="all"
        :compact="true"
        :show-confirm="true"
        @change="handleCrsChange"
      />
    </el-popover>
    <el-button size="small" @click="handleDrawTool('Point')">点</el-button>
    <el-button size="small" @click="handleDrawTool('LineString')">线</el-button>
    <el-button size="small" @click="handleDrawTool('Polygon')">面</el-button>
    <el-button size="small" @click="handleDrawTool('None')">结</el-button>
    <el-button size="small" @click="handleCleanDraw()">清</el-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

import { CrsInfo } from '~/components/data/GisProjectedBounds';
import GisCrsSelector from '~/components/data/GisCrsSelector.vue';
import MapCitySelector from "~/components/gismap/MapCitySelector.vue";
import { eventBus } from '~/composables/eventBus';

import { GisMapDrawEvent, GisMapCleanDrawEvent, Types as MapTypes } from './events/GisMapEvents';
const props = defineProps({
  mapName:{
    type: String,
    default: 'main'
  }
})
const emit = defineEmits<{
  'crs-change': [epsgCode: number]
}>()
const inputGeo = ref<string>('')
const crsCode = ref<number>(4490)
const crsPopoverRef = ref()
const crsSelectorKey = ref(0)
const cleanBefore = ref<boolean>(true)
const once = ref<boolean>(false)
const keep = ref<boolean>(true)
const handleDrawTool = (type: ('Polygon' | 'Point' | 'LineString' | 'None')) => {
    eventBus.emit(props.mapName,new GisMapDrawEvent({ type, cleanBefore, once,keep }))
}
const handleCleanDraw = () => {
    eventBus.emit(props.mapName,new GisMapCleanDrawEvent())
}
const handleCrsChange = (crs: CrsInfo) => {
  crsCode.value = crs.epsgCode
  emit('crs-change', crs.epsgCode)
  // 关闭坐标系选择弹出框
  crsPopoverRef.value?.hide?.()
}

const drawEndHandler = async (data: any) => {
    inputGeo.value = data
}
onMounted(() => {
    eventBus.on(props.mapName, MapTypes.DRAWEND, drawEndHandler)
})
onBeforeUnmount(() => {
    eventBus.off(props.mapName, MapTypes.DRAWEND, drawEndHandler)
})
</script>

<style scoped></style>
