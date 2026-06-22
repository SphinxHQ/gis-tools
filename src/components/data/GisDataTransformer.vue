<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import proj4 from 'proj4'
import { computed, ref, watch } from 'vue'

import { GisError, GisErrorCode, createUserMessage } from '~/common/GisError'
import { logger } from '~/common/logger'
import GisCrs from '~/components/data/GisCrs'
import GisDataInfo from '~/components/data/GisDataInfo'
import { CrsInfo } from '~/components/data/GisProjectedBounds'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const originData = ref<GisDataInfo>(new GisDataInfo())

// === 坐标转换核心 ===
const transformGeometry = (geoObj: unknown, fromCrs: CrsInfo, toCrs: CrsInfo) => {
  if (!fromCrs || !toCrs) return
  const arr = geoObj as unknown[]
  if (Array.isArray(arr)) {
    if ((arr.length === 2 || arr.length === 3) && arr.every(p => typeof p === 'number')) {
      const newPt = proj4(
        proj4.defs(`EPSG:${fromCrs.epsgCode}`),
        proj4.defs(`EPSG:${toCrs.epsgCode}`),
        arr as number[]
      )
      if (newPt[0] === Infinity || newPt[1] === Infinity) {
        throw new GisError(GisErrorCode.COORDINATE_TRANSFORM_FAILED)
      }
      arr[0] = newPt[0]
      arr[1] = newPt[1]
    } else {
      arr.forEach(g => transformGeometry(g, fromCrs, toCrs))
    }
  } else {
    const obj = geoObj as { coordinates?: unknown }
    if (obj?.coordinates) {
      transformGeometry(obj.coordinates, fromCrs, toCrs)
    }
  }
}

const transformData = (data: GisDataInfo, toCrs: CrsInfo | undefined) => {
  if (!toCrs) return
  try {
    const fromCrs = data.crs?.crsInfo
    if (fromCrs && fromCrs.epsgCode !== toCrs.epsgCode) {
      data.features.forEach((feature: { geometry: unknown }) => {
        transformGeometry(feature.geometry, fromCrs, toCrs)
      })
      data.crs = new GisCrs(toCrs.epsgCode)
      // 同步更新 descriptions 中的坐标系相关字段
      if (data.descriptions) {
        const simpleName = toCrs.name?.split('/')[0].trim() || '';
        let crsLabel = '';
        if (simpleName.includes('2000')) crsLabel = '2000国家大地坐标系';
        else if (simpleName.includes('54')) crsLabel = '54北京坐标系';
        else if (simpleName.includes('80')) crsLabel = '西安80坐标系';
        data.descriptions['坐标系'] = crsLabel
        data.descriptions['几度分带'] = (toCrs.zoneDegree ?? 0) > 0 ? toCrs.zoneDegree : ''
        data.descriptions['投影类型'] = toCrs.projected ? '高斯克吕格' : ''
        data.descriptions['计量单位'] = toCrs.projected ? '米' : '度'
        data.descriptions['带号'] = (toCrs.zoneNumber ?? 0) > 0 ? String(toCrs.zoneNumber) : ''
      }
    }
  } catch (e) {
    let msg = createUserMessage(e)
    if (e instanceof GisError) {
      const codeLabel: Record<string, string> = {
        [GisErrorCode.COORDINATE_TRANSFORM_FAILED]: '坐标转换失败',
        [GisErrorCode.CRS_NOT_FOUND]: '坐标系未找到',
      }
      const label = codeLabel[e.code] || e.code
      msg = `[${label}]\n\n${msg}\n\n目标坐标系: EPSG:${toCrs.epsgCode}`
    }
    logger.error('坐标转换失败:', e)
    ElMessageBox.alert(msg, '坐标转换失败', {
      confirmButtonText: '确定',
      type: 'error',
      dangerouslyUseHTMLString: false,
      callback: () => {
        const failTab = editableTabs.value.find(t => t.crs?.epsgCode === toCrs.epsgCode && t.name !== 'origin')
        if (failTab) removeTab(failTab.name)
      }
    })
  }
}

