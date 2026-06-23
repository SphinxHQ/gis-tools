<script setup lang="ts">
import { ref, watch } from 'vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataReader from '~/components/data/GisDataReader.vue'
import GisDataExport from '~/components/data/GisDataExport.vue'
import GisDataTransformer from '~/components/data/GisDataTransformer.vue'
import GisDataValidator from '~/components/data/GisDataValidator.vue'
import GisFeatureTree from '~/components/data/GisFeatureTree.vue'

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
  'open-import': []
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
  'enter-edit-mode': []
  'exit-edit-mode': []
  'read': [data: unknown]
  'error': [err: Error]
}>()

const activeTab = ref('source')

// 当前活跃数据（经过 CRS 转换后的）
const activeData = ref<GisDataInfo>(props.data)
const activeTransformChain = ref<number[]>([])

watch(() => props.data, (newData) => {
  activeData.value = newData
  activeTransformChain.value = newData?.crs?.epsgCode ? [newData.crs.epsgCode] : []
}, { immediate: true })

const handleActiveDataChange = (data: GisDataInfo, transformChain: number[]) => {
  activeData.value = data
  activeTransformChain.value = transformChain
  emit('active-data-change', data, transformChain)
}

const handleRead = (data: unknown) => {
  emit('read', data)
}

const handleError = (err: Error) => {
  emit('error', err)
}

const handleEnterEditMode = () => {
  emit('enter-edit-mode')
}

const handleExitEditMode = () => {
  emit('exit-edit-mode')
}
</script>

<template>
  <div class="gis-data-panel">
    <el-tabs v-model="activeTab" class="panel-tabs" tab-position="top">
      <!-- Tab1: 数据源 -->
      <el-tab-pane label="数据源" name="source">
        <gis-data-reader
          v-if="activeTab === 'source'"
          @read="handleRead"
          @error="handleError"
        />
      </el-tab-pane>

      <!-- Tab2: 坐标系 -->
      <el-tab-pane label="坐标系" name="crs" :disabled="!data?.features?.length">
        <gis-data-transformer
          v-if="activeTab === 'crs' && data?.features?.length"
          :data="data"
          @active-data-change="handleActiveDataChange"
        />
      </el-tab-pane>

      <!-- Tab3: 要素 -->
      <el-tab-pane label="要素" name="feature" :disabled="!activeData?.features?.length">
        <gis-feature-tree
          v-if="activeTab === 'feature' && activeData?.features?.length"
          :data="activeData"
          :instance-id="instanceId"
          :map-ready="mapReady"
          @enter-edit-mode="handleEnterEditMode"
          @exit-edit-mode="handleExitEditMode"
        />
      </el-tab-pane>

      <!-- Tab4: 校验 -->
      <el-tab-pane label="校验" name="validate" :disabled="!activeData?.features?.length">
        <gis-data-validator
          v-if="activeTab === 'validate' && activeData?.features?.length"
          :data="activeData"
          :instance-id="instanceId"
          :tree-height="400"
        />
      </el-tab-pane>

      <!-- Tab5: 导出 -->
      <el-tab-pane label="导出" name="export" :disabled="!activeData?.features?.length">
        <gis-data-export
          v-if="activeTab === 'export' && activeData?.features?.length"
          :data="activeData"
        />
      </el-tab-pane>
    </el-tabs>
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

.panel-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-tabs :deep(.el-tabs__header) {
  margin: 0;
  flex-shrink: 0;
}

.panel-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.panel-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.panel-tabs :deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
}

.panel-tabs :deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
  padding: 0 4px;
  font-size: 12px;
}
</style>
