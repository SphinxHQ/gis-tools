<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import proj4 from 'proj4'
import { computed, ref, watch, nextTick } from 'vue'

import { GisError, GisErrorCode, createUserMessage } from '~/common/GisError'
import { logger } from '~/common/logger'
import GisCrs from '~/components/data/GisCrs'
import GisDataInfo from '~/components/data/GisDataInfo'
import { CrsInfo } from '~/components/data/GisProjectedBounds'
import { CrsCategory } from '~/enums'
import { useGisDataStore, CrsVersionSnapshot } from '~/composables/gisDataStore'

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  }
})

const emit = defineEmits<{
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
}>()

const { addDataset, updateDataset, activeId, activeSourceId, datasets } = useGisDataStore()

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

const transformData = (data: GisDataInfo, toCrs: CrsInfo | undefined): boolean => {
  if (!toCrs) return false
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
    return true
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
    return false
  }
}

// === CRS 版本管理（转换路径 DAG） ===
interface CrsVersion {
  name: string
  label: string
  data: GisDataInfo
  crs?: CrsInfo
  sourceEpsg?: number
  /** 父版本名（构成转换路径树） */
  sourceVersionName?: string
  /** 关联的数据集 id（转换后自动创建）；origin 版本关联当前 activeId */
  datasetId?: string
  transformChain: number[]
}

const activeVersionName = ref('origin')
const crsVersions = ref<CrsVersion[]>([])
// 转换期间标志：防止 props.data 变化（因 addDataset/updateDataset 触发）重置转换路径
const isTransforming = ref(false)

/** 保存当前转换路径到当前活跃数据集 */
function saveVersionsToDataset() {
  const entry = activeId.value ? datasets.value.find(d => d.id === activeId.value) : undefined
  if (!entry) return
  entry.transformVersions = crsVersions.value.map(v => ({
    name: v.name,
    label: v.label,
    crsEpsg: v.crs?.epsgCode,
    sourceEpsg: v.sourceEpsg,
    sourceVersionName: v.sourceVersionName,
    datasetId: v.datasetId,
    transformChain: v.transformChain,
  }))
  entry.activeVersionName = activeVersionName.value
}

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

const reloadVersionsData = (): boolean => {
  let lastSuccess = true
  crsVersions.value.forEach((item, idx) => {
    if (idx > 0) {
      item.data = GisDataInfo.clone(originData.value)
      const success = transformData(item.data, item.crs)
      // 记录最后一个版本（新添加的）的转换结果
      if (idx === crsVersions.value.length - 1) {
        lastSuccess = success
      }
    }
  })
  return lastSuccess
}

// 监听 props.data 变化（转换期间跳过，防止 addDataset/updateDataset 触发重置）
// 切换数据集时：保存旧版本到旧数据集，从新数据集恢复
let lastActiveId: string | null = null
watch(() => props.data, (newData) => {
  if (isTransforming.value) return

  // 保存当前转换路径到旧数据集
  if (lastActiveId && crsVersions.value.length > 1) {
    const oldEntry = datasets.value.find(d => d.id === lastActiveId)
    if (oldEntry) {
      oldEntry.transformVersions = crsVersions.value.map(v => ({
        name: v.name,
        label: v.label,
        crsEpsg: v.crs?.epsgCode,
        sourceEpsg: v.sourceEpsg,
        sourceVersionName: v.sourceVersionName,
        datasetId: v.datasetId,
        transformChain: v.transformChain,
      }))
      oldEntry.activeVersionName = activeVersionName.value
    }
  }

  const data = newData as GisDataInfo
  originData.value = data
  const originEpsg = data?.crs?.epsgCode
  const currentId = activeId.value
  lastActiveId = currentId

  // 尝试从新数据集恢复转换路径
  const newEntry = currentId ? datasets.value.find(d => d.id === currentId) : undefined
  if (newEntry?.transformVersions && newEntry.transformVersions.length > 1) {
    // 恢复转换路径：重建 crsVersions（data 字段需要重新计算）
    crsVersions.value = newEntry.transformVersions.map(snap => ({
      name: snap.name,
      label: snap.label,
      data: new GisDataInfo(),
      crs: snap.crsEpsg ? new GisCrs(snap.crsEpsg).crsInfo : undefined,
      sourceEpsg: snap.sourceEpsg,
      sourceVersionName: snap.sourceVersionName,
      datasetId: snap.datasetId,
      transformChain: snap.transformChain,
    }))
    // origin 版本的 data 直接用当前数据
    crsVersions.value[0].data = data
    // 重新计算转换后版本的 data
    reloadVersionsData()
    activeVersionName.value = newEntry.activeVersionName || 'origin'
  } else {
    // 无保存的转换路径，重置为 origin
    crsVersions.value = [{
      name: 'origin',
      label: originDataCrsTitle.value,
      data: data,
      crs: undefined,
      sourceEpsg: undefined,
      sourceVersionName: undefined,
      datasetId: currentId ?? undefined,
      transformChain: originEpsg ? [originEpsg] : [],
    }]
    activeVersionName.value = 'origin'
  }
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
    sourceVersionName: sourceVer.name,
    transformChain: newChain,
  })
  activeVersionName.value = verName
  const success = reloadVersionsData()
  emitActiveDataChange()

  // 转换成功后自动创建新数据集并记入转换路径
  if (success) {
    const ver = crsVersions.value.find(t => t.name === verName)
    if (ver) {
      const sourceName = originData.value?.name || '未命名'
      const transformedClone = GisDataInfo.clone(ver.data)
      transformedClone.name = `${sourceName} → EPSG:${targetCrs.epsgCode}`
      // 标志位防止 addDataset 触发 props.data 变化重置转换路径
      isTransforming.value = true
      const newDatasetId = addDataset(transformedClone, activeSourceId.value ?? undefined)
      ver.datasetId = newDatasetId
      // 保存转换路径到当前数据集
      saveVersionsToDataset()
      // nextTick 后恢复，确保 watch 已跳过重置
      nextTick(() => { isTransforming.value = false })
    }
  }
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
  saveVersionsToDataset()
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
    saveVersionsToDataset()
    emitActiveDataChange()

    // 重设坐标系：直接更新当前数据集（标志位防止 updateDataset 触发重置）
    if (activeId.value) {
      const sourceName = originData.value?.name || '未命名'
      activeVersion.value.data.name = `${sourceName} (重设 EPSG:${crs.epsgCode})`
      isTransforming.value = true
      updateDataset(activeId.value, activeVersion.value.data)
      nextTick(() => { isTransforming.value = false })
    }
  }
}

