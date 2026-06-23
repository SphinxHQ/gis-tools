<script setup lang="ts">
import {ElMessageBox} from "element-plus";
import {computed, getCurrentInstance, onBeforeUnmount, onMounted, ref} from "vue";
import {View, Hide, Delete, Fold, Expand} from '@element-plus/icons-vue'

import GeomUtils from "~/common/GeomUtils";
import {GisMapRemoveDrawFeatureEvent, GisMapToggleDrawFeatureVisibleEvent, Types} from "~/components/gismap/events/GisMapEvents";
import {GisMapLayer} from "~/components/gismap/layer/GisLayer";
import {eventBus} from "~/composables/eventBus";
import {useBreakpoint} from "~/composables/useBreakpoint";

const mapName = `mapDraw-${Math.random().toString(36).slice(2)}`
const emit = defineEmits<{
  'change': []
  'submit': [features: Record<string, unknown>[], crsEpsg: number]
}>()
const featureList = ref<Array<{id: string; type: string; feature: Record<string, unknown>; hidden?: boolean}>>([])
const elHeight = ref(0)
const mapProjection = ref<number>(4490)
const mapKey = ref(0) // 用于强制重建地图组件

const { isMobile } = useBreakpoint()

// 侧栏折叠状态（桌面端）
const sidebarCollapsed = ref(false)
// 抽屉状态（移动端）
const drawerVisible = ref(false)

const sidebarWidth = computed(() => {
  if (isMobile.value) return 0
  return sidebarCollapsed.value ? 48 : 200
})

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
}

const handleSubmit = () => {
  emit('submit', featureList.value.map(x=>x.feature), mapProjection.value)
  if (isMobile.value) drawerVisible.value = false
}
</script>

<template>
  <div class="map-drawer">
    <!-- 桌面端：可折叠侧栏 -->
    <div v-if="!isMobile" class="md-left" :class="{ collapsed: sidebarCollapsed }" :style="{ width: sidebarWidth + 'px' }">
      <div class="md-left-header">
        <span v-if="!sidebarCollapsed" class="md-left-title">绘制要素</span>
        <el-button text size="small" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? '展开' : '折叠'">
          <el-icon><Expand v-if="sidebarCollapsed" /><Fold v-else /></el-icon>
        </el-button>
      </div>
      <div v-if="!sidebarCollapsed" class="md-left-top">
        <el-table :height="elHeight - 80" :data="featureList" size="small">
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
      <div v-if="!sidebarCollapsed" class="md-left-bottom">
        <el-button type="primary" :disabled="featureList?.length===0" @click="handleSubmit" size="small">确定</el-button>
      </div>
    </div>

    <!-- 移动端：抽屉按钮（图标按钮，位于城市下拉框左侧） -->
    <div v-else class="md-mobile-trigger">
      <el-badge :value="featureList.length" :hidden="featureList.length === 0" class="md-mobile-badge">
        <el-button type="primary" size="small" circle @click="drawerVisible = true" title="要素列表">
          <el-icon><Fold /></el-icon>
        </el-button>
      </el-badge>
    </div>

    <!-- 移动端：抽屉 -->
    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      size="280px"
      title="绘制要素"
      class="md-drawer"
    >
      <el-table :data="featureList" size="small">
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
      <template #footer>
        <el-button type="primary" :disabled="featureList?.length===0" @click="handleSubmit" style="width: 100%">确定</el-button>
      </template>
    </el-drawer>

    <!-- 地图区域 -->
    <div class="md-right" :style="{ width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)` }">
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
  position: relative;
}

.md-left {
  height: 100%;
  box-sizing: border-box;
  border-right: 1px solid #DDD;
  transition: width 0.2s ease;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.md-left.collapsed {
  background: var(--el-fill-color-lighter);
}

.md-left-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

.md-left.collapsed .md-left-header {
  justify-content: center;
  padding: 0;
}

.md-left-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.md-left-top {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #DDD;
  overflow: hidden;
}

.md-left-bottom {
  height: 40px;
  width: 100%;
  box-sizing: border-box;
  padding: 4px;
}
.md-left-bottom button{
  width: 100%;
  height: 100%;
}

.md-right {
  height: 100%;
  box-sizing: border-box;
  position: relative;
  transition: width 0.2s ease;
}

.md-mobile-trigger {
  position: absolute;
  top: 6px;
  left: 4px;
  z-index: 3;
}

.md-mobile-badge :deep(.el-badge__content) {
  z-index: 4;
}

.md-drawer :deep(.el-drawer__body) {
  padding: 8px;
}
</style>
