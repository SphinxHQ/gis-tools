<script setup lang="ts">
/**
 * @file GIS data validator component
 * @description Provides geometry validation with visual error highlighting,
 *              coordinate inspection, and auto-fix capabilities using Turf.js.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import * as turf from "@turf/turf";
import {ElMessage, ElMessageBox} from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position } from "geojson";
import { ref, Ref, watch } from "vue";

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import GisDataInfo from "~/components/data/GisDataInfo";
import {GisMapflashFeaturesEvent} from "~/components/gismap/events/GisMapEvents";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import {eventBus} from "~/composables/eventBus";

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

// === 校验逻辑 ===
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
        const {geometry: {coordinates: intCoord}} = feature as GeoFeature<GeoPoint>
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

const validResult = ref<GeoFeature[]>([])
const busy = ref(false)

const handleValid = () => {
  busy.value = true
  Common.timeout(() => {
    try {
      validResult.value = []
      const result = props.data.features.map(f => {
        const gType = f.geometry.type as string
        if (validHandlers[gType]) {
          let apply = Reflect.apply(validHandlers[gType], null, [(f.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates])
          return apply as GeoFeature[]
        } else {
          return []
        }
      }).flat().flat().filter((x): x is GeoFeature => !!x)
      if (result.length === 0) {
        ElMessageBox.alert("数据无错误", {
          title: "系统提示",
          confirmButtonText: "确定",
          type: "success",
        })
      }
      logger.debug('validResult:', result)
      validResult.value = result
    } catch (e) {
      logger.error('数据校验失败:', e)
      ElMessage.error("数据校验失败")
    }
    busy.value = false
  }, 500)
}

const validResultTreeData: Ref<GeoInfoNode[] | undefined> = ref(undefined)
watch(validResult, () => {
  logger.info('[Validator] validResult watch triggered', {
    count: validResult.value.length
  })

  if (validResult.value.length > 0) {
    const geoInfoNode = new GeoInfoNode("校验问题", validResult.value.map((f, _idx) => inspectFeature(f as unknown as GeoJSON.Feature, _idx)))
    geoInfoNode.id = 'root'
    geoInfoNode.label2 = `${validResult.value.length} 项`
    geoInfoNode.geometry = {
      type: "GeometryCollection",
      geometries: validResult.value.map(x => x.geometry)
    }
    validResultTreeData.value = [geoInfoNode]
  } else {
    validResultTreeData.value = undefined
  }
}, { deep: true, immediate: true })

// === 节点交互 ===
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
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}
</script>

<template>
  <div v-loading="busy" class="gis-data-validator-container">
    <div class="validator-header">
      <el-button type="primary" size="small" @click="handleValid">
        <el-icon><Check /></el-icon>
        <span>执行校验</span>
      </el-button>
    </div>

    <div class="validator-tree">
      <el-tree-v2
        :height="treeHeight - 50"
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
          <span v-if="nodeData" :class="`custom-tree-node error ${nodeData.disabled?'disabled':''}`">
            <GeoTypeIconRender v-if="nodeData.geoType" :type="nodeData.geoType" :size="13" />
            <span class="key">{{ nodeData.label }}</span>
            <el-tag v-if="nodeData.label2" size="small" type="danger" effect="plain" round class="label2">
              {{ nodeData.label2 }}
            </el-tag>
            <span v-if="nodeData.value !== undefined" :class="`val-${ nodeData.typeName}`">{{ nodeData.value }}</span>
          </span>
        </template>
      </el-tree-v2>

      <div v-if="!validResultTreeData" class="validator-empty">
        <el-icon :size="32" color="var(--el-text-color-placeholder)"><CircleCheck /></el-icon>
        <p>点击「执行校验」检查数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-data-validator-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.validator-header {
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.validator-tree {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 4px;
}

.validator-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
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
