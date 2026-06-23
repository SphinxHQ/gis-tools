<script setup lang="ts">
import {ElMessageBox} from "element-plus";
import {getCurrentInstance, onBeforeUnmount, onMounted, ref} from "vue";
import {View, Hide, Delete} from '@element-plus/icons-vue'

import GeomUtils from "~/common/GeomUtils";
import {GisMapRemoveDrawFeatureEvent, GisMapToggleDrawFeatureVisibleEvent, Types} from "~/components/gismap/events/GisMapEvents";
import {GisMapLayer} from "~/components/gismap/layer/GisLayer";
import {eventBus} from "~/composables/eventBus";

const mapName = `mapDraw-${Math.random().toString(36).slice(2)}`
const emit = defineEmits<{
  'change': []
  'submit': [features: Record<string, unknown>[], crsEpsg: number]
}>()
const featureList = ref<Array<{id: string; type: string; feature: Record<string, unknown>; hidden?: boolean}>>([])
const elHeight = ref(0)
const mapProjection = ref<number>(4490)
const mapKey = ref(0) // 用于强制重建地图组件
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    elHeight.value = entry.contentRect.height;
  }
})
onMounted(()=>{
  const currentInstance = getCurrentInstance();
  resizeObserver.observe(currentInstance?.vnode.el as Element);
})
onBeforeUnmount(()=>{
  resizeObserver.disconnect();
})

const handle  =(option: any, name: string, layer?: GisMapLayer) => {
  if (name === 'GisMap::drawTool::drawend' || name === 'GisMap::cleanSource') {
    featureList.value.splice(0);
    const allFeatures = layer?.features;
    if (Array.isArray(allFeatures)) {
      featureList.value.push(...(allFeatures as Record<string, unknown>[]).map((x) => ({
        id: x.id as string,
        type: GeomUtils.getTypeName((x.geometry as Record<string, string>)?.type),
        feature: x,
        hidden: false,
      })));
    }
  }
}
eventBus.on(mapName, Types.NOTIFY, handle )
onBeforeUnmount(()=>{
  eventBus.off(mapName, Types.NOTIFY, handle )
})

// 移除绘制要素
const handleRemove = (id: string) => {
  featureList.value = featureList.value.filter(x => x.id !== id)
  eventBus.emit(mapName, new GisMapRemoveDrawFeatureEvent(id))
}

// 隐藏/显示绘制要素
const handleToggleVisible = (id: string) => {
  const item = featureList.value.find(x => x.id === id)
  if (!item) return
  item.hidden = !item.hidden
  eventBus.emit(mapName, new GisMapToggleDrawFeatureVisibleEvent(id, !item.hidden))
}

const handleCrsChange = async (epsgCode: number) => {
  if (featureList.value.length > 0) {
    try {
      await ElMessageBox.confirm(
        `切换坐标系将从 EPSG:${mapProjection.value} 变为 EPSG:${epsgCode}，已绘制的图形将进行坐标转换。是否继续？`,
        '切换坐标系',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return // 用户取消
    }
  }
  mapProjection.value = epsgCode
  mapKey.value++ // 强制重建地图
  // TODO: 对已绘制的 feature 做坐标转换后重新加载
}
</script>

<template>
  <div class="map-drawer">
    <div class="md-left">
      <div class="md-left-top">
        <el-table :height="elHeight - 40" :data="featureList">
          <el-table-column type="index" label="序号" width="50" />
          <el-table-column prop="type" label="类型" width="50" />
          <el-table-column label="操作" min-width="80">
            <template #default="{ row }">
              <el-button text size="small" @click="handleToggleVisible(row.id)" :title="row.hidden ? '显示' : '隐藏'">
                <el-icon><View v-if="row.hidden" /><Hide v-else /></el-icon>
              </el-button>
              <el-button text size="small" type="danger" @click="handleRemove(row.id)" title="移除">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="md-left-bottom">
        <el-button type="primary" :disabled="featureList?.length===0" @click="emit('submit', featureList.map(x=>x.feature), mapProjection)">确定</el-button>
      </div>
    </div>
    <div class="md-right">
      <map-control-panel :map-name="mapName"
                         style="position: absolute; left: 0; top:0; z-index: 2;"
                         @crs-change="handleCrsChange"
      />
      <gis-map-tianditu :key="mapKey" :map-name="mapName" :options="{ projection: mapProjection }" style="position: absolute; left: 0; top:0; z-index: 1;" />
    </div>
  </div>
</template>

<style scoped>

.map-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  border: 1px solid #DDD;
}

.md-left {
  width: 200px;
  height: 100%;
  box-sizing: border-box;
  border-right: 1px solid #DDD;
}

.md-right {
  width: calc(100% - 200px);
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.md-left-top {
  height: v-bind(elHeight-40 + 'px');
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #DDD;
}

.md-left-bottom {
  height: 40px;
  width: 100%;
  box-sizing: border-box;
}
.md-left-bottom button{
  width: 100%;
  height: 100%;
}
</style>
