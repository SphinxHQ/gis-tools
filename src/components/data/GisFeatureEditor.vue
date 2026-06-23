<script setup lang="ts">
/**
 * 要素编辑器
 * 进入时创建完整数据副本(workingFeatures)，所有操作在副本上进行
 * 页面1 - 要素列表：定位+编辑 / 要素级操作（分割、合并）
 * 页面2 - 编辑面板：上方节点编辑 + 下方属性编辑(4行滚动)
 * 底部按钮：更新(写回原数据) / 另存(生成新档案) / 取消/重置(丢弃副本)
 * 双向同步：地图 Modify 拖拽 ↔ 节点列表
 */
import * as turf from '@turf/turf'
import {
  Edit, Crop, Grid, Delete, Rank,
  RefreshRight, RefreshLeft, Position as IconPosition,
  CopyDocument, Scissor, Operation, Back
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Feature as GeoFeature } from 'geojson'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import Common from '~/common/Common'
import GeomUtils from '~/common/GeomUtils'
import { logger } from '~/common/logger'
import GisDataInfo from '~/components/data/GisDataInfo'
import GeoTypeIconRender from '~/components/renders/GeoTypeIconRender.vue'
import {
  GisMapStartModifyEvent, GisMapStopModifyEvent,
  GisMapUpdateEditFeatureEvent, GisMapflashFeaturesEvent,
  GisMapAddFeaturesEvent
} from '~/components/gismap/events/GisMapEvents'
import { eventBus } from '~/composables/eventBus'

const props = defineProps<{
  data: GisDataInfo
  instanceId: number
}>()

const emit = defineEmits<{
  (e: 'exit'): void
  (e: 'data-changed'): void
  (e: 'create-archive', payload: { name: string; features: GeoJSON.Feature[]; sourceIdx: number }): void
  (e: 'show-shadow'): void
  (e: 'clear-shadow'): void
}>()

// ==================== 导航状态 ====================
type Page = 'feature-list' | 'feature-edit'
const currentPage = ref<Page>('feature-list')
const isEditorActive = ref(false)  // 编辑器是否激活（在要素列表tab时为true）

// ==================== 双份数据：对照(只读) + 可编辑 ====================
const referenceFeatures = ref<GeoJSON.Feature[]>([])  // 对照复制体，始终只读
const workingFeatures = ref<GeoJSON.Feature[]>([])     // 可编辑复制体

/**
 * 是否存在未提交到主数据的编辑
 * 比较 workingFeatures 和 referenceFeatures 的 JSON 序列化
 */
const hasEdits = computed(() => {
  if (workingFeatures.value.length !== referenceFeatures.value.length) return true
  return JSON.stringify(workingFeatures.value) !== JSON.stringify(referenceFeatures.value)
})

/** 初始化双份复制（无已编辑数据时调用） */
function initBothCopies() {
  const copy = JSON.parse(JSON.stringify(props.data.features || []))
  referenceFeatures.value = copy
  workingFeatures.value = JSON.parse(JSON.stringify(copy))
  if (isEditorActive.value) renderEditAndShadowLayers()
}

/** 初始化对照复制体（有已编辑数据时调用，保留workingFeatures） */
function initReferenceOnly() {
  referenceFeatures.value = JSON.parse(JSON.stringify(props.data.features || []))
  if (isEditorActive.value) renderEditAndShadowLayers()
}

// ==================== 编辑状态 ====================
const editingFeatureIdx = ref<number | null>(null)
const referenceFeature = ref<GeoJSON.Feature | null>(null)
const editingFeature = ref<GeoJSON.Feature | null>(null)

// ==================== 撤销/重做 ====================
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

function pushHistory() {
  if (!editingFeature.value) return
  undoStack.value.push(JSON.stringify(editingFeature.value))
  redoStack.value = []
}

// ==================== 节点列表 ====================
interface VertexItem {
  index: number; ringIdx: number; coordIdx: number; coordinates: number[]; id: string
}
const vertices = ref<VertexItem[]>([])
const hoveredVertexIdx = ref<number | null>(null)
// 手风琴当前展开项：'vertex' 节点编辑 | 'props' 属性编辑
const activeEditSection = ref<'vertex' | 'props'>('vertex')

function extractVertices(feature: GeoJSON.Feature): VertexItem[] {
  const result: VertexItem[] = []
  if (!feature.geometry) return result
  const geo = feature.geometry
  let gi = 0
  const pushV = (c: number[], ri: number, ci: number) => { result.push({ index: gi++, ringIdx: ri, coordIdx: ci, coordinates: [...c], id: Common.uuid() }) }
  if (geo.type === 'Point') { pushV(geo.coordinates as number[], 0, 0) }
  else if (geo.type === 'MultiPoint') { (geo.coordinates as number[][]).forEach((c, ci) => pushV(c, 0, ci)) }
  else if (geo.type === 'LineString') { (geo.coordinates as number[][]).forEach((c, ci) => pushV(c, 0, ci)) }
  else if (geo.type === 'MultiLineString') { (geo.coordinates as number[][][]).forEach((line, ri) => line.forEach((c, ci) => pushV(c, ri, ci))) }
  else if (geo.type === 'Polygon') { (geo.coordinates as number[][][]).forEach((ring, ri) => ring.slice(0, -1).forEach((c, ci) => pushV(c, ri, ci))) }
  else if (geo.type === 'MultiPolygon') { (geo.coordinates as number[][][][]).forEach((polygon, pi) => polygon.forEach((ring, ri) => ring.slice(0, -1).forEach((c, ci) => pushV(c, pi * 100 + ri, ci)))) }
  return result
}

