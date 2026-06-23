<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Fold, Expand, UploadFilled, Plus, Delete, Monitor, Sunny, Moon } from '@element-plus/icons-vue'

import { GisError, createUserMessage } from '~/common/GisError'
import { logger } from '~/common/logger'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import GisDataImportDialog from '~/components/data/GisDataImportDialog.vue'
import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataOverview from '~/components/data/GisDataOverview.vue'
import GisDataPanel from '~/components/data/GisDataPanel.vue'
import GisMobileNav from '~/components/data/GisMobileNav.vue'
import GisMapTianditu from '~/components/gismap/GisMapTianditu.vue'
import { themeMode } from '~/composables/dark'
import { useBreakpoint } from '~/composables/useBreakpoint'
import { useGisDataStore } from '~/composables/gisDataStore'
import { useMapController } from '~/composables/useMapController'

const { datasets, activeId, activeDataset, setActive, removeDataset, addDataSource } = useGisDataStore()
const { isMobile, panelWidth, panelCollapsedWidth, showLeftPanel, showMobileNav } = useBreakpoint()

const importDialogVisible = ref(false)

// 左面板折叠状态
const panelCollapsed = ref(false)

// 用户拖拽调整的面板宽度（覆盖断点默认值）
const userPanelWidth = ref<number | null>(null)
const isResizing = ref(false)

const currentPanelWidth = computed(() => {
  if (!showLeftPanel.value) return 0
  if (panelCollapsed.value) return panelCollapsedWidth.value
  return userPanelWidth.value ?? panelWidth.value
})

// 面板拖拽调整
const MIN_PANEL_WIDTH = 220
const MAX_PANEL_WIDTH = 600

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  const startX = e.clientX
  const startWidth = currentPanelWidth.value

  const onMouseMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta))
    userPanelWidth.value = newWidth
  }

  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 地图实例管理
const mapInstanceId = ref<number>(0)
const mapKey = ref(0)

// 当前活跃数据（经过 CRS 转换后的）
const activeData = ref<GisDataInfo>(new GisDataInfo())
const activeTransformChain = ref<number[]>([])

const { mapReady, mapReloaded, epsgCode, renderMapFeatures, setupMapReadyListener, cleanupMapReadyListener, stopEditMode } = useMapController({
  instanceId: mapInstanceId,
  data: activeData,
})

// 监听活跃数据集变化
watch(activeDataset, (dataset) => {
  if (dataset) {
    activeData.value = dataset.data
    activeTransformChain.value = dataset.data?.crs?.epsgCode ? [dataset.data.crs.epsgCode] : []
  } else {
    activeData.value = new GisDataInfo()
    activeTransformChain.value = []
  }
}, { immediate: true })

// 处理 GisDataPanel 的活跃数据变化
const handleActiveDataChange = (data: GisDataInfo, transformChain: number[]) => {
  activeData.value = data
  activeTransformChain.value = transformChain
}

// 处理数据读取
const handleRead = (data: unknown) => {
  const dataInfo = data as GisDataInfo
  addDataSource(dataInfo)
}

const handleError = (err: Error) => {
  logger.error('数据读取失败:', err)
}

// 数据集切换
const handleDatasetChange = (id: string) => {
  setActive(id)
}

// 数据集删除
const handleDatasetRemove = (id: string) => {
  removeDataset(id)
}

// 拖拽导入
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const buffer = await readFileAsArrayBuffer(file)
      const simpleDataFormat = new SimpleDataFormat()
      const data = await simpleDataFormat.read(buffer)
      data.name = file.name
      addDataSource(data)
    } catch (err: unknown) {
      let msg = createUserMessage(err)
      if (err instanceof GisError) {
        msg = `[${err.code}]\n\n${msg}`
      }
      ElMessageBox.alert(msg, '解析失败', { type: 'error' })
    }
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

// 地图初始化
watch(mapInstanceId, (id) => {
  if (id) {
    setupMapReadyListener()
  }
}, { immediate: true })

