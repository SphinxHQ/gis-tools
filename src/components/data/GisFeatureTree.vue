<script setup lang="ts">
/**
 * @file Feature tree component
 * @description Displays a tree-structured view of features by geometry type with
 *              selection, locate, and delete operations.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import * as turf from "@turf/turf";
import {ElMessage, ElMessageBox} from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position } from "geojson";
import { Edit } from '@element-plus/icons-vue'
import {
  getCurrentInstance,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  Ref,
  watch
} from "vue";

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import GisDataInfo from "~/components/data/GisDataInfo";
import GisFeatureEditor from "~/components/data/GisFeatureEditor.vue";
import {GisMapflashFeaturesEvent, GisMapStopModifyEvent} from "~/components/gismap/events/GisMapEvents";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import {eventBus} from "~/composables/eventBus";
import {useGisDataStore} from "~/composables/gisDataStore";

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
  'enter-edit-mode': []
  'exit-edit-mode': []
}>()

const { updateDataset, addDataset, activeId, activeSourceId } = useGisDataStore()

// 编辑变更跟踪
const hasUnsavedChanges = ref(false)

// 变更操作后提示：更新当前数据集 or 另存为新数据集（同源）
const promptUpdateOrSaveAs = async () => {
  if (!hasUnsavedChanges.value) return
  try {
    await ElMessageBox.confirm(
      '要素编辑完成。请选择：更新当前数据集，或另存为新数据集（同一数据源下）。',
      '变更确认',
      {
        confirmButtonText: '另存为新数据集',
        cancelButtonText: '更新当前数据',
        distinguishCancelAndClose: true,
        type: 'info',
      }
    )
    // 另存为新数据集
    if (activeId.value && props.data) {
      const clone = GisDataInfo.clone(props.data)
      addDataset(clone, activeSourceId.value ?? undefined)
    }
    hasUnsavedChanges.value = false
  } catch (action: unknown) {
    if (action === 'cancel') {
      // 更新当前数据
      if (activeId.value && props.data) {
        updateDataset(activeId.value, props.data)
      }
      hasUnsavedChanges.value = false
    }
    // action === 'close' 时保持 hasUnsavedChanges = true，下次退出时再次提示
  }
}

const treeHeight = ref(0)
const conpomentVisiblity = ref(false)
const featureEditorRef = ref<InstanceType<typeof GisFeatureEditor> | null>(null)
const activeView = ref<'tree' | 'editor'>('tree')

const sizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const newHeight = entry.contentRect.height - 40
    treeHeight.value = Math.max(0, newHeight)
    conpomentVisiblity.value = newHeight > 0
  }
})

onMounted(() => {
  const currentInstance = getCurrentInstance()
  if (currentInstance?.vnode.el) {
    treeHeight.value = currentInstance.vnode.el.clientHeight - 40
    sizeObserver.observe(currentInstance.vnode.el as Element)
  }
})

onBeforeUnmount(() => {
  sizeObserver.disconnect()
})

// === 类型工具 ===
const isPrimitive = (data: unknown): boolean => {
  const _type = Object.prototype.toString.call(data)
  const _primitives = ["[object String]", "[object Number]", "[object Boolean]", "[object Null]", "[object Undefined]"]
  return _primitives.includes(_type)
}
const getTypeName = (data: unknown): string => {
  const _typeStr = Object.prototype.toString.call(data)
  return _typeStr.slice(8, -1).toLowerCase()
}

const label2TagType = (node: GeoInfoNode): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  const t = String(node.label2 ?? '')
  if (t.includes('岛屿') || t.includes('含岛')) return 'success'
  if (t.includes('外部环')) return 'primary'
  if (t.includes('内部环') || t.includes('内环')) return 'warning'
  if (t.includes('外环')) return 'primary'
  if (t.includes('项') || t.includes('面数') || t.includes('个数')) return 'info'
  if (t.includes('无几何')) return 'info'
  return 'info'
}

const INDEX_RE = /\s*#(\d+)\s*$/
const splitLabel = (label: string): { name: string; index?: string } => {
  const m = label.match(INDEX_RE)
  if (!m) return { name: label }
  return { name: label.slice(0, m.index).trimEnd(), index: `#${m[1]}` }
}

// === 节点类 ===
class GeoInfoNode {
  label: string
  label2?: string
  geoType?: string
  geoData?: unknown
  typeName?: string
  children: GeoInfoNode[]
  value?: unknown
  id?: string
  disabled: boolean = false
  geometry?: Record<string, unknown>
  sourceFeature?: GeoJSON.Feature

  constructor(_label: string, _children?: GeoInfoNode[], _geoType?: string, _geoData?: unknown) {
    this.label = _label
    this.children = []
    this.id = Math.random().toString(36).slice(2)
    this.geoType = _geoType
    this.geoData = _geoData
    if (_children) {
      this.children.push(..._children)
    }
  }
}

const inspector: Record<string, (coordinates: unknown[], idx?: number) => GeoInfoNode> = {
  "Point": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const coords = coordinates as number[]
    const xNode = new GeoInfoNode(`经度`)
    xNode.value = coords[0]
    xNode.typeName = getTypeName(coords[0])
    const yNode = new GeoInfoNode(`纬度`)
    yNode.value = coords[1]
    yNode.typeName = getTypeName(coords[1])
    const pNode = new GeoInfoNode(
      idx !== undefined ? `顶点 #${idx}` : "顶点",
      [],
      'Point',
      coordinates,
    )
    pNode.label2 = idx !== undefined ? `#${idx}` : undefined
    pNode.geometry = { type: "Point", coordinates: coordinates }
    return pNode
  },
  "LineString": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `折线 #${idx}` : "折线",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Point(c as unknown[], i)),
      'LineString',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 节点`
    geoInfoNode.geometry = { type: "LineString", coordinates: coordinates }
    return geoInfoNode
  },
  "Polygon": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNodes = []
    const rings = coordinates as unknown[][]
    for (let i = 0; i < rings.length; i++) {
      const isOuter = i === 0
      const node = new GeoInfoNode(
        `${isOuter ? "外环" : "内环"} #${i}`,
        rings[i].map((c: unknown, j: number) => inspector.Point(c as unknown[], j)),
      )
      node.label2 = `${rings[i].length} 顶点`
      node.geometry = { type: "LineString", coordinates: rings[i] as unknown[] }
      geoInfoNodes.push(node)
    }
    const pNode = new GeoInfoNode(
      idx !== undefined
        ? (rings.length > 1 ? `多边形 · 含岛屿 #${idx}` : `多边形 #${idx}`)
        : (rings.length > 1 ? "多边形 · 含岛屿" : "多边形"),
      geoInfoNodes,
      'Polygon',
      coordinates,
    )
    pNode.label2 = `${rings.length} 环 · ${rings.reduce((acc, r) => acc + (r as unknown[]).length, 0)} 顶点`
    pNode.geometry = { type: "Polygon", coordinates: coordinates }
    return pNode
  },
  "MultiPoint": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多点集 #${idx}` : "多点集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Point(c as unknown[], i)),
      'MultiPoint',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 个点`
    geoInfoNode.geometry = { type: "MultiPoint", coordinates: coordinates }
    return geoInfoNode
  },
  "MultiLineString": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多线集 #${idx}` : "多线集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.LineString(c as unknown[], i)),
      'MultiLineString',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 条折线`
    geoInfoNode.geometry = { type: "MultiLineString", coordinates: coordinates }
    return geoInfoNode
  },
  "MultiPolygon": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多面集 #${idx}` : "多面集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Polygon(c as unknown[], i)),
      'MultiPolygon',
      coordinates,
    )
    geoInfoNode.label2 = `${coordinates.length} 个多边形`
    geoInfoNode.geometry = { type: "MultiPolygon", coordinates: coordinates }
    return geoInfoNode
  }
}

const inspectFeature = (feature: GeoJSON.Feature, _idx: number = 0): GeoInfoNode => {
  if (!feature.geometry) {
    const nullNode = new GeoInfoNode("空几何")
    const node = new GeoInfoNode(`要素 #${_idx}`, [nullNode])
    node.label2 = "无几何"
    return node
  }

  const geoType: string = feature.geometry.type
  let handleFun = inspector[geoType]
  if (!handleFun) {
    handleFun = () => new GeoInfoNode("未知几何类型:" + geoType)
  }
  const geoInfoNode = handleFun((feature.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates as unknown[], _idx)

  const properties = feature.properties
  const propertyInfoNode = new GeoInfoNode("属性")
  propertyInfoNode.disabled = true
  if (properties) {
    for (const key in properties) {
      const val = properties[key]
      const node = new GeoInfoNode(key)
      node.value = val
      node.typeName = getTypeName(val)
      if (node.typeName === "string") {
        node.value = `"${node.value}"`
      } else if (!isPrimitive(val)) {
        node.value = `[${node.typeName}]`
      }
      propertyInfoNode.children.push(node)
      propertyInfoNode.disabled = false
    }
  }

  const geoTypeName = GeomUtils.getTypeName(geoType)
  const node = new GeoInfoNode(`要素 #${_idx}`, [geoInfoNode, propertyInfoNode])
  node.label2 = geoTypeName
  node.geometry = feature.geometry as unknown as Record<string, unknown>
  node.sourceFeature = feature
  return node
}

const geoJsonTreeData2: Ref<GeoInfoNode[] | undefined> = ref(undefined)

const buildGeoJsonTree = () => {
  if (props.data?.features?.length) {
    const children = props.data.features
      .map((f, _idx) => inspectFeature(f, _idx))
      .filter((node): node is GeoInfoNode => node !== undefined)
    const geoInfoNode = new GeoInfoNode("几何要素", children)
    geoInfoNode.id = 'root'
    geoInfoNode.label2 = `${props.data.features.length} 项`
    geoInfoNode.geometry = {
      type: "GeometryCollection",
      geometries: props.data.features.filter(f => f.geometry).map(x => x.geometry)
    }
    geoJsonTreeData2.value = [geoInfoNode]
  } else {
    geoJsonTreeData2.value = undefined
  }
}

watch(() => props.data, () => {
  buildGeoJsonTree()
}, { deep: true, immediate: true })

// === 节点交互 ===
const selectedNodeId = ref<string | null>(null)
const selectedNodeData = ref<GeoInfoNode | null>(null)

const getOriginalJson = (node: GeoInfoNode | null): string => {
  if (!node) return ''
  if (node.sourceFeature) return JSON.stringify(node.sourceFeature, null, 2)
  if (node.geometry) return JSON.stringify(node.geometry, null, 2)
  if (node.value !== undefined) return JSON.stringify(node.value, null, 2)
  return ''
}

const editedJson = ref('')
const isDirty = ref(false)
const editingNode = ref<GeoInfoNode | null>(null)
const editorDialogVisible = ref(false)

const handleEditDialogOpen = (node: GeoInfoNode) => {
  editingNode.value = node
  editedJson.value = getOriginalJson(node)
  isDirty.value = false
  editorDialogVisible.value = true
}

const handleEditDialogClose = () => {
  if (isDirty.value) {
    ElMessageBox.confirm('当前修改尚未保存，确定关闭吗？', '放弃修改', {
      type: 'warning',
      confirmButtonText: '放弃并关闭',
      cancelButtonText: '继续编辑',
    })
      .then(() => {
        editorDialogVisible.value = false
        if (editingNode.value) {
          editedJson.value = getOriginalJson(editingNode.value)
        }
        isDirty.value = false
        editingNode.value = null
      })
      .catch(() => {})
    return
  }
  editorDialogVisible.value = false
  editingNode.value = null
}

const handleEditorInput = (val: string) => {
  editedJson.value = val
  isDirty.value = val !== getOriginalJson(editingNode.value)
}

const handleJsonUpdate = () => {
  const node = editingNode.value
  if (!node) return
  try {
    const parsed = JSON.parse(editedJson.value)
    if (node.sourceFeature && parsed.type === 'Feature') {
      if (parsed.geometry) {
        node.sourceFeature.geometry = parsed.geometry
        node.geometry = parsed.geometry as Record<string, unknown>
      }
      if (parsed.properties) {
        node.sourceFeature.properties = parsed.properties
      }
      const idx = props.data.features.indexOf(node.sourceFeature)
      if (idx >= 0) {
        const newFeature = { ...node.sourceFeature } as GeoJSON.Feature
        props.data.features[idx] = newFeature
        node.sourceFeature = newFeature
      }
    } else if (node.geometry) {
      node.geometry = parsed as Record<string, unknown>
      if (node.sourceFeature) {
        node.sourceFeature.geometry = parsed as GeoJSON.Geometry
      }
    }
    isDirty.value = false
    ElMessage.success('更新成功')
  } catch (e: unknown) {
    ElMessage.error('JSON 格式错误，无法更新')
  }
}

const handleJsonCancel = () => {
  if (editingNode.value) {
    editedJson.value = getOriginalJson(editingNode.value)
  }
  isDirty.value = false
}

const flashGeometries = (geometries: Record<string, unknown>[]) => {
  if (!props.instanceId) return
  const addFeaturesEvent = new GisMapflashFeaturesEvent(geometries.map(x => {
    return {
      type: "Feature" as const,
      geometry: x as unknown as GeoJSON.Geometry,
      properties: {} as GeoJSON.GeoJsonProperties,
    } satisfies GeoJSON.Feature
  }))
  eventBus.emit(`${props.instanceId}`, addFeaturesEvent)
}

const handleTreeNodeClick = (data: GeoInfoNode) => {
  selectedNodeId.value = data.id ?? null
  selectedNodeData.value = data
  editedJson.value = getOriginalJson(data)
  isDirty.value = false
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}

const handleTreeNodeView = (data: GeoInfoNode) => {
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}

// === 要素编辑器 ===
const isInEditMode = ref(false)

const handleViewChange = (view: 'tree' | 'editor') => {
  activeView.value = view
  if (view === 'editor') {
    isInEditMode.value = true
    emit('enter-edit-mode')
    featureEditorRef.value?.activate()
  } else {
    if (isInEditMode.value) {
      isInEditMode.value = false
      emit('exit-edit-mode')
      if (props.instanceId) {
        eventBus.emit(`${props.instanceId}`, new GisMapStopModifyEvent())
        eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] })
      }
      // 编辑退出时提示更新/另存
      promptUpdateOrSaveAs()
    }
  }
}

const handleEditorExit = () => {
  isInEditMode.value = false
  activeView.value = 'tree'
  emit('exit-edit-mode')
  // 编辑退出时提示更新/另存
  promptUpdateOrSaveAs()
}

const handleEditorModifyChange = (_feature: GeoJSON.Feature) => {
  logger.info('[FeatureTree] Feature modified in editor')
  hasUnsavedChanges.value = true
}

const handleEditorDataChanged = () => {
  buildGeoJsonTree()
  hasUnsavedChanges.value = true
}

const handleCreateArchive = (payload: { name: string; features: GeoJSON.Feature[]; sourceIdx: number }) => {
  payload.features.forEach((f, i) => {
    if (!f.properties) f.properties = {}
    f.properties.name = payload.name + (payload.features.length > 1 ? ` #${i + 1}` : '')
    props.data.features.push(f)
  })
  buildGeoJsonTree()
}

const handleShowShadow = () => {
  const hasEditsVal = featureEditorRef.value?.hasEdits ?? false
  const workingFeatures = featureEditorRef.value?.workingFeatures ?? []
  if (hasEditsVal && props.instanceId) {
    eventBus.emit(`${props.instanceId}`, {
      event_type: 'map-event:show-edit-shadow',
      options: {},
      params: [JSON.parse(JSON.stringify(workingFeatures))],
    })
  }
}

const handleClearShadow = () => {
  if (props.instanceId) {
    eventBus.emit(`${props.instanceId}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] })
  }
}
</script>

<template>
  <div class="gis-feature-tree-container">
    <!-- 视图切换 -->
    <div class="view-switcher">
      <el-segmented v-model="activeView" :options="[
        { value: 'tree', label: '结构树' },
        { value: 'editor', label: '要素编辑' }
      ]" size="small" @change="(val: string | number) => handleViewChange(val as 'tree' | 'editor')" />
    </div>

    <!-- 结构树视图 -->
    <div v-show="activeView === 'tree'" class="tree-view">
      <el-tree-v2
        ref="theTree"
        :height="treeHeight"
        :default-expanded-keys="['root']"
        :data="geoJsonTreeData2"
        :props="{ label: 'label', children: 'children' }"
        :highlight-current="true"
        :check-on-click-node="true"
        :expand-on-click-node="false"
        node-key="id"
        @node-click="handleTreeNodeClick"
      >
        <template #default="{ data: nodeData }">
          <span v-if="nodeData" :class="`custom-tree-node ${nodeData.disabled?'disabled':''}`">
            <GeoTypeIconRender v-if="nodeData.geoType" :type="nodeData.geoType" :size="13" />
            <span class="key">{{ splitLabel(nodeData.label).name }}</span>
            <el-tag v-if="nodeData.label2" size="small" :type="label2TagType(nodeData)" effect="plain" round class="label2">
              {{ nodeData.label2 }}
            </el-tag>
            <span v-if="nodeData.value !== undefined" :class="`val-${ nodeData.typeName}`">{{ nodeData.value }}</span>
            <el-icon v-if="nodeData.geometry || nodeData.sourceFeature" class="node-btn node-btn-edit" title="编辑JSON" @click.stop="handleEditDialogOpen(nodeData)"><Edit /></el-icon>
          </span>
        </template>
      </el-tree-v2>
    </div>

    <!-- 要素编辑器视图 -->
    <div v-show="activeView === 'editor'" class="editor-view">
      <gis-feature-editor
        ref="featureEditorRef"
        :data="data"
        :instance-id="instanceId"
        @exit="handleEditorExit"
        @modify-change="handleEditorModifyChange"
        @data-changed="handleEditorDataChanged"
        @create-archive="handleCreateArchive"
        @show-shadow="handleShowShadow"
        @clear-shadow="handleClearShadow"
      />
    </div>

    <!-- 节点 JSON 编辑弹窗 -->
    <el-dialog
      v-model="editorDialogVisible"
      title="编辑节点 JSON"
      width="60%"
      :close-on-click-modal="false"
      class="node-edit-dialog"
      align-center
      top="8vh"
      @close="handleEditDialogClose"
    >
      <div class="json-editor-container dialog-editor">
        <geo-str-editor
          :value="editedJson"
          :read-only="false"
          :minimap="false"
          language="geojson"
          class="json-editor-main"
          @input="handleEditorInput"
        />
      </div>
      <template #footer>
        <div class="json-editor-footer">
          <span class="dirty-tip" :class="{ visible: isDirty }">未保存的修改</span>
          <el-button size="small" :disabled="!isDirty" @click="handleJsonCancel">还原</el-button>
          <el-button type="primary" size="small" :disabled="!isDirty" @click="handleJsonUpdate">更新</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.gis-feature-tree-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.view-switcher {
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.tree-view {
  flex: 1;
  overflow: hidden;
  padding: 4px;
  box-sizing: border-box;
}

.editor-view {
  flex: 1;
  overflow: hidden;
  padding: 4px;
  box-sizing: border-box;
}

.custom-tree-node {
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.custom-tree-node .key {
  color: var(--el-text-color-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-tree-node .label2 {
  flex-shrink: 0;
}

.custom-tree-node.disabled .key {
  color: var(--el-text-color-secondary);
}

.node-btn {
  cursor: pointer;
  color: var(--el-color-primary);
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: auto;
}

.node-btn:hover {
  opacity: 1;
}

.json-editor-container {
  height: 60vh;
}

.json-editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.dirty-tip {
  font-size: 12px;
  color: var(--el-color-warning);
  opacity: 0;
  transition: opacity 0.2s;
  margin-right: auto;
}

.dirty-tip.visible {
  opacity: 1;
}
</style>
