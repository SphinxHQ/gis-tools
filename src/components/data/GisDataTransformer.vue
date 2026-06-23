<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import proj4 from 'proj4'
import { computed, ref, watch } from 'vue'

import { GisError, GisErrorCode, createUserMessage } from '~/common/GisError'
import { logger } from '~/common/logger'
import GisCrs from '~/components/data/GisCrs'
import GisDataInfo from '~/components/data/GisDataInfo'
import { CrsInfo } from '~/components/data/GisProjectedBounds'
import { CrsCategory } from '~/enums'
import { useGisDataStore } from '~/composables/gisDataStore'

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  }
})

const emit = defineEmits<{
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
}>()

const { addDataset, updateDataset, activeId, activeSourceId } = useGisDataStore()

// 变更操作后提示：更新当前数据集 or 另存为新数据集（同源）
const promptUpdateOrSaveAs = async (transformedData: GisDataInfo) => {
  try {
    await ElMessageBox.confirm(
      '变更完成。请选择：更新当前数据集，或另存为新数据集（同一数据源下）。',
      '变更确认',
      {
        confirmButtonText: '另存为新数据集',
        cancelButtonText: '更新当前数据',
        distinguishCancelAndClose: true,
        type: 'info',
      }
    )
    // 用户点击"另存为新数据集"
    addDataset(transformedData, activeSourceId.value ?? undefined)
  } catch (action: unknown) {
    if (action === 'cancel') {
      // 用户点击"更新当前数据"
      if (activeId.value) {
        updateDataset(activeId.value, transformedData)
      }
    }
    // action === 'close' 则什么都不做（用户关闭弹窗）
  }
}

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
      if (data.descriptions) {
        const simpleName = toCrs.name?.split('/')[0].trim() || '';
        let crsLabel = '';
        if (simpleName.includes('2000')) crsLabel = '2000国家大地坐标系';
        else if (simpleName.includes('54')) crsLabel = '54北京坐标系';
        else if (simpleName.includes('80')) crsLabel = '西安80坐标系';
        data.descriptions['坐标系'] = crsLabel
        data.descriptions['几度分带'] = (toCrs.zoneDegree ?? 0) > 0 ? toCrs.zoneDegree : ''
        data.descriptions['投影类型'] = CrsCategory.fromProjected(toCrs.projected) === CrsCategory.Projected ? '高斯克吕格' : ''
        data.descriptions['计量单位'] = CrsCategory.fromProjected(toCrs.projected) === CrsCategory.Projected ? '米' : '度'
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
        const failItem = crsVersions.value.find(t => t.crs?.epsgCode === toCrs.epsgCode && t.name !== 'origin')
        if (failItem) removeVersion(failItem.name)
      }
    })
  }
}

// === CRS 版本管理（替代原 tabs） ===
interface CrsVersion {
  name: string
  label: string
  data: GisDataInfo
  crs?: CrsInfo
  sourceEpsg?: number
  transformChain: number[]
}

const activeVersionName = ref('origin')
const crsVersions = ref<CrsVersion[]>([])

const originDataCrsTitle = computed(() => {
  const crs = originData.value?.crs
  if (!crs || crs.epsgCode <= 0) return `${originData.value?.name || '数据'}（无）`
  const family = GisCrs.familyName(crs.crsInfo)
  return `${family} EPSG:${crs.epsgCode}`
})

const activeVersion = computed(() =>
  crsVersions.value.find(t => t.name === activeVersionName.value)
)

const activeData = computed(() => activeVersion.value?.data ?? originData.value)

const activeTransformChain = computed(() => activeVersion.value?.transformChain ?? [])

const activeTabCrsInfo = computed(() => {
  return activeVersion.value?.data?.crs?.crsInfo ?? null
})

const existingEpsgCodes = computed(() =>
  crsVersions.value.map(t => t.data?.crs?.epsgCode).filter((c): c is number => !!c)
)

const findVersionByEpsg = (epsgCode: number): CrsVersion | undefined =>
  crsVersions.value.find(t => t.data?.crs?.epsgCode === epsgCode)

// 活跃数据变化时通知父组件（必须在 watch 之前定义，避免 TDZ）
const emitActiveDataChange = () => {
  emit('active-data-change', activeData.value, activeTransformChain.value)
}

const navigateToChainStep = (epsgCode: number) => {
  const ver = findVersionByEpsg(epsgCode)
  if (ver) activeVersionName.value = ver.name
}

