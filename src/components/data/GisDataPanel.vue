<script setup lang="ts">
/**
 * @file GIS data panel component
 * @description The bottom data panel showing dataset details with tabs for overview,
 *              features, validation, and export. Shares Tab state logic with
 *              GisMobileTabBar via useDataPanelTabs composable (single code path).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import GisDataExport from '~/components/data/GisDataExport.vue'
import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataTransformer from '~/components/data/GisDataTransformer.vue'
import GisDataValidator from '~/components/data/GisDataValidator.vue'
import GisFeatureTree from '~/components/data/GisFeatureTree.vue'
import TabIconRender from '~/components/renders/TabIconRender.vue'
import { useDataPanelTabs, DATA_PANEL_TAB_OPTIONS } from '~/composables/useDataPanelTabs'

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  instanceId: {
    type: [Number, String],
    default: 0
  },
  mapReady: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
  'enter-edit-mode': []
  'exit-edit-mode': []
  'read': [data: unknown]
  'error': [err: Error]
}>()

// 复用共享 Tab 状态逻辑（与 GisMobileTabBar 同一代码路径）
const {
  activeTab,
  activeData,
  hasData,
  hasActiveData,
  handleActiveDataChange,
  handleEnterEditMode,
  handleExitEditMode,
} = useDataPanelTabs(props, emit, 'crs')

// Tab 选项（来自共享定义）
const tabOptions = DATA_PANEL_TAB_OPTIONS
</script>

<template>
  <div class="gis-data-panel">
    <!-- Tab 切换器（el-segmented 替代 el-tabs，消除嵌套冲突） -->
    <div class="panel-switcher">
      <el-segmented v-model="activeTab" :options="tabOptions" block size="small" />
    </div>

    <!-- Tab 内容区 -->
    <div class="panel-content">
      <!-- Tab1: 坐标系 -->
      <div v-show="activeTab === 'crs'" class="tab-pane-content">
        <gis-data-transformer
          v-if="hasData"
          :data="data"
          @active-data-change="handleActiveDataChange"
        />
        <div v-else class="tab-empty">
          <TabIconRender tab="crs" :size="32" style="color: var(--el-text-color-placeholder)" />
          <p>请先导入数据</p>
        </div>
      </div>

      <!-- Tab3: 要素 -->
      <div v-show="activeTab === 'feature'" class="tab-pane-content">
        <gis-feature-tree
          v-if="hasActiveData"
          :data="activeData"
          :instance-id="instanceId"
          :map-ready="mapReady"
          @enter-edit-mode="handleEnterEditMode"
          @exit-edit-mode="handleExitEditMode"
        />
        <div v-else class="tab-empty">
          <TabIconRender tab="feature" :size="32" style="color: var(--el-text-color-placeholder)" />
          <p>请先导入数据</p>
        </div>
      </div>

      <!-- Tab4: 校验 -->
      <div v-show="activeTab === 'validate'" class="tab-pane-content">
        <gis-data-validator
          v-if="hasActiveData"
          :data="activeData"
          :instance-id="instanceId"
          :tree-height="400"
        />
        <div v-else class="tab-empty">
          <TabIconRender tab="validate" :size="32" style="color: var(--el-text-color-placeholder)" />
          <p>请先导入数据</p>
        </div>
      </div>

      <!-- Tab5: 导出 -->
      <div v-show="activeTab === 'export'" class="tab-pane-content">
        <gis-data-export
          v-if="hasActiveData"
          :data="activeData"
        />
        <div v-else class="tab-empty">
          <TabIconRender tab="export" :size="32" style="color: var(--el-text-color-placeholder)" />
          <p>请先导入数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-data-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  box-sizing: border-box;
  overflow: hidden;
}

/* Tab 切换器 */
.panel-switcher {
  flex-shrink: 0;
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-switcher :deep(.el-segmented) {
  width: 100%;
}

.panel-switcher :deep(.el-segmented__item-label) {
  font-size: 12px;
  padding: 0 4px;
}

/* Tab 内容区 */
.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-pane-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 其他 Tab 空状态 */
.tab-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