// 当前 CRS 信息
const currentCrsInfo = computed(() => activeData.value?.crs?.crsInfo ?? null)
const hasValidCrs = computed(() => {
  const crs = activeData.value?.crs
  return crs && crs.epsgCode > 0 && crs.isValid
})

// === 转换路径图布局计算 ===
// 节点尺寸常量
const NODE_W = 220
const NODE_H = 48
const GAP_X = 20  // 同层节点水平间距
const GAP_Y = 40  // 层级垂直间距（含贝塞尔曲线空间）

interface PathNode {
  name: string
  label: string
  epsg: number
  x: number
  y: number
  isActive: boolean
  isAlive: boolean  // 数据集是否还存在
  datasetId?: string
}

interface PathEdge {
  from: PathNode
  to: PathNode
  // 贝塞尔曲线控制点
  d: string
}

// 检查版本关联的数据集是否还存在
const isVersionAlive = (ver: CrsVersion): boolean => {
  if (!ver.datasetId) return ver.name === 'origin' // origin 默认存活
  return datasets.value.some(d => d.id === ver.datasetId)
}

// 转换路径布局：竖向树形，根在上，子向下展开
const pathLayout = computed(() => {
  const versions = crsVersions.value
  if (versions.length <= 1) return { nodes: [] as PathNode[], edges: [] as PathEdge[], width: 0, height: 0 }

  // 构建父子关系
  const childrenMap = new Map<string, CrsVersion[]>()
  versions.forEach(ver => {
    const parent = ver.sourceVersionName ?? 'origin'
    if (!childrenMap.has(parent)) childrenMap.set(parent, [])
    if (ver.name !== 'origin') childrenMap.get(parent)!.push(ver)
  })

  // 计算每个节点的层级（depth），depth = 纵向偏移
  const depthMap = new Map<string, number>()
  depthMap.set('origin', 0)
  const queue = ['origin']
  while (queue.length) {
    const cur = queue.shift()!
    const children = childrenMap.get(cur) ?? []
    children.forEach(child => {
      depthMap.set(child.name, (depthMap.get(cur) ?? 0) + 1)
      queue.push(child.name)
    })
  }

  // 按层级分组
  const layerNodes = new Map<number, string[]>()
  depthMap.forEach((depth, name) => {
    if (!layerNodes.has(depth)) layerNodes.set(depth, [])
    layerNodes.get(depth)!.push(name)
  })

  // 计算每个节点的 x 坐标（同层内水平居中分布）
  const maxCount = Math.max(...Array.from(layerNodes.values()).map(arr => arr.length))
  const totalWidth = maxCount * (NODE_W + GAP_X) - GAP_X
  const xMap = new Map<string, number>()
  layerNodes.forEach((names: string[]) => {
    const count = names.length
    const layerWidth = count * (NODE_W + GAP_X) - GAP_X
    const startX = (totalWidth - layerWidth) / 2
    names.forEach((name: string, idx: number) => {
      xMap.set(name, startX + idx * (NODE_W + GAP_X))
    })
  })

  // 生成节点（y = depth * 间距，x = 同层居中）
  const nodes: PathNode[] = versions.map(ver => ({
    name: ver.name,
    label: ver.label,
    epsg: ver.data?.crs?.epsgCode ?? 0,
    x: xMap.get(ver.name) ?? 0,
    y: (depthMap.get(ver.name) ?? 0) * (NODE_H + GAP_Y),
    isActive: ver.name === activeVersionName.value,
    isAlive: isVersionAlive(ver),
    datasetId: ver.datasetId,
  }))

  // 生成连线（竖向贝塞尔曲线：从父底部中心到子顶部中心）
  const nodeMap = new Map(nodes.map(n => [n.name, n]))
  const edges: PathEdge[] = []
  versions.forEach(ver => {
    if (ver.sourceVersionName) {
      const from = nodeMap.get(ver.sourceVersionName)
      const to = nodeMap.get(ver.name)
      if (from && to) {
        // 父节点底部中心 → 子节点顶部中心
        const x1 = from.x + NODE_W / 2
        const y1 = from.y + NODE_H
        const x2 = to.x + NODE_W / 2
        const y2 = to.y
        const cy1 = y1 + (y2 - y1) / 2
        const cy2 = y1 + (y2 - y1) / 2
        edges.push({
          from,
          to,
          d: `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`,
        })
      }
    }
  })

  const maxDepth = Math.max(...depthMap.values())
  const width = totalWidth
  const height = (maxDepth + 1) * NODE_H + maxDepth * GAP_Y

  return { nodes, edges, width, height }
})

