<script setup lang="ts">
/**
 * @file Map drawer component
 * @description 绘制地图容器：地图区域 + 统一工具条（MapControlPanel）。
 *              所有交互功能集中在工具条，地图区域只保留底图。
 *              遵循单一代码路径原则：桌面端与移动端共享同一套 DOM 和业务逻辑。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {getCurrentInstance, onBeforeUnmount, onMounted, ref} from "vue";
import {ElMessageBox} from "element-plus";

import GeomUtils from "~/common/GeomUtils";
import {GisMapRemoveDrawFeatureEvent, GisMapToggleDrawFeatureVisibleEvent, Types} from "~/components/gismap/events/GisMapEvents";
import {GisMapLayer} from "~/components/gismap/layer/GisLayer";
import {eventBus} from "~/composables/eventBus";

const mapName = `mapDraw-${Math.random().toString(36).slice(2)}`
const emit = defineEmits<{
  'change': []
  'submit': [features: Record<string, unknown>[], crsEpsg: number]
}>()

/** 已绘制要素列表（由 eventBus 监听绘制结束事件自动更新） */
const featureList = ref<Array<{id: string; type: string; feature: Record<string, unknown>; hidden?: boolean}>>([])
const mapProjection = ref<number>(4490)
const mapKey = ref(0) // 用于强制重建地图组件

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    // 容器尺寸变化时通知 OpenLayers 地图更新尺寸（tab 切换、窗口缩放等场景）
    void entry
    window.dispatchEvent(new Event('resize'))
  }
})
onMounted(()=>{
  const currentInstance = getCurrentInstance();
  resizeObserver.observe(currentInstance?.vnode.el as Element);
})
onBeforeUnmount(()=>{
  resizeObserver.disconnect();
})

/** eventBus 通知处理：绘制结束/清除时同步更新 featureList */
const handle = (option: unknown, name: string, layer?: GisMapLayer) => {
  void option
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
eventBus.on(mapName, Types.NOTIFY, handle)
onBeforeUnmount(()=>{
  eventBus.off(mapName, Types.NOTIFY, handle)
})

/** 移除绘制要素（由工具条列表 popover 触发） */
const handleRemove = (id: string) => {
  featureList.value = featureList.value.filter(x => x.id !== id)
  eventBus.emit(mapName, new GisMapRemoveDrawFeatureEvent(id))
}

/** 隐藏/显示绘制要素（由工具条列表 popover 触发） */
const handleToggleVisible = (id: string) => {
  const item = featureList.value.find(x => x.id === id)
  if (!item) return
  item.hidden = !item.hidden
  eventBus.emit(mapName, new GisMapToggleDrawFeatureVisibleEvent(id, !item.hidden))
}

/** 切换坐标系（由工具条坐标系按钮触发） */
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
}

/** 提交绘制结果（由工具条列表 popover 的确定按钮触发） */
const handleSubmit = () => {
  emit('submit', featureList.value.map(x=>x.feature), mapProjection.value)
}
</script>

<template>
  <div class="map-drawer">
    <!-- 地图区域（底图 + 工具条） -->
    <div class="md-right">
      <!-- 统一工具条：图形列表、城市选择、坐标系、绘制功能层叠按钮 -->
      <map-control-panel
        :map-name="mapName"
        :feature-list="featureList"
        style="position: absolute; left: 0; top: 0; z-index: 2;"
        @crs-change="handleCrsChange"
        @remove-feature="handleRemove"
        @toggle-feature-visible="handleToggleVisible"
        @submit="handleSubmit"
      />
      <!-- 天地图底图 -->
      <gis-map-tianditu :key="mapKey" :map-name="mapName" :options="{ projection: mapProjection }" style="position: absolute; left: 0; top: 0; z-index: 1;" />
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
  position: relative;
}

.md-right {
  flex: 1;
  height: 100%;
  box-sizing: border-box;
  position: relative;
}
</style>