// 设置地图实例 ID（使用固定值便于调试）
const initMapInstance = () => {
  mapInstanceId.value = 1
}

// 进入/退出编辑模式
const handleEnterEditMode = () => {
  // 编辑模式由 GisFeatureTree 管理
}

const handleExitEditMode = () => {
  stopEditMode()
}

// 组件挂载时初始化
initMapInstance()
</script>

<template>
  <div class="gis-data-page" :class="{ 'is-mobile': isMobile }">
    <!-- 顶栏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <svg class="top-bar-logo" viewBox="0 0 44 44" width="22" height="22" aria-hidden="true">
          <polygon points="22,5 39,17 33,39 11,39 5,17" fill="rgba(234,88,12,0.18)" stroke="#ea580c" stroke-width="3.5" stroke-linejoin="round" />
        </svg>
        <span class="top-bar-title">Gis Tools</span>

        <!-- 数据集切换下拉 -->
        <el-select
          v-if="datasets.length > 0"
          v-model="activeId"
          size="small"
          class="dataset-select"
          placeholder="选择数据集"
          @change="handleDatasetChange"
        >
          <el-option
            v-for="entry in datasets"
            :key="entry.id"
            :label="entry.name"
            :value="entry.id"
          >
            <span style="float: left">{{ entry.name }}</span>
            <el-icon
              class="dataset-remove-icon"
              @click.stop="handleDatasetRemove(entry.id)"
            >
              <Delete />
            </el-icon>
          </el-option>
        </el-select>
      </div>

      <div class="top-bar-right">
        <el-button size="small" type="primary" @click="importDialogVisible = true">
          <el-icon><Plus /></el-icon>
          <span>导入</span>
        </el-button>
        <span v-if="datasets.length > 0" class="dataset-badge">{{ datasets.length }} 个数据集</span>
        <el-radio-group v-model="themeMode" size="small" class="theme-switch">
          <el-radio-button value="auto">
            <el-icon :size="14"><Monitor /></el-icon>
          </el-radio-button>
          <el-radio-button value="light">
            <el-icon :size="14"><Sunny /></el-icon>
          </el-radio-button>
          <el-radio-button value="dark">
            <el-icon :size="14"><Moon /></el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 导入弹窗 -->
    <gis-data-import-dialog v-model="importDialogVisible" />

    <!-- 主体内容 -->
    <div class="main-content" @dragover="handleDragOver" @drop="handleDrop">
      <!-- 空状态 -->
      <div
        v-if="datasets.length === 0"
        class="empty-state"
        role="button"
        tabindex="0"
        @click="importDialogVisible = true"
        @keydown.enter="importDialogVisible = true"
      >
        <div class="empty-content">
          <el-icon :size="44" color="var(--el-color-info-light-3)">
            <upload-filled />
          </el-icon>
          <p class="empty-title">暂无数据</p>
          <p class="empty-desc">
            <span class="empty-action">拖拽</span>
            <span>文件到此，或者</span>
            <span class="empty-action">点击</span>
            <span>查看更多方式</span>
          </p>
        </div>
      </div>

      <!-- 有数据时的布局 -->
      <template v-else>
        <!-- 桌面端：左面板 + 拖拽手柄 + 主内容区 -->
        <div v-if="showLeftPanel" class="desktop-layout">
          <!-- 左面板 -->
          <div class="left-panel" :class="{ collapsed: panelCollapsed }" :style="{ width: currentPanelWidth + 'px' }">
            <div class="panel-header">
              <span v-if="!panelCollapsed" class="panel-title">数据操作</span>
              <el-button text size="small" @click="panelCollapsed = !panelCollapsed" :title="panelCollapsed ? '展开' : '折叠'">
                <el-icon><Expand v-if="panelCollapsed" /><Fold v-else /></el-icon>
              </el-button>
            </div>
            <div v-if="!panelCollapsed" class="panel-body">
              <gis-data-panel
                :data="activeDataset?.data"
                :instance-id="mapInstanceId"
                :map-ready="mapReady"
                @open-import="importDialogVisible = true"
                @active-data-change="handleActiveDataChange"
                @read="handleRead"
                @error="handleError"
                @enter-edit-mode="handleEnterEditMode"
                @exit-edit-mode="handleExitEditMode"
              />
            </div>
          </div>

          <!-- 拖拽手柄 -->
          <div
            v-if="!panelCollapsed"
            class="panel-resize-handle"
            :class="{ dragging: isResizing }"
            @mousedown="startResize"
          ></div>

          <!-- 主内容区 -->
          <div class="content-area" :style="{ width: `calc(100% - ${currentPanelWidth}px - ${panelCollapsed ? 0 : 4}px)` }">
            <!-- 地图 -->
            <div class="map-container">
              <gis-map-tianditu
                :key="mapKey"
                :map-name="`${mapInstanceId}`"
                :options="{ projection: epsgCode }"
              />
            </div>
            <!-- 底部状态栏 -->
            <gis-data-overview
              :data="activeData"
              :transform-chain="activeTransformChain"
              mode="full"
            />
          </div>
        </div>

        <!-- 移动端：地图优先 + 底部状态栏 + 底部导航 -->
        <div v-else class="mobile-layout">
          <!-- 地图（全屏） -->
          <div class="map-container mobile-map">
            <gis-map-tianditu
              :key="mapKey"
              :map-name="`${mapInstanceId}`"
              :options="{ projection: epsgCode }"
            />
          </div>
          <!-- 底部简略状态栏 -->
          <gis-data-overview
            :data="activeData"
            :transform-chain="activeTransformChain"
            mode="compact"
          />
          <!-- 底部导航 -->
          <gis-mobile-nav
            :data="activeDataset?.data"
            :instance-id="mapInstanceId"
            :map-ready="mapReady"
            @open-import="importDialogVisible = true"
            @active-data-change="handleActiveDataChange"
            @read="handleRead"
            @error="handleError"
            @enter-edit-mode="handleEnterEditMode"
            @exit-edit-mode="handleExitEditMode"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gis-data-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
}

