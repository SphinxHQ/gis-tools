<script setup lang="ts">
/**
 * @file GIS data validator component
 * @description 拓扑校验组件，支持勾选检查项 → 执行 → 查看结果 → 重新检查 → 回到初始状态
 *              检查项体系参考 OGC 标准，分为对象级/要素集级/复合几何级三大类。
 *              结果阶段将几何错误渲染到 layer_topo_err_{code} 图层，按错误类型着色。
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import * as turf from "@turf/turf";
import { ElMessage } from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position } from "geojson";
import { computed, onBeforeUnmount, ref, Ref, watch } from "vue";

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import { logger } from "~/common/logger";
import GisDataInfo from "~/components/data/GisDataInfo";
import { GisMapAddFeaturesEvent, GisMapflashFeaturesEvent } from "~/components/gismap/events/GisMapEvents";
import { TOPO_ERROR_COLORS, TOPO_ERR_LAYER_PREFIX } from "~/components/gismap/styles/GisStyle";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import { eventBus } from "~/composables/eventBus";

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  instanceId: {
    type: [Number, String],
    default: 0
  },
  treeHeight: {
    type: Number,
    default: 400
  }
})

// ==================== 检查项配置（参考 OGC 拓扑检查项体系）====================
type ValidationCategory = 'object' | 'dataset' | 'composite'

interface ValidationItem {
  /** 代码标识 */
  code: string
  /** 中文名称 */
  name: string
  /** 所属大类 */
  category: ValidationCategory
  /** 说明 */
  description: string
  /** 是否已实现 */
  implemented: boolean
  /** 结果中匹配的错误名称（用于过滤已有算法结果） */
  matchNames?: string[]
}

const CATEGORY_META: Record<ValidationCategory, { title: string }> = {
  object: { title: '对象级 · 单要素几何合法性' },
  dataset: { title: '要素集级 · 多要素拓扑约束' },
  composite: { title: '复合几何级 · 分量间拓扑' },
}