// === Tab 管理 ===
interface TabEntry {
  name: string
  label: string
  data: GisDataInfo
  crs?: CrsInfo
  sourceEpsg?: number
  transformChain: number[] // 转换链：[originEpsg, step1Epsg, ..., currentEpsg]
}

const editableTabsValue = ref('origin')
const editableTabs = ref<TabEntry[]>([])

const originDataCrsTitle = computed(() => {
  const crs = originData.value?.crs
  if (!crs || crs.epsgCode <= 0) return `${originData.value?.name || '数据'}（无）`
  const family = GisCrs.familyName(crs.crsInfo)
  return `${family} EPSG:${crs.epsgCode}`
})

// 获取当前活跃Tab
const activeTab = computed(() =>
  editableTabs.value.find(t => t.name === editableTabsValue.value)
)

// 当前Tab的CRS信息（用于弹窗源CRS）
const activeTabCrsInfo = computed(() => {
  return activeTab.value?.data?.crs?.crsInfo ?? null
})

// 已存在的 EPSG 代码（用于转换选择器禁用已选）
const existingEpsgCodes = computed(() =>
  editableTabs.value.map(t => t.data?.crs?.epsgCode).filter((c): c is number => !!c)
)

// 根据 EPSG 代码查找对应 Tab
const findTabByEpsg = (epsgCode: number): TabEntry | undefined =>
  editableTabs.value.find(t => t.data?.crs?.epsgCode === epsgCode)

// 跳转到转换链中某一步对应的Tab
const navigateToChainStep = (epsgCode: number) => {
  const tab = findTabByEpsg(epsgCode)
  if (tab) editableTabsValue.value = tab.name
}

const reloadTabsData = () => {
  editableTabs.value.forEach((item, idx) => {
    if (idx > 0) {
      item.data = GisDataInfo.clone(originData.value)
      transformData(item.data, item.crs)
    }
  })
}

// 监听 props.data 变化
watch(() => props.data, (newData) => {
  const data = newData as GisDataInfo
  originData.value = data
  const originEpsg = data?.crs?.epsgCode
  editableTabs.value = [{
    name: 'origin',
    label: originDataCrsTitle.value,
    data: data,
    crs: undefined,
    sourceEpsg: undefined,
    transformChain: originEpsg ? [originEpsg] : [],
  }]
  editableTabsValue.value = 'origin'
}, { deep: true, immediate: true })

// 更新原始 Tab 标签
watch(originDataCrsTitle, (title) => {
  if (editableTabs.value.length > 0) {
    editableTabs.value[0].label = title
  }
})

const addTransformTab = (targetCrs: CrsInfo, sourceTab: TabEntry) => {
  const family = GisCrs.familyName(targetCrs)
  const label = `${family} EPSG:${targetCrs.epsgCode}`

  const tabName = `crs_${targetCrs.epsgCode}_${Date.now()}`
  const newChain = [...sourceTab.transformChain, targetCrs.epsgCode]

  editableTabs.value.push({
    name: tabName,
    label,
    data: new GisDataInfo(),
    crs: targetCrs,
    sourceEpsg: sourceTab.data?.crs?.epsgCode,
    transformChain: newChain,
  })
  editableTabsValue.value = tabName
  reloadTabsData()
}

const removeTab = (tabName: string) => {
  const tabs = editableTabs.value
  let activeName = editableTabsValue.value
  if (activeName === tabName) {
    const idx = tabs.findIndex(t => t.name === tabName)
    const next = tabs[idx + 1] || tabs[idx - 1]
    if (next) activeName = next.name
  }
  editableTabsValue.value = activeName
  editableTabs.value = tabs.filter(t => t.name !== tabName)
}

