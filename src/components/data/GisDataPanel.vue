<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Compass, MapLocation, CircleCheck, Download, Delete, UploadFilled, FolderOpened } from '@element-plus/icons-vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataExport from '~/components/data/GisDataExport.vue'
import GisDataTransformer from '~/components/data/GisDataTransformer.vue'
import GisDataValidator from '~/components/data/GisDataValidator.vue'
import GisFeatureTree from '~/components/data/GisFeatureTree.vue'
import { useGisDataStore } from '~/composables/gisDataStore'

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

// 数据集 store（用于数据源 Tab 树形结构）
const { datasets, dataSources, activeId, setActive, removeDataset } = useGisDataStore()

const activeTab = ref('source')

const tabOptions = [
  { value: 'source', label: '数据源' },
  { value: 'crs', label: '坐标系' },
  { value: 'feature', label: '要素' },
  { value: 'validate', label: '校验' },
  { value: 'export', label: '导出' },
]

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

const handleEnterEditMode = () => {
  emit('enter-edit-mode')
}

const handleExitEditMode = () => {
  emit('exit-edit-mode')
}

// 打开导入弹窗（由父组件 GisData.vue 处理）
const handleOpenImport = () => {
  emit('open-import')
}

// 数据源树形数据：数据源(N) → 数据集(N)，真实两级层级
interface SourceTreeNode {
  id: string
  label: string
  type: 'source' | 'dataset'
  raw?: GisDataInfo
  appendedFrom?: { name: string; count: number }[]
  children?: SourceTreeNode[]
}

const sourceTreeData = computed<SourceTreeNode[]>(() => {
  return dataSources.value.map(source => ({
    id: source.id,
    label: `${source.name} (${source.datasets.length})`,
    type: 'source' as const,
    children: source.datasets.map(entry => ({
      id: entry.id,
      label: entry.name,
      type: 'dataset' as const,
      raw: entry.data,
      appendedFrom: entry.appendedFrom,
    })),
  }))
})

// 树节点点击：仅数据集节点可激活
const handleNodeClick = (nodeData: SourceTreeNode) => {
  if (nodeData.type === 'dataset' && nodeData.id) {
    setActive(nodeData.id)
  }
}

// 数据集删除
const handleDatasetRemove = (id: string, e: Event) => {
  e.stopPropagation()
  removeDataset(id)
}

// 数据集信息辅助
const getDatasetCrs = (data?: GisDataInfo) => {
  return data?.crs?.epsgCode ? `EPSG:${data.crs.epsgCode}` : '未设置'
}

// 是否有数据
const hasData = computed(() => !!props.data?.features?.length)
const hasActiveData = computed(() => !!activeData.value?.features?.length)
</script>

<template>
  <div class="gis-data-panel">
    <!-- Tab 切换器（el-segmented 替代 el-tabs，消除嵌套冲突） -->
    <div class="panel-switcher">
      <el-segmented v-model="activeTab" :options="tabOptions" block size="small" />
    </div>

    <!-- Tab 内容区 -->
    <div class="panel-content">
      <!-- Tab1: 数据源（树形结构：数据源 → 数据集 1:N） -->
      <div v-show="activeTab === 'source'" class="tab-pane-content source-tab">
        <!-- 工具栏 -->
        <div class="source-toolbar">
          <span class="source-toolbar-title">数据源</span>
          <el-button size="small" type="primary" plain @click="handleOpenImport">
            <el-icon><UploadFilled /></el-icon>
            <span>导入数据</span>
          </el-button>
        </div>

        <!-- 树形数据源 -->
        <div class="source-tree-body">
          <el-tree
            v-if="datasets.length > 0"
            :data="sourceTreeData"
            node-key="id"
            :default-expand-all="true"
            :expand-on-click-node="false"
            :highlight-current="true"
            :current-node-key="activeId"
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node" :class="{ 'is-dataset': data.type === 'dataset', 'is-active': data.id === activeId }">
                <el-icon v-if="data.type === 'source'" class="tree-node-icon"><FolderOpened /></el-icon>
                <el-icon v-else class="tree-node-icon"><MapLocation /></el-icon>
                <span class="tree-node-label">{{ node.label }}</span>
                <template v-if="data.type === 'dataset'">
                  <el-tag size="small" type="info" effect="plain" class="tree-node-tag">{{ getDatasetCrs(data.raw) }}</el-tag>
                  <span class="tree-node-stat">{{ data.raw?.features?.length ?? 0 }} 要素</span>
                  <el-tooltip
                    v-if="data.appendedFrom && data.appendedFrom.length > 0"
                    :content="data.appendedFrom.map(a => `从「${a.name}」追加了 ${a.count} 个要素`).join('；')"
                    placement="top"
                  >
                    <el-tag size="small" type="warning" effect="dark" class="tree-node-tag">已追加</el-tag>
                  </el-tooltip>
                  <el-icon class="tree-node-delete" title="删除" @click.stop="handleDatasetRemove(data.id, $event)"><Delete /></el-icon>
                </template>
              </div>
            </template>
          </el-tree>

          <!-- 空状态 -->
          <div v-else class="source-empty">
            <el-icon :size="32" color="var(--el-text-color-placeholder)"><UploadFilled /></el-icon>
            <p>暂无数据集</p>
            <p class="source-empty-hint">点击上方「导入数据」添加数据</p>
          </div>
        </div>
      </div>

      <!-- Tab2: 坐标系 -->
      <div v-show="activeTab === 'crs'" class="tab-pane-content">
        <gis-data-transformer
          v-if="hasData"
          :data="data"
          @active-data-change="handleActiveDataChange"
        />
        <div v-else class="tab-empty">
          <el-icon :size="32" color="var(--el-text-color-placeholder)"><Compass /></el-icon>
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
          <el-icon :size="32" color="var(--el-text-color-placeholder)"><MapLocation /></el-icon>
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
          <el-icon :size="32" color="var(--el-text-color-placeholder)"><CircleCheck /></el-icon>
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
          <el-icon :size="32" color="var(--el-text-color-placeholder)"><Download /></el-icon>
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

/* 数据源 Tab 树形结构 */
.source-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.source-toolbar {
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.source-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.source-tree-body {
  flex: 1;
  overflow: auto;
  padding: 4px;
}

/* 树节点 */
.source-tree-body :deep(.el-tree) {
  background: transparent;
}

.source-tree-body :deep(.el-tree-node__content) {
  height: 32px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 2px 4px;
  border-radius: 4px;
}

.tree-node.is-dataset {
  cursor: pointer;
}

.tree-node.is-active {
  background: var(--el-color-primary-light-9);
}

.tree-node-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.tree-node-label {
  font-size: 13px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.tree-node-tag {
  flex-shrink: 0;
}

.tree-node-stat {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.tree-node-delete {
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
}

.tree-node-delete:hover {
  color: var(--el-color-danger);
}

/* 数据源空状态 */
.source-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 0;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.source-empty-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
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