const reloadVersionsData = () => {
  crsVersions.value.forEach((item, idx) => {
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
  crsVersions.value = [{
    name: 'origin',
    label: originDataCrsTitle.value,
    data: data,
    crs: undefined,
    sourceEpsg: undefined,
    transformChain: originEpsg ? [originEpsg] : [],
  }]
  activeVersionName.value = 'origin'
  emitActiveDataChange()
}, { deep: true, immediate: true })

// 更新原始版本标签
watch(originDataCrsTitle, (title) => {
  if (crsVersions.value.length > 0) {
    crsVersions.value[0].label = title
  }
})

watch(activeVersionName, () => {
  emitActiveDataChange()
})

const addTransformVersion = (targetCrs: CrsInfo, sourceVer: CrsVersion) => {
  const family = GisCrs.familyName(targetCrs)
  const label = `${family} EPSG:${targetCrs.epsgCode}`

  const verName = `crs_${targetCrs.epsgCode}_${Date.now()}`
  const newChain = [...sourceVer.transformChain, targetCrs.epsgCode]

  crsVersions.value.push({
    name: verName,
    label,
    data: new GisDataInfo(),
    crs: targetCrs,
    sourceEpsg: sourceVer.data?.crs?.epsgCode,
    transformChain: newChain,
  })
  activeVersionName.value = verName
  reloadVersionsData()
  emitActiveDataChange()

  // 变更操作后提示：更新当前 or 另存为新数据集（同源）
  const sourceName = originData.value?.name || '未命名'
  const transformedClone = GisDataInfo.clone(activeVersion.value.data)
  transformedClone.name = `${sourceName} → EPSG:${targetCrs.epsgCode}`
  promptUpdateOrSaveAs(transformedClone)
}

const removeVersion = (verName: string) => {
  const versions = crsVersions.value
  let activeName = activeVersionName.value
  if (activeName === verName) {
    const idx = versions.findIndex(t => t.name === verName)
    const next = versions[idx + 1] || versions[idx - 1]
    if (next) activeName = next.name
  }
  activeVersionName.value = activeName
  crsVersions.value = versions.filter(t => t.name !== verName)
  emitActiveDataChange()
}

const handleVersionRemove = (name: string | number) => {
  if (name === 'origin') return
  removeVersion(String(name))
}

// === 弹窗状态 ===
const transformDialogVisible = ref(false)
const resetCrsDialogVisible = ref(false)

const handleTransformSelect = (crs: CrsInfo) => {
  transformDialogVisible.value = false
  if (activeVersion.value) {
    addTransformVersion(crs, activeVersion.value)
  }
}

const handleResetCrs = (crs: CrsInfo) => {
  resetCrsDialogVisible.value = false
  if (activeVersion.value) {
    activeVersion.value.data.crs = new GisCrs(crs.epsgCode)
    if (activeVersion.value.data.descriptions) {
      const simpleName = crs.name?.split('/')[0].trim() || '';
      let crsLabel = '';
      if (simpleName.includes('2000')) crsLabel = '2000国家大地坐标系';
      else if (simpleName.includes('54')) crsLabel = '54北京坐标系';
      else if (simpleName.includes('80')) crsLabel = '西安80坐标系';
      activeVersion.value.data.descriptions['坐标系'] = crsLabel
      activeVersion.value.data.descriptions['几度分带'] = (crs.zoneDegree ?? 0) > 0 ? crs.zoneDegree : ''
      activeVersion.value.data.descriptions['投影类型'] = CrsCategory.fromProjected(crs.projected) === CrsCategory.Projected ? '高斯克吕格' : ''
      activeVersion.value.data.descriptions['计量单位'] = CrsCategory.fromProjected(crs.projected) === CrsCategory.Projected ? '米' : '度'
      activeVersion.value.data.descriptions['带号'] = (crs.zoneNumber ?? 0) > 0 ? String(crs.zoneNumber) : ''
    }
    if (activeVersion.value.name === 'origin') {
      originData.value.crs = new GisCrs(crs.epsgCode)
      crsVersions.value = [crsVersions.value[0]]
      activeVersionName.value = 'origin'
    }
    emitActiveDataChange()

    // 变更操作后提示：更新当前 or 另存为新数据集（同源）
    const sourceName = originData.value?.name || '未命名'
    const resetClone = GisDataInfo.clone(activeVersion.value.data)
    resetClone.name = `${sourceName} (重设 EPSG:${crs.epsgCode})`
    promptUpdateOrSaveAs(resetClone)
  }
}

// 当前 CRS 信息
const currentCrsInfo = computed(() => activeData.value?.crs?.crsInfo ?? null)
const hasValidCrs = computed(() => {
  const crs = activeData.value?.crs
  return crs && crs.epsgCode > 0 && crs.isValid
})
</script>

<template>
  <div class="gis-data-transformer-panel">
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

    <!-- 当前 CRS 信息卡片 -->
    <div class="crs-info-card">
      <div class="crs-info-header">
        <span class="crs-info-title">当前坐标系</span>
        <el-tag v-if="hasValidCrs" size="small" type="info" effect="plain">
          EPSG:{{ activeData?.crs?.epsgCode }}
        </el-tag>
        <el-tag v-else size="small" type="warning" effect="plain">未设置</el-tag>
      </div>
      <div v-if="currentCrsInfo" class="crs-info-body">
        <div class="crs-info-row">
          <span class="crs-info-label">名称</span>
          <span class="crs-info-value">{{ currentCrsInfo.name || '-' }}</span>
        </div>
        <div class="crs-info-row">
          <span class="crs-info-label">类型</span>
          <span class="crs-info-value">
            {{ CrsCategory.fromProjected(currentCrsInfo.projected) === CrsCategory.Projected ? '投影坐标系' : '地理坐标系' }}
          </span>
        </div>
        <div v-if="currentCrsInfo.centralMeridian" class="crs-info-row">
          <span class="crs-info-label">中央经线</span>
          <span class="crs-info-value">{{ currentCrsInfo.centralMeridian }}°</span>
        </div>
        <div v-if="currentCrsInfo.zoneNumber" class="crs-info-row">
          <span class="crs-info-label">带号</span>
          <span class="crs-info-value">{{ currentCrsInfo.zoneNumber }}</span>
        </div>
      </div>
      <div v-else class="crs-info-empty">
        <span>当前数据未设置坐标系</span>
      </div>
    </div>

    <!-- 转换链面包屑 -->
    <div v-if="activeTransformChain.length > 1" class="transform-chain">
      <div class="chain-title">转换历程</div>
      <div class="chain-breadcrumb">
        <template v-for="(epsg, idx) in activeTransformChain" :key="epsg">
          <span
            class="chain-node"
            :class="{ 'is-current': idx === activeTransformChain.length - 1 }"
            @click="idx < activeTransformChain.length - 1 && navigateToChainStep(epsg)"
          >
            EPSG:{{ epsg }}
          </span>
          <span v-if="idx < activeTransformChain.length - 1" class="chain-arrow">→</span>
        </template>
      </div>
    </div>

    <!-- CRS 版本切换 -->
    <div v-if="crsVersions.length > 1" class="crs-versions">
      <div class="versions-title">坐标系版本</div>
      <el-select
        v-model="activeVersionName"
        size="small"
        class="version-select"
        placeholder="选择坐标系版本"
      >
        <el-option
          v-for="ver in crsVersions"
          :key="ver.name"
          :label="ver.label"
          :value="ver.name"
        >
          <span style="float: left">{{ ver.label }}</span>
          <el-icon
            v-if="ver.name !== 'origin'"
            class="version-remove-icon"
            @click.stop="handleVersionRemove(ver.name)"
          >
            <Close />
          </el-icon>
        </el-option>
      </el-select>
    </div>

    <!-- 操作按钮 -->
    <div class="crs-actions">
      <el-button size="small" type="primary" :disabled="!hasValidCrs" @click="transformDialogVisible = true">
        <el-icon><Refresh /></el-icon>
        <span>坐标转换</span>
      </el-button>
      <el-button size="small" @click="resetCrsDialogVisible = true">
        <el-icon><Edit /></el-icon>
        <span>重设坐标系</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.gis-data-transformer-panel {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  box-sizing: border-box;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.crs-info-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
}

.crs-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.crs-info-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.crs-info-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crs-info-row {
  display: flex;
  align-items: center;
  font-size: 12px;
  line-height: 1.6;
}

.crs-info-label {
  width: 64px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.crs-info-value {
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.crs-info-empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  padding: 8px 0;
}

.transform-chain {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--el-fill-color-lighter);
}

.chain-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.chain-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
}

.chain-node {
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-color-primary);
  transition: background 0.2s;
}

.chain-node:hover {
  background: var(--el-color-primary-light-9);
}

.chain-node.is-current {
  background: var(--el-color-primary);
  color: #fff;
  cursor: default;
}

.chain-node.is-current:hover {
  background: var(--el-color-primary);
}

.chain-arrow {
  color: var(--el-text-color-placeholder);
}

.crs-versions {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--el-fill-color-lighter);
}

.versions-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.version-select {
  width: 100%;
}

.version-remove-icon {
  float: right;
  color: var(--el-color-danger);
  cursor: pointer;
}

.version-remove-icon:hover {
  color: var(--el-color-danger-light-3);
}

.crs-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.crs-actions .el-button {
  flex: 1;
}

.crs-actions .el-button span {
  margin-left: 4px;
}
</style>