const handleTabRemove = (name: string | number) => {
  if (name === 'origin') return
  removeTab(String(name))
}

// === 弹窗状态 ===
const transformDialogVisible = ref(false)
const resetCrsDialogVisible = ref(false)

const handleTransformSelect = (crs: CrsInfo) => {
  transformDialogVisible.value = false
  if (activeTab.value) {
    addTransformTab(crs, activeTab.value)
  }
}

const handleResetCrs = (crs: CrsInfo) => {
  resetCrsDialogVisible.value = false
  // 重设的是当前Tab的CRS
  if (activeTab.value) {
    activeTab.value.data.crs = new GisCrs(crs.epsgCode)
    // 同步更新 descriptions 中的坐标系相关字段
    if (activeTab.value.data.descriptions) {
      const simpleName = crs.name?.split('/')[0].trim() || '';
      let crsLabel = '';
      if (simpleName.includes('2000')) crsLabel = '2000国家大地坐标系';
      else if (simpleName.includes('54')) crsLabel = '54北京坐标系';
      else if (simpleName.includes('80')) crsLabel = '西安80坐标系';
      activeTab.value.data.descriptions['坐标系'] = crsLabel
      activeTab.value.data.descriptions['几度分带'] = (crs.zoneDegree ?? 0) > 0 ? crs.zoneDegree : ''
      activeTab.value.data.descriptions['投影类型'] = crs.projected ? '高斯克吕格' : ''
      activeTab.value.data.descriptions['计量单位'] = crs.projected ? '米' : '度'
      activeTab.value.data.descriptions['带号'] = (crs.zoneNumber ?? 0) > 0 ? String(crs.zoneNumber) : ''
    }
    // 如果是原始Tab，同步到 originData 并清除所有转换Tab
    if (activeTab.value.name === 'origin') {
      originData.value.crs = new GisCrs(crs.epsgCode)
      editableTabs.value = [editableTabs.value[0]]
      editableTabsValue.value = 'origin'
    }
  }
}
</script>

<template>
  <div class="gis-data-transformer-container">
    <!-- 坐标转换弹窗 -->
    <el-dialog v-model="transformDialogVisible" title="坐标转换" width="700">
      <gis-crs-transform-selector
        v-if="transformDialogVisible"
        :source-crs="activeTabCrsInfo"
        :existing-epsg-codes="existingEpsgCodes"
        @select="handleTransformSelect"
        @cancel="transformDialogVisible = false"
      />
    </el-dialog>

    <!-- 重设坐标系弹窗 -->
    <el-dialog v-model="resetCrsDialogVisible" title="重设坐标系" width="800">
      <gis-crs-selector
        v-if="resetCrsDialogVisible"
        @change="handleResetCrs"
      />
    </el-dialog>

    <el-tabs
      v-model="editableTabsValue"
      type="card"
      class="transformer-tabs"
      @tab-remove="handleTabRemove"
    >
      <el-tab-pane
        v-for="item in editableTabs"
        :key="item.name"
        :label="item.label"
        :name="item.name"
        :closable="item.name !== 'origin'"
      >
        <gis-data-viewer
          :data="item.data"
          :transform-chain="item.transformChain"
          @transform-crs="transformDialogVisible = true"
          @reset-crs="resetCrsDialogVisible = true"
          @navigate-chain="navigateToChainStep"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-data-transformer-container {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.transformer-tabs {
  height: 100%;
}

.transformer-tabs :deep(.el-tabs__content) {
  padding: 5px;
  box-sizing: border-box;
}
</style>

<style>
.gis-data-transformer-container .transformer-tabs,
.gis-data-transformer-container .transformer-tabs .el-tabs__content,
.gis-data-transformer-container .transformer-tabs .el-tabs--border-card {
  border: none;
}

.gis-data-transformer-container .transformer-tabs .el-tabs__content .el-tab-pane {
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: 0;
}
</style>