const VALIDATION_ITEMS: ValidationItem[] = [
  // === 对象级 ===
  { code: 'empty_geometry', name: '空几何', category: 'object', description: '几何对象为空，无任何坐标信息', implemented: false },
  { code: 'invalid_coordinate', name: '坐标有效性', category: 'object', description: '坐标值存在 NaN/Infinity 等非法数值', implemented: false },
  { code: 'coordinate_out_of_bounds', name: '坐标越界', category: 'object', description: '坐标值超出当前空间参考的合法取值范围', implemented: false },
  { code: 'invalid_z_m', name: 'Z/M 值无效', category: 'object', description: '带高程或度量的坐标值非法或值域越界', implemented: false },
  { code: 'duplicate_vertices', name: '重复顶点', category: 'object', description: '连续两个及以上顶点坐标完全相同', implemented: false },
  { code: 'collinear_vertices', name: '共线冗余顶点', category: 'object', description: '连续三个及以上顶点共线，无几何意义', implemented: false },
  { code: 'short_edge', name: '最短边', category: 'object', description: '线段长度小于拓扑容差阈值', implemented: false },
  { code: 'degenerate_dimension', name: '退化维度', category: 'object', description: '几何实际维度低于声明类型', implemented: false },
  { code: 'degenerate_area', name: '最小面积', category: 'object', description: '面要素面积小于最小阈值', implemented: false },
  { code: 'unclosed_ring', name: '环闭合性', category: 'object', description: '面边界/线性环的首尾坐标不闭合', implemented: false },
  { code: 'ring_orientation', name: '环方向错误', category: 'object', description: '面外环节点遍历方向不符合规范', implemented: false },
  { code: 'self_intersection', name: '自相交', category: 'object', description: '线/面自身边界交叉穿透', implemented: true, matchNames: ['环自相交'] },
  { code: 'self_tangent', name: '自相切', category: 'object', description: '几何边界仅单点接触不穿透', implemented: false },
  { code: 'self_overlap', name: '自重叠', category: 'object', description: '线/面自身线段/边界重合覆盖', implemented: false },
  { code: 'disconnected_interior', name: '内部不连通', category: 'object', description: '面要素内部区域被边界分割为互不连通的多部分', implemented: false },
  { code: 'multiple_shells', name: '多外环错误', category: 'object', description: '单个 Polygon 存在两个及以上互不包含的外边界环', implemented: false },
  { code: 'missing_shell', name: '外环缺失', category: 'object', description: '面要素无外边界环，仅存在内环构造', implemented: false },
  // === 要素集级 ===
  { code: 'duplicate_feature', name: '重复要素', category: 'dataset', description: '两个及以上要素几何完全重合', implemented: false },
  { code: 'polygon_overlap', name: '面重叠', category: 'dataset', description: '面与面的内部区域发生重叠', implemented: false },
  { code: 'polygon_gap', name: '面缝隙', category: 'dataset', description: '相邻面之间存在无覆盖的空白区域', implemented: false },
  { code: 'mismatched_common_edge', name: '公共边不匹配', category: 'dataset', description: '相邻面的公共边界节点位置/数量不一致', implemented: false },
  { code: 'polygon_not_in_polygon', name: '面不在面内', category: 'dataset', description: '面要素未被另一面层要素完全包含覆盖', implemented: false },
  { code: 'line_overlap', name: '线重叠', category: 'dataset', description: '线与线之间存在部分或完全重合的线段', implemented: false },
  { code: 'intersection_without_node', name: '无节点相交', category: 'dataset', description: '线要素在非端点处交叉，未生成公共节点', implemented: false },
  { code: 'dangle', name: '悬挂线', category: 'dataset', description: '线的端点未连接到其他线要素', implemented: false },
  { code: 'pseudo_node', name: '伪节点', category: 'dataset', description: '仅连接两条线的不必要节点', implemented: false },
  { code: 'point_overlap', name: '点重叠', category: 'dataset', description: '两个及以上点要素坐标完全重合', implemented: false },
  { code: 'point_not_on_line', name: '点不在线上', category: 'dataset', description: '点要素未落在指定线要素的边界上', implemented: false },
  { code: 'point_not_in_polygon', name: '点不在面内', category: 'dataset', description: '点要素未落入面要素内部或边界', implemented: false },
  { code: 'line_not_in_polygon', name: '线不在面内', category: 'dataset', description: '线要素部分或全部超出面要素范围', implemented: false },
  { code: 'boundary_not_covered_by_line', name: '边界未被线覆盖', category: 'dataset', description: '面边界未与线要素完全匹配重合', implemented: false },
  { code: 'minimum_distance_violation', name: '要素间距不足', category: 'dataset', description: '要素间距离小于规定的最小容忍阈值', implemented: false },
  { code: 'must_not_intersect', name: '线要素互不相交', category: 'dataset', description: '指定线要素之间不允许发生任何交叉', implemented: false },
  // === 复合几何级 ===
  { code: 'hole_outside_shell', name: '洞在壳外', category: 'composite', description: '内洞完全或部分超出外边界壳的范围', implemented: true, matchNames: ['洞不在壳内'] },
  { code: 'hole_shares_edge_with_shell', name: '洞与壳共边', category: 'composite', description: '内洞边界与外边界共享线段', implemented: false },
  { code: 'holes_overlap', name: '洞洞相交', category: 'composite', description: '同一面的多个内洞之间互相重叠/交叉', implemented: true, matchNames: ['面内环自相交', '洞与洞相交'] },
  { code: 'degenerate_hole', name: '退化洞', category: 'composite', description: '内洞面积极小或为零，无实际意义', implemented: false },
  { code: 'hole_orientation', name: '内环方向错误', category: 'composite', description: '内洞的节点遍历方向与外环规范不符', implemented: false },
  { code: 'multipart_overlap', name: '多部件重叠', category: 'composite', description: '多部件几何的不同分量之间互相重叠', implemented: true, matchNames: ['面内自相交'] },
  { code: 'multipart_nested_error', name: '多部件嵌套错误', category: 'composite', description: 'MultiPolygon 中子部件互相包含', implemented: false },
  { code: 'nested_polygons', name: '嵌套面异常', category: 'composite', description: '多部件面中出现未定义为内环的嵌套包含关系', implemented: false },
  { code: 'multipart_type_mismatch', name: '部件类型不一致', category: 'composite', description: '多部件几何中混入其他类型的子几何', implemented: false },
  { code: 'empty_component', name: '空部件', category: 'composite', description: '多部件几何中包含空的子几何对象', implemented: false },
]