// ==================== 属性编辑 ====================
const editingProps = ref<Record<string, unknown>>({})
function loadProperties(f: GeoJSON.Feature) { editingProps.value = { ...(f.properties || {}) } }
function applyPropertiesToFeature() { if (editingFeature.value) editingFeature.value.properties = { ...editingProps.value } }

// ==================== 要素列表（基于副本） ====================
const featureList = computed(() =>
  workingFeatures.value.map((f, idx) => ({
    idx, type: f.geometry?.type ?? '未知',
    label: f.properties?.name ?? f.properties?.NAME ?? `要素 #${idx}`,
    selected: selectedFeatureIdxs.value.has(idx),
  }))
)

const selectedFeatureIdxs = ref<Set<number>>(new Set())
const splitTargetIdx = ref<number | null>(null)

function toggleFeatureSelect(idx: number) {
  if (selectedFeatureIdxs.value.has(idx)) selectedFeatureIdxs.value.delete(idx)
  else selectedFeatureIdxs.value.add(idx)
  selectedFeatureIdxs.value = new Set(selectedFeatureIdxs.value)
}

/** 点击要素行：高亮+闪烁定位 */
function clickFeatureRow(idx: number) {
  if (!props.instanceId) return
  const f = workingFeatures.value[idx]
  if (!f?.geometry) return
  eventBus.emit(`${props.instanceId}`, new GisMapflashFeaturesEvent([f]))
}

/** 点击编辑按钮：进入节点编辑 */
function selectFeature(idx: number) {
  if (editingFeatureIdx.value === idx) return
  // 先停止旧的Modify交互
  stopModifyInList()
  editingFeatureIdx.value = idx
  const feat = workingFeatures.value[idx]
  referenceFeature.value = JSON.parse(JSON.stringify(feat))
  editingFeature.value = JSON.parse(JSON.stringify(feat))
  undoStack.value = []; redoStack.value = []
  vertices.value = extractVertices(editingFeature.value)
  loadProperties(editingFeature.value)
  currentPage.value = 'feature-edit'
  // 先将编辑要素单独渲染到EDIT层（替换所有workingFeatures），然后启动Modify
  syncToMap()
  startModifyOnMap()
}

function backToFeatureList() {
  // 将编辑结果写回副本
  if (editingFeature.value && editingFeatureIdx.value !== null) {
    applyPropertiesToFeature()
    workingFeatures.value[editingFeatureIdx.value] = JSON.parse(JSON.stringify(editingFeature.value))
  }
  // 在要素列表激活状态下，stopModify 不清空图层
  stopModifyInList()
  editingFeatureIdx.value = null; editingFeature.value = null; referenceFeature.value = null
  vertices.value = []; editingProps.value = {}; undoStack.value = []; redoStack.value = []
  currentPage.value = 'feature-list'
  // 重新渲染要素列表视图：编辑层+影子层
  renderEditAndShadowLayers()
}

/** 从编辑页退出（保存/取消） */
function exitFromEditPage(save: boolean) {
  if (save && editingFeature.value && editingFeatureIdx.value !== null) {
    applyPropertiesToFeature()
    workingFeatures.value[editingFeatureIdx.value] = JSON.parse(JSON.stringify(editingFeature.value))
  }
  stopModifyInList()
  editingFeatureIdx.value = null; editingFeature.value = null; referenceFeature.value = null
  vertices.value = []; editingProps.value = {}; undoStack.value = []; redoStack.value = []
  currentPage.value = 'feature-list'
  // 重新渲染要素列表视图：编辑层+影子层
  renderEditAndShadowLayers()
}

// ==================== 地图编辑交互 ====================
/** 在要素列表激活状态下启动Modify：图层已就绪，只启动交互 + 设置参考图层 */
function startModifyOnMap() {
  if (!editingFeature.value || !props.instanceId) return
  // skipLayerSetup: 图层已由 renderEditAndShadowLayers 设置好，不需要重新设置
  eventBus.emit(`${props.instanceId}`, new GisMapStartModifyEvent(editingFeature.value, { originalFeature: referenceFeature.value, skipLayerSetup: true }))
}
/** 在要素列表激活状态下停止Modify：只移除交互，不清空图层 */
function stopModifyInList() {
  if (props.instanceId) eventBus.emit(`${props.instanceId}`, new GisMapStopModifyEvent({ skipLayerCleanup: true }))
}
/** 完全停止Modify：移除交互 + 清空图层 + 恢复可见性（离开要素列表时用） */
function stopModifyFull() {
  if (props.instanceId) eventBus.emit(`${props.instanceId}`, new GisMapStopModifyEvent())
}
function syncToMap() {
  if (!editingFeature.value || !props.instanceId) return
  eventBus.emit(`${props.instanceId}`, new GisMapUpdateEditFeatureEvent(editingFeature.value))
}