// 点击路径节点：切换活跃版本（仅存活节点可点击）
const handlePathNodeClick = (node: PathNode) => {
  if (!node.isAlive) return
  activeVersionName.value = node.name
}
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

    <!-- 转换路径图（SVG 贝塞尔曲线 + HTML 卡片） -->
    <div v-if="pathLayout.nodes.length > 0" class="transform-path">
      <div class="path-title">转换路径</div>
      <div class="path-canvas" :style="{ width: pathLayout.width + 'px', height: pathLayout.height + 'px' }">
        <!-- SVG 连线层 -->
        <svg class="path-edges" :width="pathLayout.width" :height="pathLayout.height">
          <path
            v-for="(edge, idx) in pathLayout.edges"
            :key="idx"
            :d="edge.d"
            class="path-edge"
            :class="{ 'is-dead': !edge.to.isAlive }"
            fill="none"
          />
        </svg>
        <!-- HTML 卡片层 -->
        <div
          v-for="node in pathLayout.nodes"
          :key="node.name"
          class="path-node"
          :class="{
            'is-active': node.isActive,
            'is-dead': !node.isAlive,
          }"
          :style="{ left: node.x + 'px', top: node.y + 'px', width: NODE_W + 'px', height: NODE_H + 'px' }"
          @click="handlePathNodeClick(node)"
        >
          <div class="path-node-label">{{ node.label }}</div>
          <div class="path-node-meta">
            <span v-if="node.isAlive" class="path-node-epsg">EPSG:{{ node.epsg }}</span>
            <span v-else class="path-node-dead">已失效</span>
          </div>
          <el-icon
            v-if="node.name !== 'origin' && node.isAlive"
            class="path-node-remove"
            @click.stop="handleVersionRemove(node.name)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
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

/* 转换路径图 */
.transform-path {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--el-fill-color-lighter);
}

.path-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

/* 画布容器：相对定位，承载 SVG 连线和 HTML 卡片 */
.path-canvas {
  position: relative;
  overflow: auto;
  margin: 0 auto;
}

/* SVG 连线层 */
.path-edges {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.path-edge {
  stroke: var(--el-color-primary-light-5);
  stroke-width: 2;
  transition: stroke 0.2s;
}

.path-edge.is-dead {
  stroke: var(--el-text-color-placeholder);
  stroke-dasharray: 4 3;
  opacity: 0.5;
}

/* HTML 卡片层 */
.path-node {
  position: absolute;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  z-index: 2;
}

.path-node:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.path-node.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

/* 失效节点：灰显不可操作 */
.path-node.is-dead {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--el-fill-color);
  border-style: dashed;
}

.path-node.is-dead:hover {
  border-color: var(--el-border-color);
  box-shadow: none;
}

.path-node-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-node.is-active .path-node-label {
  color: var(--el-color-primary);
}

.path-node-meta {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.path-node-epsg {
  color: var(--el-color-primary);
  font-weight: 500;
}

.path-node-dead {
  color: var(--el-color-danger);
}

.path-node-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  font-size: 12px;
  transition: color 0.2s;
}

.path-node-remove:hover {
  color: var(--el-color-danger);
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