// 按类别分组
const groupedItems = computed(() => {
  const groups: Record<ValidationCategory, ValidationItem[]> = { object: [], dataset: [], composite: [] }
  for (const item of VALIDATION_ITEMS) groups[item.category].push(item)
  return groups
})

const categoryList = computed(() => (['object', 'dataset', 'composite'] as ValidationCategory[]).map(key => ({
  key,
  title: CATEGORY_META[key].title,
  items: groupedItems.value[key],
  implementedCount: groupedItems.value[key].filter(i => i.implemented).length,
})))

// ==================== 状态机：config(勾选) → result(结果)====================
type Phase = 'config' | 'result'
const phase = ref<Phase>('config')
const busy = ref(false)

// 勾选的检查项（默认勾选所有已实现的）
const selectedCodes = ref<Set<string>>(new Set(
  VALIDATION_ITEMS.filter(i => i.implemented).map(i => i.code)
))

const implementedCodes = computed(() => new Set(VALIDATION_ITEMS.filter(i => i.implemented).map(i => i.code)))
const selectedCount = computed(() => selectedCodes.value.size)
const allImplementedSelected = computed(() =>
  [...implementedCodes.value].every(c => selectedCodes.value.has(c))
)
const isIndeterminate = computed(() => selectedCount.value > 0 && !allImplementedSelected.value)

const toggleItem = (code: string, checked: boolean) => {
  const next = new Set(selectedCodes.value)
  if (checked) next.add(code)
  else next.delete(code)
  selectedCodes.value = next
}

const handleCheckAll = (checked: boolean) => {
  if (checked) {
    selectedCodes.value = new Set(implementedCodes.value)
  } else {
    selectedCodes.value = new Set()
  }
}

// ==================== 类型工具 + 节点类（结果树展示）====================
const getTypeName = (data: unknown): string => {
  const _typeStr = Object.prototype.toString.call(data)
  return _typeStr.slice(8, -1).toLowerCase()
}

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
    const pNode = new GeoInfoNode(idx !== undefined ? `顶点 #${idx}` : "顶点", [], 'Point', coordinates)
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
  const geoTypeName = GeomUtils.getTypeName(geoType)
  const node = new GeoInfoNode(`要素 #${_idx}`, [geoInfoNode])
  node.label2 = geoTypeName
  node.geometry = feature.geometry as unknown as Record<string, unknown>
  node.sourceFeature = feature
  return node
}

// ==================== 校验算法（已有实现，保留）====================
function findMultiPolygonInterseciont(coordinates: Position[][][]) {
  const numPolygons = coordinates.length
  const intersections: GeoFeature[] = []
  for (let i = 0; i < numPolygons; i++) {
    for (let j = i + 1; j < numPolygons; j++) {
      const polygon1 = turf.polygon(coordinates[i])
      const polygon2 = turf.polygon(coordinates[j])
      const intersection = turf.intersect(turf.featureCollection([polygon1, polygon2]))
      if (intersection) intersections.push(intersection)
    }
  }
  intersections.forEach(errFea => {
    if (!errFea.properties) errFea.properties = {}
    errFea.properties!.name = "面内自相交"
  })
  return intersections
}