/** 展示影子图层（离开要素列表时） */
function showShadowOnMap() {
  if (!props.instanceId || !hasEdits.value) return
  eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:show-edit-shadow', options: {}, params: [JSON.parse(JSON.stringify(workingFeatures.value))] })
}

/** 清除影子图层（进入要素列表时） */
function clearShadowOnMap() {
  if (!props.instanceId) return
  eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] })
}

/**
 * 将双份数据渲染到地图：编辑数据源 + 影子数据源
 * 进入要素列表时调用：隐藏输入数据源，显示编辑层+影子层
 */
function renderEditAndShadowLayers() {
  if (!props.instanceId) return
  console.log('[FeatureEditor] renderEditAndShadowLayers called', { instanceId: props.instanceId, workingCount: workingFeatures.value.length, refCount: referenceFeatures.value.length })
  try {
    // 隐藏输入数据源
    eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:set-layer-visibility', options: {}, params: ['vector-input', false] })
    // 编辑数据源：显示可编辑副本
    const editEvent = new GisMapAddFeaturesEvent(workingFeatures.value, { layerName: 'vector-edit', clear: true })
    eventBus.emit(`${props.instanceId}`, editEvent)
    // 影子数据源：显示对照副本
    const shadowEvent = new GisMapAddFeaturesEvent(referenceFeatures.value, { layerName: 'vector-shadow', clear: true })
    eventBus.emit(`${props.instanceId}`, shadowEvent)
    console.log('[FeatureEditor] renderEditAndShadowLayers completed')
  } catch (e) {
    console.error('[FeatureEditor] renderEditAndShadowLayers error:', e)
  }
}

/**
 * 退出要素列表视图：清空编辑/影子层，恢复输入层
 */
function restoreInputLayer() {
  if (!props.instanceId) return
  // 清空编辑和影子数据源
  eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:clean-layer', options: {}, params: ['vector-edit'] })
  eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:clean-layer', options: {}, params: ['vector-shadow'] })
  // 恢复输入数据源可见性
  eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:set-layer-visibility', options: {}, params: ['vector-input', true] })
}

/** 将workingFeatures同步渲染到编辑数据源 */
function syncWorkingFeaturesToMap() {
  if (!props.instanceId) return
  const addFeaturesEvent = new GisMapAddFeaturesEvent(workingFeatures.value, { layerName: 'vector-edit', clear: true })
  eventBus.emit(`${props.instanceId}`, addFeaturesEvent)
}

const modifyChangeHandler = (_options: unknown, feature: unknown) => {
  if (!editingFeature.value) return
  pushHistory()
  editingFeature.value = JSON.parse(JSON.stringify(feature as GeoJSON.Feature))
  vertices.value = extractVertices(editingFeature.value)
}

// ==================== 节点操作 ====================
function updateVertex(vi: number, newX: number, newY: number) {
  if (!editingFeature.value) return
  pushHistory()
  const v = vertices.value[vi]
  const geo = editingFeature.value.geometry as GeoJSON.Geometry & { coordinates: unknown }
  if (geo.type === 'Point') { (geo.coordinates as number[])[0] = newX; (geo.coordinates as number[])[1] = newY }
  else if (geo.type === 'MultiPoint' || geo.type === 'LineString') { (geo.coordinates as number[][])[v.coordIdx][0] = newX; (geo.coordinates as number[][])[v.coordIdx][1] = newY }
  else if (geo.type === 'Polygon') {
    const c = geo.coordinates as number[][][]; c[v.ringIdx][v.coordIdx][0] = newX; c[v.ringIdx][v.coordIdx][1] = newY
    if (v.coordIdx === 0) { const l = c[v.ringIdx].length - 1; c[v.ringIdx][l][0] = newX; c[v.ringIdx][l][1] = newY }
  } else if (geo.type === 'MultiLineString') { const c = geo.coordinates as number[][][]; c[v.ringIdx][v.coordIdx][0] = newX; c[v.ringIdx][v.coordIdx][1] = newY }
  else if (geo.type === 'MultiPolygon') {
    const c = geo.coordinates as number[][][][]; const pi = Math.floor(v.ringIdx / 100), ri = v.ringIdx % 100
    c[pi][ri][v.coordIdx][0] = newX; c[pi][ri][v.coordIdx][1] = newY
    if (v.coordIdx === 0) { const l = c[pi][ri].length - 1; c[pi][ri][l][0] = newX; c[pi][ri][l][1] = newY }
  }
  vertices.value = extractVertices(editingFeature.value); syncToMap()
}