/* 顶栏 */
.top-bar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-bar-logo {
  flex-shrink: 0;
  border-radius: 5px;
}

.top-bar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.5px;
}

.dataset-select {
  width: 200px;
}

.dataset-remove-icon {
  float: right;
  color: var(--el-color-danger);
  cursor: pointer;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dataset-badge {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 10px;
}

.theme-switch :deep(.el-radio-button__inner) {
  padding: 4px 8px;
}

/* 主体内容 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 空状态 */
.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--el-border-color-lighter);
  border-radius: 8px;
  box-sizing: border-box;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  user-select: none;
  outline: none;
  margin: 8px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin: 8px 0 0 0;
}

.empty-desc {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.empty-action {
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 桌面端布局 */
.desktop-layout {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}

.left-panel {
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.left-panel.collapsed {
  background: var(--el-fill-color-lighter);
}

.panel-resize-handle {
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: var(--el-border-color-lighter);
  flex-shrink: 0;
  transition: background 0.2s;
  z-index: 5;
}

.panel-resize-handle:hover,
.panel-resize-handle.dragging {
  background: var(--el-color-primary);
}

.panel-header {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.left-panel.collapsed .panel-header {
  justify-content: center;
  padding: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-body {
  flex: 1;
  overflow: hidden;
}

.content-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 移动端布局 */
.mobile-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-map {
  flex: 1;
}

/* 移动端顶栏调整 */
.gis-data-page.is-mobile .top-bar {
  height: 36px;
  padding: 0 8px;
}

.gis-data-page.is-mobile .top-bar-title {
  display: none;
}

.gis-data-page.is-mobile .dataset-select {
  width: 140px;
}

.gis-data-page.is-mobile .dataset-badge {
  display: none;
}

.gis-data-page.is-mobile .top-bar-right .el-button span {
  display: none;
}
</style>