function findRingsInterseciont(rings: Position[][]) {
  const numRings = rings.length
  const intersections: GeoFeature[] = []
  for (let i = 0; i < numRings; i++) {
    for (let j = i + 1; j < numRings; j++) {
      const polygon1 = turf.lineString(rings[i])
      const polygon2 = turf.lineString(rings[j])
      const intersection = turf.lineIntersect(polygon1, polygon2)
      if (intersection?.features) {
        intersections.push(...intersection.features)
      } else {
        intersections.push(...(intersection as unknown as GeoJSON.FeatureCollection).features)
      }
    }
  }
  intersections.forEach(errFea => {
    if (!errFea.properties) errFea.properties = {}
    errFea.properties!.name = "面内环自相交"
  })
  return intersections
}

function findRingSelfIntersections(coordinates: Position[]) {
  const numSegments = coordinates.length - 1
  const intersections: number[][] = []
  for (let i = 0; i < numSegments; i++) {
    for (let j = i + 1; j < numSegments; j++) {
      const segment1 = turf.lineString([coordinates[i], coordinates[i + 1]])
      const segment2 = turf.lineString([coordinates[j], coordinates[j + 1]])
      const intersection = turf.lineIntersect(segment1, segment2)
      for (const feature of intersection.features) {
        const { geometry: { coordinates: intCoord } } = feature as GeoFeature<GeoPoint>
        if (
          !(intCoord[0] === coordinates[i][0] && intCoord[1] === coordinates[i][1]) &&
          !(intCoord[0] === coordinates[i + 1][0] && intCoord[1] === coordinates[i + 1][1]) &&
          !(intCoord[0] === coordinates[j][0] && intCoord[1] === coordinates[j][1]) &&
          !(intCoord[0] === coordinates[j + 1][0] && intCoord[1] === coordinates[j + 1][1])
        ) {
          intersections.push(intCoord)
        }
      }
    }
  }
  if (intersections.length > 0) {
    const errFea = turf.multiPoint(intersections)
    if (!errFea.properties) errFea.properties = {}
    errFea.properties!.name = "环自相交"
    return [errFea]
  } else {
    return []
  }
}

const validHandlers: Record<string, (coordinates: unknown) => GeoFeature[]> = {
  "LineString": (coordinates: unknown) => findRingSelfIntersections(coordinates as number[][]),
  "MultiLineString": (coordinates: unknown) => (coordinates as number[][][]).map(line => findRingSelfIntersections(line)).flat(),
  "Polygon": (coordinates: unknown) => {
    const coords = coordinates as number[][][]
    const reuslt: GeoFeature[] = []
    const ringNum = coords.length
    if (ringNum === 1) {
      return findRingSelfIntersections(coords[0])
    }
    reuslt.push(...findRingsInterseciont(coords))
    const shell = turf.polygon([coords[0]])
    for (let i = 1; i < ringNum; i++) {
      const hole = turf.polygon([coords[i]])
      if (!turf.booleanContains(shell, hole)) {
        hole.properties!.name = "洞不在壳内"
        reuslt.push(hole)
      }
    }
    if (ringNum > 3) {
      for (let i = 1; i < ringNum; i++) {
        for (let j = i + 1; j < ringNum; j++) {
          const hole1 = turf.polygon([coords[i]])
          const hole2 = turf.polygon([coords[j]])
          if (turf.booleanIntersects(hole1, hole2)) {
            let intersect = turf.intersect(turf.featureCollection([hole1, hole2]))
            if (intersect) {
              intersect.properties!.name = "洞与洞相交"
              reuslt.push(intersect)
            }
          }
        }
      }
    }
    return reuslt
  },
  "MultiPolygon": (coordinates: unknown) => {
    const coords = coordinates as number[][][][]
    const reuslt: GeoFeature[] = []
    coords.forEach(polygon => {
      const re = validHandlers["Polygon"](polygon)
      reuslt.push(...re)
    })
    reuslt.push(...findMultiPolygonInterseciont(coords))
    return reuslt
  }
}

// ==================== 执行校验 + 图层管理 ====================
/** 单个检查项的校验结果 */
interface ItemResult {
  item: ValidationItem
  features: GeoFeature[]
  visible: boolean
  color: { fill: string; stroke: string }
}