function deleteVertex(vi: number) {
  if (!editingFeature.value) return
  const geo = editingFeature.value.geometry; const v = vertices.value[vi]
  // 按环计数最小顶点检查
  if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') {
    const ringVertices = vertices.value.filter(x => x.ringIdx === v.ringIdx)
    if (ringVertices.length <= 3) { ElMessage.warning('该环至少需要3个顶点'); return }
  }
  if (geo.type === 'LineString' && vertices.value.length <= 2) { ElMessage.warning('折线至少需要2个顶点'); return }
  if (geo.type === 'MultiLineString') {
    const lineVertices = vertices.value.filter(x => x.ringIdx === v.ringIdx)
    if (lineVertices.length <= 2) { ElMessage.warning('该折线至少需要2个顶点'); return }
  }
  pushHistory()
  if (geo.type === 'LineString') { (geo.coordinates as number[][]).splice(v.coordIdx, 1) }
  else if (geo.type === 'Polygon') { const c = (geo.coordinates as number[][][]); c[v.ringIdx].splice(v.coordIdx, 1); if (c[v.ringIdx].length > 1) c[v.ringIdx][c[v.ringIdx].length - 1] = [...c[v.ringIdx][0]] }
  else if (geo.type === 'MultiLineString') { (geo.coordinates as number[][][])[v.ringIdx].splice(v.coordIdx, 1) }
  else if (geo.type === 'MultiPolygon') { const c = (geo.coordinates as number[][][][]); const pi = Math.floor(v.ringIdx / 100), ri = v.ringIdx % 100; c[pi][ri].splice(v.coordIdx, 1); if (c[pi][ri].length > 1) c[pi][ri][c[pi][ri].length - 1] = [...c[pi][ri][0]] }
  vertices.value = extractVertices(editingFeature.value); syncToMap()
}

function addVertex(beforeIdx: number) {
  if (!editingFeature.value) return
  const v = vertices.value[beforeIdx]; const vNext = vertices.value[beforeIdx + 1]; pushHistory()
  const nc: number[] = vNext ? [(v.coordinates[0] + vNext.coordinates[0]) / 2, (v.coordinates[1] + vNext.coordinates[1]) / 2] : [...v.coordinates]
  if (editingFeature.value.geometry.type === 'LineString') { (editingFeature.value.geometry.coordinates as number[][]).splice(v.coordIdx + 1, 0, nc) }
  else if (editingFeature.value.geometry.type === 'Polygon') { const c = (editingFeature.value.geometry.coordinates as number[][][]); c[v.ringIdx].splice(v.coordIdx + 1, 0, nc); c[v.ringIdx][c[v.ringIdx].length - 1] = [...c[v.ringIdx][0]] }
  else if (editingFeature.value.geometry.type === 'MultiLineString') { (editingFeature.value.geometry.coordinates as number[][][])[v.ringIdx].splice(v.coordIdx + 1, 0, nc) }
  else if (editingFeature.value.geometry.type === 'MultiPolygon') { const c = (editingFeature.value.geometry.coordinates as number[][][][]); const pi = Math.floor(v.ringIdx / 100), ri = v.ringIdx % 100; c[pi][ri].splice(v.coordIdx + 1, 0, nc); c[pi][ri][c[pi][ri].length - 1] = [...c[pi][ri][0]] }
  vertices.value = extractVertices(editingFeature.value); syncToMap()
}

function locateVertex(vertex: VertexItem) {
  if (!props.instanceId) return
  const pointFeature: GeoJSON.Feature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: vertex.coordinates },
    properties: {}
  }
  eventBus.emit(`${props.instanceId}`, new GisMapflashFeaturesEvent([pointFeature]))
}

// ==================== 要素级操作（在副本上） ====================
// 当前 draw-end handler 引用（用于取消绘制时移除）
let currentDrawHandler: ((_opt: unknown, _data: unknown) => void) | null = null

/** 移除当前 draw-end handler（取消绘制或完成绘制后调用） */
function cleanupDrawHandler() {
  if (currentDrawHandler && props.instanceId) {
    eventBus.off(`${props.instanceId}`, 'map-event:draw-end', currentDrawHandler)
    currentDrawHandler = null
  }
}

function handleSplit() {
  if (selectedFeatureIdxs.value.size !== 1) { ElMessage.warning('请先勾选1个面要素作为分割目标'); return }
  const targetIdx = Array.from(selectedFeatureIdxs.value)[0]
  const targetFeature = workingFeatures.value[targetIdx]
  if (!targetFeature.geometry || (targetFeature.geometry.type !== 'Polygon' && targetFeature.geometry.type !== 'MultiPolygon')) { ElMessage.warning('分割目标必须是面要素'); return }
  splitTargetIdx.value = targetIdx
  ElMessage.info('请在地图上绘制一条切割线来分割该面要素')
  cleanupDrawHandler()
  if (props.instanceId) {
    eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:draw-tool', options: {}, params: [{ type: 'LineString', cleanBefore: true, once: true, keep: false }] })
  }
  const handler = (_opt: unknown, data: unknown) => {
    try {
      const lineFeature = JSON.parse(data as string) as GeoJSON.Feature
      if (!lineFeature.geometry || lineFeature.geometry.type !== 'LineString') return
      const bufferedLine = turf.buffer(lineFeature, 0.00001, { units: 'kilometers' })
      if (!bufferedLine) { ElMessage.error('分割失败'); return }
      const originalPoly = targetFeature.geometry.type === 'MultiPolygon'
        ? turf.multiPolygon((targetFeature.geometry as GeoJSON.MultiPolygon).coordinates)
        : turf.polygon((targetFeature.geometry as GeoJSON.Polygon).coordinates)
      const diff = turf.difference(turf.featureCollection([originalPoly, bufferedLine as turf.Feature<turf.Polygon>]))
      if (!diff || !diff.geometry) { ElMessage.warning('分割结果为空，切割线可能未穿过面'); return }
      const newFeatures: GeoJSON.Feature[] = []
      if (diff.geometry.type === 'MultiPolygon') {
        (diff.geometry.coordinates as number[][][][]).forEach(ring => {
          newFeatures.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: ring }, properties: { ...targetFeature.properties } })
        })
      } else { newFeatures.push({ ...diff, properties: { ...targetFeature.properties } } as GeoJSON.Feature) }
      // 在副本上操作
      workingFeatures.value.splice(targetIdx, 1)
      workingFeatures.value.push(...newFeatures)
      selectedFeatureIdxs.value = new Set(); splitTargetIdx.value = null
      // 重新渲染地图：将更新后的副本同步到地图
      syncWorkingFeaturesToMap()
      ElMessage.success(`分割完成，生成 ${newFeatures.length} 个面要素`)
    } catch (e) { logger.error('分割失败:', e); ElMessage.error('分割失败') }
    cleanupDrawHandler()
  }
  currentDrawHandler = handler
  eventBus.on(`${props.instanceId}`, 'map-event:draw-end', handler)
}

