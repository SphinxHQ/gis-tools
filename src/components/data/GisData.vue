<script setup lang="ts">
/**
 * @file Main GIS data view component
 * @description The primary application view providing data import, dataset management,
 *              left panel with data tree, CRS tools, and map integration via GisMapSlot.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import { Fold, Expand, UploadFilled, Plus, Monitor, Sunny, Moon, FolderOpened, MapLocation, Delete, Message } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'

import { GisError, createUserMessage } from '~/common/GisError'
import { logger } from '~/common/logger'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import GisDataImportDialog from '~/components/data/GisDataImportDialog.vue'
import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataOverview from '~/components/data/GisDataOverview.vue'
import GisDataPanel from '~/components/data/GisDataPanel.vue'
import GisMobileNav from '~/components/data/GisMobileNav.vue'
import GisMapSlot from '~/components/gismap/GisMapSlot.vue'
import { themeMode } from '~/composables/dark'
import { useGisDataStore } from '~/composables/gisDataStore'
import { useBreakpoint } from '~/composables/useBreakpoint'
import { useShareReceiver } from '~/composables/useShareReceiver'

const { datasets, dataSources, activeId, activeDataset, setActive, addDataSource, removeDataset } = useGisDataStore()
const { isMobile, panelWidth, panelCollapsedWidth, showLeftPanel } = useBreakpoint()

const importDialogVisible = ref(false)

// 初始化分享接收：检测 URL ?share=1 标记，从 Cache Storage 读取系统分享的文件并自动导入
const { init: initShareReceiver } = useShareReceiver()
onMounted(() => {
  initShareReceiver()
})

// logo 动画重播：通过改变 key 强制重新挂载 SVG，使 SMIL 动画重新播放
const logoKey = ref(0)
const replayLogo = () => {
  logoKey.value++
}

// 数据源抽屉（右侧）
const sourceDrawerVisible = ref(false)

// 数据集删除（带确认）
const handleSourceDatasetRemove = async (id: string, e: Event) => {
  e.stopPropagation()
  const entry = datasets.value.find(d => d.id === id)
  const name = entry?.name || '该数据集'
  try {
    await ElMessageBox.confirm(
      `确定删除「${name}」吗？此操作不可撤销。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    removeDataset(id)
  } catch {
    // 用户取消
  }
}

// 数据集 CRS 信息辅助
const getDatasetCrs = (data?: GisDataInfo) => {
  return data?.crs?.epsgCode ? `EPSG:${data.crs.epsgCode}` : '未设置'
}

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
    userPanelWidth.value = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta))
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

// 当前活跃数据（经过 CRS 转换后的）
const activeData = ref<GisDataInfo>(new GisDataInfo())
const activeTransformChain = ref<number[]>([])

// 每个数据集的活跃数据（转换后），用于多地图实例渲染
const datasetActiveDataMap = ref<Map<string, GisDataInfo>>(new Map())

// 地图实例引用（用于编辑模式等操作）
const activeMapSlotRef = ref<InstanceType<typeof GisMapSlot> | null>(null)

// 获取数据集的活跃数据（优先转换后，否则原始）
const getDatasetActiveData = (entryId: string, entryData: GisDataInfo): GisDataInfo => {
  return datasetActiveDataMap.value.get(entryId) ?? entryData
}

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
  // 保存转换后数据到对应数据集的 map
  if (activeId.value) {
    datasetActiveDataMap.value.set(activeId.value, data)
  }
}

// 处理数据读取
const handleRead = (data: unknown) => {
  const dataInfo = data as GisDataInfo
  addDataSource(dataInfo)
}

const handleError = (err: Error) => {
  logger.error('数据读取失败:', err)
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

// 当前活跃地图实例 ID（供 GisDataPanel 和 GisMobileNav 使用）
const activeMapInstanceId = computed(() => activeId.value ? `map_${activeId.value}` : '')

// 进入/退出编辑模式
const handleEnterEditMode = () => {
  // 编辑模式由 GisFeatureTree 管理
}

const handleExitEditMode = () => {
  activeMapSlotRef.value?.stopEditMode()
}
</script>

<template>
  <div class="gis-data-page" :class="{ 'is-mobile': isMobile }">
    <!-- 顶栏 -->
    <div class="top-bar">
      <div class="top-bar-left" @mouseenter="replayLogo">
        <svg :key="logoKey" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 512 512">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- 半透明填充（闭合后淡入） -->
          <polygon points="256,50 460,198 382,432 130,432 52,198" fill="rgba(234,88,12,0.15)" stroke="none" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="1.6s" dur="0.3s" fill="freeze" />
          </polygon>

          <!-- 描边逐步绘制 -->
          <polygon points="256,50 460,198 382,432 130,432 52,198" fill="none" stroke="#ea580c" stroke-width="24"
            stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1250" stroke-dashoffset="1250"
>
            <animate attributeName="stroke-dashoffset" from="1250" to="0" dur="1.6s" fill="freeze" calcMode="linear" />
          </polygon>

          <!-- 5个节点依次出现 -->
          <circle cx="256" cy="50" r="30" fill="#ea580c" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="0s" dur="0.12s" fill="freeze" />
          </circle>
          <circle cx="460" cy="198" r="30" fill="#ea580c" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="0.32s" dur="0.12s" fill="freeze" />
          </circle>
          <circle cx="382" cy="432" r="30" fill="#ea580c" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="0.64s" dur="0.12s" fill="freeze" />
          </circle>
          <circle cx="130" cy="432" r="30" fill="#ea580c" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="0.96s" dur="0.12s" fill="freeze" />
          </circle>
          <circle cx="52" cy="198" r="30" fill="#ea580c" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin="1.28s" dur="0.12s" fill="freeze" />
          </circle>

          <!-- 画笔光点：与描边同步 -->
          <circle r="16" fill="#ea580c" opacity="0.85" filter="url(#glow)">
            <animateMotion path="M256,50 L460,198 L382,432 L130,432 L52,198 L256,50" dur="1.6s" fill="freeze"
              calcMode="linear"
/>
            <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.02;0.9;1" dur="1.6s" fill="freeze" />
            <animate attributeName="r" values="16;16;0" keyTimes="0;0.9;1" dur="1.6s" fill="freeze" />
          </circle>
        </svg>

        <span class="top-bar-title">Gis Tools</span>
        <a href="mailto:yuanyu@supermap.com" class="top-bar-contact" title="联系作者：yuanyu@supermap.com">
          <el-icon :size="14"><Message /></el-icon>
        </a>

      </div>

      <div class="top-bar-right">
        <el-button size="small" type="primary" @click="importDialogVisible = true">
          <el-icon>
            <Plus />
          </el-icon>
          <span>导入</span>
        </el-button>
        <el-button v-if="datasets.length > 0" size="small" class="dataset-badge-btn"
          @click="sourceDrawerVisible = true"
>
          <el-icon>
            <FolderOpened />
          </el-icon>
          <span>{{ datasets.length }} 个数据集</span>
        </el-button>
        <el-radio-group v-model="themeMode" size="small" class="theme-switch">
          <el-radio-button value="auto">
            <el-icon :size="14">
              <Monitor />
            </el-icon>
          </el-radio-button>
          <el-radio-button value="light">
            <el-icon :size="14">
              <Sunny />
            </el-icon>
          </el-radio-button>
          <el-radio-button value="dark">
            <el-icon :size="14">
              <Moon />
            </el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 导入弹窗 -->
    <gis-data-import-dialog v-model="importDialogVisible" />

    <!-- 数据源抽屉（右侧）：数据源分组 + 数据集卡片 -->
    <el-drawer v-model="sourceDrawerVisible" title="数据源" direction="rtl" size="380px" class="source-drawer">
      <div class="source-drawer-body">
        <!-- 数据源分组 -->
        <div v-for="source in dataSources" :key="source.id" class="source-group">
          <!-- 数据源标题 -->
          <div class="source-group-header">
            <el-icon class="source-group-icon">
              <FolderOpened />
            </el-icon>
            <span class="source-group-title">{{ source.name }}</span>
            <span class="source-group-count">{{ source.datasets.length }}</span>
          </div>
          <!-- 数据集卡片 -->
          <div class="dataset-cards">
            <div v-for="entry in source.datasets" :key="entry.id" class="dataset-card"
              :class="{ 'is-active': entry.id === activeId }" @click="setActive(entry.id)"
>
              <div class="dataset-card-header">
                <el-icon class="dataset-card-icon">
                  <MapLocation />
                </el-icon>
                <span class="dataset-card-name">{{ entry.name }}</span>
                <el-icon class="dataset-card-delete" title="删除"
                  @click.stop="handleSourceDatasetRemove(entry.id, $event)"
>
                  <Delete />
                </el-icon>
              </div>
              <div class="dataset-card-meta">
                <el-tag size="small" type="info" effect="plain">{{ getDatasetCrs(entry.data) }}</el-tag>
                <span class="dataset-card-stat">{{ entry.data?.features?.length ?? 0 }} 要素</span>
                <el-tooltip v-if="entry.appendedFrom && entry.appendedFrom.length > 0"
                  :content="entry.appendedFrom.map(a => `从「${a.name}」追加了 ${a.count} 个要素`).join('；')" placement="top"
>
                  <el-tag size="small" type="warning" effect="dark">已追加</el-tag>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 主体内容 -->
    <div class="main-content" @dragover="handleDragOver" @drop="handleDrop">
      <!-- 空状态 -->
      <div v-if="datasets.length === 0" class="empty-state" role="button" tabindex="0"
        @click="importDialogVisible = true" @keydown.enter="importDialogVisible = true"
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
              <el-button text size="small" :title="panelCollapsed ? '展开' : '折叠'"
                @click="panelCollapsed = !panelCollapsed"
>
                <el-icon>
                  <Expand v-if="panelCollapsed" />
                  <Fold v-else />
                </el-icon>
              </el-button>
            </div>
            <div v-if="!panelCollapsed" class="panel-body">
              <gis-data-panel :data="activeDataset?.data" :instance-id="activeMapInstanceId" :map-ready="true"
                @active-data-change="handleActiveDataChange" @read="handleRead" @error="handleError"
                @enter-edit-mode="handleEnterEditMode" @exit-edit-mode="handleExitEditMode"
/>
            </div>
          </div>

          <!-- 拖拽手柄 -->
          <div v-if="!panelCollapsed" class="panel-resize-handle" :class="{ dragging: isResizing }"
            @mousedown="startResize"
/>

          <!-- 主内容区 -->
          <div class="content-area"
            :style="{ width: `calc(100% - ${currentPanelWidth}px - ${panelCollapsed ? 0 : 4}px)` }"
>
            <!-- 地图（多实例，每个数据集一个，v-show 切换） -->
            <div class="map-container">
              <gis-map-slot v-for="entry in datasets" :key="entry.id"
                :ref="(el: any) => { if (entry.id === activeId) activeMapSlotRef = el as InstanceType<typeof GisMapSlot> }"
                :dataset-id="entry.id" :data="getDatasetActiveData(entry.id, entry.data)"
                :visible="entry.id === activeId"
/>
            </div>
            <!-- 底部状态栏 -->
            <gis-data-overview :data="activeData" :transform-chain="activeTransformChain" mode="full" />
          </div>
        </div>

        <!-- 移动端：地图优先 + 底部状态栏 + 底部导航 -->
        <div v-else class="mobile-layout">
          <!-- 地图（全屏，多实例 v-show 切换） -->
          <div class="map-container mobile-map">
            <gis-map-slot v-for="entry in datasets" :key="entry.id"
              :ref="(el: any) => { if (entry.id === activeId) activeMapSlotRef = el as InstanceType<typeof GisMapSlot> }"
              :dataset-id="entry.id" :data="getDatasetActiveData(entry.id, entry.data)"
              :visible="entry.id === activeId"
/>
          </div>
          <!-- 底部简略状态栏 -->
          <gis-data-overview :data="activeData" :transform-chain="activeTransformChain" mode="compact" />
          <!-- 底部导航 -->
          <gis-mobile-nav :data="activeDataset?.data" :instance-id="activeMapInstanceId" :map-ready="true"
            @open-import="importDialogVisible = true" @active-data-change="handleActiveDataChange" @read="handleRead"
            @error="handleError" @enter-edit-mode="handleEnterEditMode" @exit-edit-mode="handleExitEditMode"
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

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-bar-contact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.2;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.top-bar-contact:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  opacity: 1;
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
  height: calc(100% - 16px);
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
  font-size: 12px;
  letter-spacing: 0.2px;
}

.gis-data-page.is-mobile .top-bar-right .el-button span {
  display: none;
}

/* 数据源抽屉按钮 */
.dataset-badge-btn {
  font-size: 12px;
}

/* 数据源抽屉 */
.source-drawer-body {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
}

/* 数据源分组 */
.source-group {
  margin-bottom: 12px;
}

.source-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.source-group-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.source-group-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-group-count {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-light);
  padding: 1px 6px;
  border-radius: 8px;
}

/* 数据集卡片 */
.dataset-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dataset-card {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--el-bg-color);
}

.dataset-card:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color-light);
}

.dataset-card.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.dataset-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.dataset-card-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.dataset-card-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.dataset-card.is-active .dataset-card-name {
  color: var(--el-color-primary);
}

.dataset-card-delete {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.dataset-card-delete:hover {
  color: var(--el-color-danger);
  opacity: 1;
}

.dataset-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dataset-card-stat {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
</style>