const itemResults = ref<ItemResult[]>([])
const selectedResultCode = ref<string | null>(null)
const totalErrorCount = computed(() => itemResults.value.reduce((sum, r) => sum + r.features.length, 0))

/** 收集所有已实现算法的原始结果 */
function runAllImplementedAlgorithms(): GeoFeature[] {
  return props.data.features.map(f => {
    const gType = f.geometry.type as string
    if (validHandlers[gType]) {
      return Reflect.apply(validHandlers[gType], null, [(f.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates]) as GeoFeature[]
    }
    return []
  }).flat().flat().filter((x): x is GeoFeature => !!x)
}

/** 按勾选的检查项分组结果 */
function groupResultsByItem(allResults: GeoFeature[]): ItemResult[] {
  const results: ItemResult[] = []
  for (const item of VALIDATION_ITEMS) {
    if (!selectedCodes.value.has(item.code) || !item.matchNames) continue
    const matchNames = new Set(item.matchNames)
    const features = allResults.filter(f => matchNames.has((f.properties?.name as string) ?? ''))
    if (features.length === 0) continue
    results.push({
      item,
      features,
      visible: true,
      color: TOPO_ERROR_COLORS[item.code] || { fill: 'rgba(224,124,124,0.35)', stroke: '#e07c7c' },
    })
  }
  return results
}

/** 将错误要素添加到对应的拓扑错误图层 */
function addErrorLayers(results: ItemResult[]) {
  if (!props.instanceId) return
  for (const result of results) {
    const layerName = `${TOPO_ERR_LAYER_PREFIX}${result.item.code}`
    const event = new GisMapAddFeaturesEvent(
      result.features as unknown as GeoJSON.Feature[],
      { layerName, clear: true }
    )
    eventBus.emit(`${props.instanceId}`, event)
  }
}

/** 清除所有拓扑错误图层 */
function clearAllErrorLayers() {
  if (!props.instanceId) return
  for (const result of itemResults.value) {
    const layerName = `${TOPO_ERR_LAYER_PREFIX}${result.item.code}`
    eventBus.emit(`${props.instanceId}`, {
      event_type: 'map-event:clean-layer',
      options: {},
      params: [layerName]
    })
  }
}

/** 切换单个检查项的图层可见性 */
function toggleResultVisible(result: ItemResult) {
  result.visible = !result.visible
  if (!props.instanceId) return
  const layerName = `${TOPO_ERR_LAYER_PREFIX}${result.item.code}`
  eventBus.emit(`${props.instanceId}`, {
    event_type: 'map-event:set-layer-visibility',
    options: {},
    params: [layerName, result.visible]
  })
}

const handleValid = () => {
  if (selectedCount.value === 0) {
    ElMessage.warning('请至少勾选一个检查项')
    return
  }
  busy.value = true
  Common.timeout(() => {
    try {
      clearAllErrorLayers()
      const allResults = runAllImplementedAlgorithms()
      const grouped = groupResultsByItem(allResults)
      itemResults.value = grouped
      selectedResultCode.value = grouped.length > 0 ? grouped[0].item.code : null
      addErrorLayers(grouped)
      phase.value = 'result'
      logger.info('[Validator] 校验完成', { total: allResults.length, items: grouped.length })
      if (grouped.length === 0) {
        ElMessage.success('数据无错误，校验通过')
      }
    } catch (e) {
      logger.error('数据校验失败:', e)
      ElMessage.error("数据校验失败")
    }
    busy.value = false
  }, 500)
}

/** 重新检查：回到勾选阶段，保留勾选状态，清除错误图层 */
const handleRecheck = () => {
  clearAllErrorLayers()
  phase.value = 'config'
  itemResults.value = []
  selectedResultCode.value = null
}

/** 回到初始：清空结果和勾选，恢复默认，清除错误图层 */
const handleReset = () => {
  clearAllErrorLayers()
  phase.value = 'config'
  itemResults.value = []
  selectedResultCode.value = null
  selectedCodes.value = new Set(VALIDATION_ITEMS.filter(i => i.implemented).map(i => i.code))
}

// ==================== 结果树（当前选中检查项的错误详情）====================
const currentResult = computed(() => itemResults.value.find(r => r.item.code === selectedResultCode.value) ?? null)

const validResultTreeData: Ref<GeoInfoNode[] | undefined> = ref(undefined)
watch(currentResult, (result) => {
  if (result && result.features.length > 0) {
    const geoInfoNode = new GeoInfoNode(
      result.item.name,
      result.features.map((f, _idx) => inspectFeature(f as unknown as GeoJSON.Feature, _idx))
    )
    geoInfoNode.id = 'root'
    geoInfoNode.label2 = `${result.features.length} 项`
    geoInfoNode.geometry = {
      type: "GeometryCollection",
      geometries: result.features.map(x => x.geometry)
    }
    validResultTreeData.value = [geoInfoNode]
  } else {
    validResultTreeData.value = undefined
  }
}, { deep: true, immediate: true })

// 默认展开的类别（仅展开有已实现项的类别）
const activeCategories = ref<string[]>(
  categoryList.value.filter(c => c.implementedCount > 0).map(c => c.key)
)

// ==================== 节点交互 ====================
const flashGeometries = (geometries: Record<string, unknown>[]) => {
  if (!props.instanceId) return
  const addFeaturesEvent = new GisMapflashFeaturesEvent(geometries.map(x => {
    return {
      type: "Feature" as const,
      geometry: x as unknown as GeoJSON.Geometry,
      properties: {} as GeoJsonProperties,
    } satisfies GeoJSON.Feature
  }))
  eventBus.emit(`${props.instanceId}`, addFeaturesEvent)
}

const handleTreeNodeClick = (data: GeoInfoNode) => {
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}

// 组件卸载时清除所有错误图层
onBeforeUnmount(() => {
  clearAllErrorLayers()
})
</script>

<template>
  <div v-loading="busy" class="gis-data-validator">
    <!-- ============ 阶段1：勾选检查项 ============ -->
    <template v-if="phase === 'config'">
      <div class="validator-config">
        <div class="config-header">
          <el-checkbox :model-value="allImplementedSelected" :indeterminate="isIndeterminate" @change="handleCheckAll">
            全选已实现
          </el-checkbox>
          <span class="config-summary">已选 {{ selectedCount }} 项</span>
        </div>

        <div class="config-list">
          <el-collapse v-model="activeCategories">
            <el-collapse-item v-for="cat in categoryList" :key="cat.key" :name="cat.key">
              <template #title>
                <div class="cat-title">
                  <span class="cat-name">{{ cat.title }}</span>
                  <el-tag size="small" type="info" effect="plain" round>{{ cat.implementedCount }}/{{ cat.items.length }}</el-tag>
                </div>
              </template>
              <div class="check-items">
                <div v-for="item in cat.items" :key="item.code" class="check-item" :class="{ disabled: !item.implemented }">
                  <el-checkbox
                    :model-value="selectedCodes.has(item.code)"
                    :disabled="!item.implemented"
                    @change="(val: boolean) => toggleItem(item.code, val)"
                  >
                    <span class="item-name">{{ item.name }}</span>
                  </el-checkbox>
                  <el-tag v-if="!item.implemented" size="small" type="info" effect="plain" class="item-tag">待实现</el-tag>
                  <el-tag v-else size="small" type="success" effect="plain" class="item-tag">可用</el-tag>
                  <el-tooltip v-if="item.description" :content="item.description" placement="top">
                    <el-icon class="item-tip"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="config-footer">
          <el-button type="primary" size="small" :disabled="selectedCount === 0" :loading="busy" @click="handleValid">
            执行校验
          </el-button>
        </div>
      </div>
    </template>

    <!-- ============ 阶段2：查看结果 ============ -->
    <template v-else>
      <div class="validator-result">
        <div class="result-header">
          <span class="result-summary">
            共 <strong>{{ totalErrorCount }}</strong> 个错误 · {{ itemResults.length }} 项未通过
          </span>
        </div>

        <!-- 未通过检查项列表 -->
        <div class="result-items">
          <div
            v-for="result in itemResults"
            :key="result.item.code"
            class="result-item"
            :class="{ active: selectedResultCode === result.item.code }"
            @click="selectedResultCode = result.item.code"
          >
            <el-checkbox :model-value="result.visible" @change="toggleResultVisible(result)" @click.stop />
            <span class="color-dot" :style="{ background: result.color.stroke }"></span>
            <span class="item-label">{{ result.item.name }}</span>
            <el-tag size="small" type="danger" effect="plain" round class="item-count">{{ result.features.length }}</el-tag>
          </div>
          <div v-if="itemResults.length === 0" class="result-empty-inline">数据无错误，校验通过</div>
        </div>

        <!-- 选中检查项的错误详情树 -->
        <div class="result-tree">
          <el-tree-v2
            v-if="validResultTreeData"
            :height="treeHeight - 220"
            :default-expanded-keys="['root']"
            :data="validResultTreeData"
            :props="{ label: 'label', children: 'children' }"
            :highlight-current="false"
            :check-on-click-node="true"
            :expand-on-click-node="false"
            node-key="id"
            @node-click="handleTreeNodeClick"
          >
            <template #default="{ data: nodeData }">
              <span v-if="nodeData" :class="`custom-tree-node error ${nodeData.disabled ? 'disabled' : ''}`">
                <GeoTypeIconRender v-if="nodeData.geoType" :type="nodeData.geoType" :size="13" />
                <span class="key">{{ nodeData.label }}</span>
                <el-tag v-if="nodeData.label2" size="small" type="danger" effect="plain" round class="label2">
                  {{ nodeData.label2 }}
                </el-tag>
                <span v-if="nodeData.value !== undefined" :class="`val-${nodeData.typeName}`">{{ nodeData.value }}</span>
              </span>
            </template>
          </el-tree-v2>
          <div v-else class="result-empty">
            <el-icon :size="32" color="var(--el-color-success)"><CircleCheck /></el-icon>
            <p>选择上方检查项查看错误详情</p>
          </div>
        </div>

        <div class="result-footer">
          <el-button size="small" @click="handleReset">回到初始</el-button>
          <el-button type="primary" size="small" @click="handleRecheck">重新检查</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gis-data-validator {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  box-sizing: border-box;
  overflow: hidden;
}

/* ============ 阶段1：配置 ============ */
.validator-config {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.config-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.config-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.cat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.cat-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.check-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 4px 4px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.check-item:hover {
  background: var(--el-fill-color-light);
}

.check-item.disabled {
  opacity: 0.55;
}

.check-item .item-name {
  font-size: 12px;
}

.check-item .item-tag {
  flex-shrink: 0;
}

.item-tip {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  cursor: help;
}

.config-footer {
  display: flex;
  justify-content: center;
  padding: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* ============ 阶段2：结果 ============ */
.validator-result {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.result-header {
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.result-summary {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.result-summary strong {
  color: var(--el-color-danger);
  font-size: 15px;
  margin: 0 2px;
}

/* 未通过检查项列表 */
.result-items {
  flex-shrink: 0;
  max-height: 140px;
  overflow-y: auto;
  padding: 4px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover {
  background: var(--el-fill-color-light);
}

.result-item.active {
  background: var(--el-color-primary-light-9);
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color);
}

.item-label {
  flex: 1;
  font-size: 12px;
  color: var(--el-text-color-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  flex-shrink: 0;
}

.result-empty-inline {
  text-align: center;
  padding: 16px;
  color: var(--el-color-success);
  font-size: 13px;
}

/* 错误详情树 */
.result-tree {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 4px;
}

.result-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.result-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* ============ 结果树节点 ============ */
.custom-tree-node {
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.custom-tree-node .key {
  color: var(--el-text-color-primary);
}

.custom-tree-node.error .key {
  color: var(--el-color-danger);
}

.custom-tree-node .label2 {
  flex-shrink: 0;
}

.custom-tree-node.disabled .key {
  color: var(--el-text-color-secondary);
}
</style>