function handleMerge() {
  const idxs = Array.from(selectedFeatureIdxs.value)
  if (idxs.length < 2) { ElMessage.warning('请先勾选至少2个要素'); return }
  const selectedFeatures = idxs.map(i => workingFeatures.value[i])
  const hasPolygon = selectedFeatures.some(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  const hasLine = selectedFeatures.some(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
  if (hasPolygon && hasLine) { ElMessage.warning('不能合并面和线'); return }
  try {
    let result: turf.Feature | null = null
    if (hasPolygon) {
      result = selectedFeatures.reduce<turf.Feature | null>((acc, f) => {
        if (!acc) return f as turf.Feature
        return turf.union(turf.featureCollection([acc, f as turf.Feature]))
      }, null)
    } else if (hasLine) {
      const allCoords: number[][] = []
      selectedFeatures.forEach(f => {
        if (f.geometry?.type === 'LineString') allCoords.push(...(f.geometry.coordinates as number[][]))
        else if (f.geometry?.type === 'MultiLineString') (f.geometry.coordinates as number[][][]).forEach(l => allCoords.push(...l))
      })
      if (allCoords.length > 0) result = turf.lineString(allCoords)
    }
    if (result) {
      result.properties = { ...selectedFeatures[0].properties }
      idxs.sort((a, b) => b - a).forEach(i => workingFeatures.value.splice(i, 1))
      workingFeatures.value.push(result as unknown as GeoJSON.Feature)
      selectedFeatureIdxs.value = new Set()
      syncWorkingFeaturesToMap()
      ElMessage.success('合并完成')
    } else { ElMessage.warning('合并结果为空') }
  } catch (e) { logger.error('合并失败:', e); ElMessage.error('合并失败') }
}

// ==================== 节点级操作 ====================
function handleBuffer() {
  if (!editingFeature.value) return
  ElMessageBox.prompt('请输入缓冲距离（米）', '缓冲分析', {
    confirmButtonText: '确定', cancelButtonText: '取消',
    inputPattern: /^-?\d+(\.\d+)?$/, inputErrorMessage: '请输入有效数字', inputValue: '100',
  }).then(({ value }) => {
    try {
      pushHistory()
      const buffered = turf.buffer(editingFeature.value as turf.Feature, parseFloat(value), { units: 'meters' })
      if (buffered) { buffered.properties = editingFeature.value!.properties; editingFeature.value = buffered as GeoJSON.Feature; vertices.value = extractVertices(editingFeature.value); syncToMap(); ElMessage.success('缓冲完成') }
    } catch (e) { logger.error('缓冲失败:', e); ElMessage.error('缓冲分析失败') }
  }).catch(() => {})
}

function handleClip() {
  if (!editingFeature.value) return
  ElMessage.info('请在地图上绘制一个裁剪面')
  cleanupDrawHandler()
  if (props.instanceId) { eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:draw-tool', options: {}, params: [{ type: 'Polygon', cleanBefore: true, once: true, keep: false, allowHole: false }] }) }
  const h = (_opt: unknown, data: unknown) => {
    try { const cf = JSON.parse(data as string) as GeoJSON.Feature; if (!cf.geometry) return; pushHistory(); const r = turf.intersect(turf.featureCollection([editingFeature.value as turf.Feature, cf as turf.Feature])); if (r) { r.properties = editingFeature.value!.properties; editingFeature.value = r as unknown as GeoJSON.Feature; vertices.value = extractVertices(editingFeature.value); syncToMap(); ElMessage.success('裁剪完成') } else { ElMessage.warning('裁剪结果为空') } } catch (e) { logger.error('裁剪失败:', e); ElMessage.error('裁剪失败') }
    cleanupDrawHandler()
  }
  currentDrawHandler = h
  eventBus.on(`${props.instanceId}`, 'map-event:draw-end', h)
}

function handleErase() {
  if (!editingFeature.value) return
  ElMessage.info('请在地图上绘制一个擦除面')
  cleanupDrawHandler()
  if (props.instanceId) { eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:draw-tool', options: {}, params: [{ type: 'Polygon', cleanBefore: true, once: true, keep: false, allowHole: false }] }) }
  const h = (_opt: unknown, data: unknown) => {
    try { const ef = JSON.parse(data as string) as GeoJSON.Feature; if (!ef.geometry) return; pushHistory(); const r = turf.difference(turf.featureCollection([editingFeature.value as turf.Feature, ef as turf.Feature])); if (r) { r.properties = editingFeature.value!.properties; editingFeature.value = r as unknown as GeoJSON.Feature; vertices.value = extractVertices(editingFeature.value); syncToMap(); ElMessage.success('擦除完成') } else { ElMessage.warning('擦除结果为空') } } catch (e) { logger.error('擦除失败:', e); ElMessage.error('擦除失败') }
    cleanupDrawHandler()
  }
  currentDrawHandler = h
  eventBus.on(`${props.instanceId}`, 'map-event:draw-end', h)
}

function handleConvexHull() {
  if (!editingFeature.value) return
  try { pushHistory(); const hull = turf.convex(editingFeature.value as turf.Feature); if (hull) { hull.properties = editingFeature.value!.properties; editingFeature.value = hull as unknown as GeoJSON.Feature; vertices.value = extractVertices(editingFeature.value); syncToMap(); ElMessage.success('凸包生成完成') } else { ElMessage.warning('无法生成凸包') } } catch (e) { logger.error('凸包失败:', e); ElMessage.error('凸包生成失败') }
}

// ==================== 撤销/重做 ====================
function handleUndo() { if (undoStack.value.length === 0) return; redoStack.value.push(JSON.stringify(editingFeature.value)); editingFeature.value = JSON.parse(undoStack.value.pop()!); vertices.value = extractVertices(editingFeature.value); syncToMap() }
function handleRedo() { if (redoStack.value.length === 0) return; undoStack.value.push(JSON.stringify(editingFeature.value)); editingFeature.value = JSON.parse(redoStack.value.pop()!); vertices.value = extractVertices(editingFeature.value); syncToMap() }

// ==================== 编辑页保存/取消 ====================
function handleSave() { exitFromEditPage(true); ElMessage.success('已保存到副本') }
function handleCancel() {
  if (undoStack.value.length > 0) {
    ElMessageBox.confirm('当前修改尚未保存，确定取消吗？', '放弃修改', { type: 'warning', confirmButtonText: '放弃', cancelButtonText: '继续编辑' }).then(() => exitFromEditPage(false)).catch(() => {})
  } else { exitFromEditPage(false) }
}

// ==================== 要素列表底部按钮 ====================
/** 更新：将副本写回原始数据，然后重新复制双份 */
function handleUpdate() {
  // eslint-disable-next-line vue/no-mutating-props
  props.data.features.splice(0, props.data.features.length, ...JSON.parse(JSON.stringify(workingFeatures.value)))
  // 更新后重新复制双份（此时workingFeatures === referenceFeatures）
  initBothCopies()
  emit('data-changed')
  ElMessage.success('数据已更新')
}

/** 另存：以新档案保存副本 */
function handleSaveAs() {
  const newName = (props.data.name || '未命名') + '（变更）'
  emit('create-archive', { name: newName, features: JSON.parse(JSON.stringify(workingFeatures.value)), sourceIdx: -1 })
  ElMessage.success('已另存为新档案')
}

/** 取消/重置：丢弃编辑，重新复制双份 */
function handleReset() {
  initBothCopies()
  selectedFeatureIdxs.value = new Set()
  ElMessage.info('已重置为原始数据')
}

// ==================== 生命周期 ====================
onBeforeUnmount(() => {
  cleanupDrawHandler()
  stopModifyFull()
  if (props.instanceId) eventBus.off(`${props.instanceId}`, 'map-event:modify-change', modifyChangeHandler)
})

/** 外部调用：激活编辑器（进入要素列表tab时） */
function activate() {
  isEditorActive.value = true
  console.log('[FeatureEditor] activate called', { workingCount: workingFeatures.value.length, dataCount: props.data.features?.length ?? 0 })
  // 初始化数据副本（如果还没有的话）
  if (workingFeatures.value.length === 0 && (props.data.features?.length ?? 0) > 0) {
    initBothCopies()
  } else {
    renderEditAndShadowLayers()
  }
}

/** 外部调用：停用编辑器（离开要素列表tab时） */
function deactivate() {
  isEditorActive.value = false
  console.log('[FeatureEditor] deactivate called')
  // 清空编辑和影子数据源，恢复输入数据源
  restoreInputLayer()
}

watch(() => props.instanceId, (newId, oldId) => {
  // 移除旧 instanceId 上的 handler
  if (oldId) eventBus.off(`${oldId}`, 'map-event:modify-change', modifyChangeHandler)
  // 注册新 instanceId 上的 handler
  if (newId) eventBus.on(`${newId}`, 'map-event:modify-change', modifyChangeHandler)
}, { immediate: true })

// 进入时：无已编辑数据→重新复制双份；有已编辑数据→保留workingFeatures，刷新referenceFeatures
// CRS 变化时（坐标转换后）强制重新复制，因为不同坐标系下的旧编辑无意义
let lastCrsEpsg: number | undefined = undefined
watch(() => props.data, (newData) => {
  const newEpsg = newData?.crs?.epsgCode
  if (newEpsg !== lastCrsEpsg) {
    // CRS 变化：强制重新复制双份，丢弃旧编辑
    initBothCopies()
    lastCrsEpsg = newEpsg
  } else if (!hasEdits.value) {
    initBothCopies()
  } else {
    initReferenceOnly()
  }
}, { immediate: true })

const geoTypeName = (t?: string) => t ? GeomUtils.getTypeName(t) : '未知'
const geoInfo = computed(() => editingFeature.value?.geometry ? { type: editingFeature.value.geometry.type, vertexCount: vertices.value.length } : null)
const isPolygonType = computed(() => { const t = editingFeature.value?.geometry?.type; return t === 'Polygon' || t === 'MultiPolygon' })
const hasPolygonFeature = computed(() => workingFeatures.value.some(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
const selectedCount = computed(() => selectedFeatureIdxs.value.size)
const propEntries = computed(() => Object.entries(editingProps.value))

defineExpose({ hasEdits, workingFeatures, activate, deactivate })
</script>

<template>
  <div class="feature-editor">
    <!-- ============ 页面1：要素列表 ============ -->
    <template v-if="currentPage === 'feature-list'">
      <div class="editor-header">
        <span class="header-title">要素列表</span>
      </div>
      <div class="toolbar">
        <el-button text size="small" :disabled="!hasPolygonFeature" @click="handleSplit" title="分割：画线切割面要素"><el-icon><Scissor /></el-icon> 分割</el-button>
        <el-button text size="small" :disabled="selectedCount < 2" @click="handleMerge" title="合并：将勾选的多个要素合并"><el-icon><Operation /></el-icon> 合并{{ selectedCount > 0 ? `(${selectedCount})` : '' }}</el-button>
      </div>
      <div class="feature-list">
        <div v-for="item in featureList" :key="item.idx" class="feature-item" :class="{ selected: item.selected }" @click="clickFeatureRow(item.idx)">
          <el-checkbox :model-value="item.selected" @change="toggleFeatureSelect(item.idx)" class="feature-check" @click.stop />
          <div class="feature-item-body">
            <GeoTypeIconRender :type="item.type" :size="14" />
            <span class="feature-label">{{ item.label }}</span>
            <el-tag size="small" effect="plain" round>{{ geoTypeName(item.type) }}</el-tag>
          </div>
          <el-button text size="small" type="primary" @click.stop="selectFeature(item.idx)" title="编辑"><el-icon><Edit /></el-icon></el-button>
        </div>
        <div v-if="featureList.length === 0" class="empty-tip">暂无可编辑的要素</div>
      </div>
      <div class="editor-footer">
        <el-button size="small" @click="handleReset">取消/重置</el-button>
        <el-button size="small" @click="handleSaveAs">另存</el-button>
        <el-button type="primary" size="small" @click="handleUpdate">更新</el-button>
      </div>
    </template>

    <!-- ============ 页面2：编辑面板 ============ -->
    <template v-else>
      <div class="editor-header">
        <el-button text size="small" @click="backToFeatureList" class="back-btn"><el-icon><Back /></el-icon> 返回列表</el-button>
        <span class="header-title">{{ geoTypeName(editingFeature?.geometry?.type) }}</span>
        <el-tag v-if="geoInfo" size="small" type="info" effect="plain">{{ geoInfo.vertexCount }} 节点</el-tag>
      </div>
      <div class="toolbar">
        <el-button text size="small" :disabled="!canUndo" @click="handleUndo" title="撤销"><el-icon><RefreshLeft /></el-icon></el-button>
        <el-button text size="small" :disabled="!canRedo" @click="handleRedo" title="重做"><el-icon><RefreshRight /></el-icon></el-button>
        <el-divider direction="vertical" />
        <el-button text size="small" @click="handleBuffer" title="缓冲"><el-icon><Rank /></el-icon></el-button>
        <el-button text size="small" :disabled="!isPolygonType" @click="handleClip" title="裁剪"><el-icon><Crop /></el-icon></el-button>
        <el-button text size="small" :disabled="!isPolygonType" @click="handleErase" title="擦除"><el-icon><Delete /></el-icon></el-button>
        <el-divider direction="vertical" />
        <el-button text size="small" @click="handleConvexHull" title="凸包"><el-icon><Grid /></el-icon></el-button>
      </div>
      <el-collapse v-model="activeEditSection" accordion class="edit-collapse">
        <el-collapse-item name="vertex" title="节点编辑">
          <div class="vertex-list-header">
            <span class="col-idx">#</span><span class="col-ring">环</span><span class="col-x">X</span><span class="col-y">Y</span><span class="col-action">操作</span>
          </div>
          <div class="vertex-list">
            <div v-for="(v, vi) in vertices" :key="v.id" class="vertex-row" :class="{ hover: hoveredVertexIdx === vi }" @mouseenter="hoveredVertexIdx = vi" @mouseleave="hoveredVertexIdx = null">
              <span class="col-idx">{{ v.index + 1 }}</span><span class="col-ring">{{ v.ringIdx }}</span>
              <span class="col-x"><el-input-number v-model="v.coordinates[0]" size="small" :controls="false" :precision="6" @change="updateVertex(vi, v.coordinates[0], v.coordinates[1])" /></span>
              <span class="col-y"><el-input-number v-model="v.coordinates[1]" size="small" :controls="false" :precision="6" @change="updateVertex(vi, v.coordinates[0], v.coordinates[1])" /></span>
              <span class="col-action">
                <el-button text size="small" @click="locateVertex(v)" title="定位"><el-icon><IconPosition /></el-icon></el-button>
                <el-button text size="small" @click="addVertex(vi)" title="插入"><el-icon><CopyDocument /></el-icon></el-button>
                <el-button text size="small" type="danger" @click="deleteVertex(vi)" title="删除"><el-icon><Delete /></el-icon></el-button>
              </span>
            </div>
          </div>
        </el-collapse-item>
        <el-collapse-item name="props" title="属性编辑">
          <div class="props-editor">
            <div v-for="([key, val], pi) in propEntries" :key="pi" class="prop-row">
              <span class="prop-key">{{ key }}</span>
              <el-input v-model="editingProps[key as string]" size="small" @change="applyPropertiesToFeature" />
            </div>
            <div v-if="propEntries.length === 0" class="empty-props">无属性</div>
          </div>
        </el-collapse-item>
      </el-collapse>
      <div class="editor-footer">
        <el-button type="primary" size="small" @click="handleSave">保存</el-button>
        <el-button size="small" @click="handleCancel">取消</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.feature-editor { height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; }
.editor-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--el-border-color-lighter); flex-shrink: 0; }
.back-btn { padding: 2px 6px; }
.header-title { font-weight: 600; font-size: 13px; color: var(--el-text-color-primary); }

.feature-list { flex: 1; overflow-y: auto; padding: 4px; }
.feature-item { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; transition: background 0.15s; }
.feature-item:hover { background: var(--el-fill-color-light); }
.feature-item.selected { background: var(--el-color-primary-light-9); }
.feature-check { flex-shrink: 0; }
.feature-item-body { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.feature-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.empty-tip { text-align: center; padding: 32px 0; color: var(--el-text-color-placeholder); font-size: 13px; }

.toolbar { display: flex; align-items: center; gap: 2px; padding: 4px 8px; border-bottom: 1px solid var(--el-border-color-lighter); flex-shrink: 0; flex-wrap: wrap; }
.section-label { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); padding: 4px 10px 2px; background: var(--el-fill-color-lighter); flex-shrink: 0; border-top: 1px solid var(--el-border-color-extra-light); }

/* 手风琴：占满剩余空间，内容区可滚动 */
.edit-collapse { flex: 1; overflow: hidden; display: flex; flex-direction: column; border-top: 1px solid var(--el-border-color-lighter); }
.edit-collapse :deep(.el-collapse-item) { display: flex; flex-direction: column; min-height: 0; }
.edit-collapse :deep(.el-collapse-item.is-active) { flex: 1; }
.edit-collapse :deep(.el-collapse-item__header) { font-size: 12px; font-weight: 600; padding: 0 10px; background: var(--el-fill-color-lighter); flex-shrink: 0; }
.edit-collapse :deep(.el-collapse-item__wrap) { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.edit-collapse :deep(.el-collapse-item__content) { flex: 1; overflow-y: auto; padding: 0; }

.vertex-list-header { display: flex; align-items: center; padding: 4px 8px; font-size: 11px; color: var(--el-text-color-secondary); background: var(--el-fill-color-lighter); flex-shrink: 0; }
.vertex-list { flex: 1; overflow-y: auto; min-height: 80px; }
.vertex-row { display: flex; align-items: center; padding: 2px 8px; font-size: 12px; transition: background 0.1s; border-bottom: 1px solid var(--el-border-color-extra-light); }
.vertex-row.hover { background: var(--el-color-primary-light-9); }
.col-idx { width: 24px; flex-shrink: 0; text-align: center; color: var(--el-text-color-secondary); font-family: monospace; font-size: 11px; }
.col-ring { width: 20px; flex-shrink: 0; text-align: center; color: var(--el-text-color-placeholder); font-family: monospace; font-size: 10px; }
.col-x, .col-y { flex: 1; min-width: 0; padding: 0 2px; }
.col-x :deep(.el-input-number), .col-y :deep(.el-input-number) { width: 100%; }
.col-x :deep(.el-input__inner), .col-y :deep(.el-input__inner) { font-size: 11px; font-family: monospace; padding: 0 4px; text-align: left; }
.col-action { width: 90px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; gap: 0; }
.col-action .el-button { padding: 2px; }

.props-editor { flex: 1; overflow-y: auto; flex-shrink: 0; }
.prop-row { display: flex; align-items: center; gap: 6px; padding: 2px 10px; border-bottom: 1px solid var(--el-border-color-extra-light); }
.prop-key { width: 80px; flex-shrink: 0; font-size: 11px; font-family: monospace; color: var(--el-text-color-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prop-row .el-input { flex: 1; }
.prop-row :deep(.el-input__inner) { font-size: 12px; padding: 0 6px; }
.empty-props { text-align: center; padding: 8px 0; color: var(--el-text-color-placeholder); font-size: 12px; }

.editor-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--el-border-color-lighter); flex-shrink: 0; }
</style>
