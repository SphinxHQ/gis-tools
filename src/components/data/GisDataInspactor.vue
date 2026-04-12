<script setup lang="ts">

import {View} from "@element-plus/icons-vue";
import * as turf from "@turf/turf";
import {ElMessage, ElMessageBox} from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position, Feature } from "geojson";
import {ComponentInternalInstance,
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
import GisMapBlank from "~/components/gismap/GisMapBlank.vue";
import {GisMapAddFeaturesEvent, GisMapflashFeaturesEvent} from "~/components/gismap/events/GisMapEvents";
import {eventBus} from "~/composables/eventBus";


const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  }
})

const treeHeight = ref(0);
const conpomentVisiblity = ref(false);
const mapInited = ref(false);
const mapReady = ref(false); // 标记地图组件是否已注册 eventBus 监听器
const mapReloaded = ref(true);
const busy = ref(false);
const sizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const newHeight = entry.contentRect.height - 60;
    const newVisibility = newHeight > 0;

    if (newVisibility !== conpomentVisiblity.value) {
      logger.info('[Inspact] Visibility changed', {
        from: conpomentVisiblity.value,
        to: newVisibility,
        treeHeight: newHeight
      });
    }

    treeHeight.value = newHeight;
    conpomentVisiblity.value = newVisibility;
    if (conpomentVisiblity.value) {
      if (!mapInited.value) {
        logger.info('[Inspact] First time visible, initializing map');
        mapInited.value = true;
      }
    }
  }
});
const renderMapFeatures = () => {
  logger.info('[Inspact] renderMapFeatures called', {
    hasData: !!props.data?.features?.length,
    featuresCount: props.data?.features?.length || 0,
    curInstanceId: curInstanceId.value,
    mapInited: mapInited.value,
    conpomentVisiblity: conpomentVisiblity.value,
    mapReady: mapReady.value
  });

  if (!props.data?.features?.length) {
    logger.warn('[Inspact] renderMapFeatures skipped: no data');
    return;
  }

  if (!curInstanceId.value) {
    logger.warn('[Inspact] renderMapFeatures skipped: no instanceId');
    return;
  }

  if (!mapReady.value) {
    logger.warn('[Inspact] renderMapFeatures skipped: map not ready');
    return;
  }

  nextTick(() => {
    validResult.value = [];
    props.data.features.forEach((f, _idx) => {
      (f as GeoJSON.Feature & { label?: number }).label = _idx;
    });
    const addFeaturesEvent = new GisMapAddFeaturesEvent(props.data.features, {clear: true});
    logger.info('[Inspact] Emitting GisMapAddFeaturesEvent', {
      instanceId: curInstanceId.value,
      featuresCount: props.data.features.length
    });
    eventBus.emit(`${curInstanceId.value}`, addFeaturesEvent);
  });
}
const epsgCode = ref<number | undefined>(undefined);
watch(() => props.data?.crs, (newCrs) => {
  if (newCrs) {
    epsgCode.value = newCrs.epsgCode;
    mapReloaded.value = false;
    Common.timeout(() => {
      mapReloaded.value = true;
      if (mapReady.value) {
        renderMapFeatures();
      }
    }, 500);
  } else {
    epsgCode.value = undefined;
  }
}, {deep: true, immediate: true})
const curInstanceId = ref(0);
const mapComponentReady = ref(false); // 地图组件是否已注册监听器

onMounted(() => {
  const currentInstance: ComponentInternalInstance | null = getCurrentInstance();
  logger.info('[Inspact] onMounted', {
    hasInstance: !!currentInstance,
    hasElement: !!currentInstance?.vnode.el,
    hasData: !!props.data?.features?.length,
    featuresCount: props.data?.features?.length || 0
  });

  if (currentInstance?.vnode.el) {
    curInstanceId.value = currentInstance.uid;
    treeHeight.value = currentInstance.vnode.el.clientHeight;
    sizeObserver.observe(currentInstance.vnode.el as Element)

    logger.info('[Inspact] onMounted initialized', {
      curInstanceId: curInstanceId.value,
      treeHeight: treeHeight.value
    });

    // 如果已有数据且组件可见，设置状态
    if (treeHeight.value > 0 && props.data?.features?.length) {
      conpomentVisiblity.value = true;
      mapInited.value = true;
    }

    // 立即注册 map-ready 事件监听器
    const instanceId = currentInstance.uid;
    const mapReadyHandler = () => {
      logger.info('[Inspact] Received map ready event for instance:', instanceId);
      mapComponentReady.value = true;
      mapReady.value = true;
      // 如果有待加载的数据，现在加载
      if (props.data?.features?.length) {
        renderMapFeatures();
      }
    };
    eventBus.on(`${instanceId}`, 'map-ready', mapReadyHandler);
  }
})
onBeforeUnmount(() => {
  sizeObserver.disconnect()
})

const isPrimitive = (data: unknown): boolean => {
  const _type = Object.prototype.toString.call(data);
  const _primitives = ["[object String]", "[object Number]", "[object Boolean]", "[object Null]", "[object Undefined]"];
  return _primitives.includes(_type);
}
const getTypeName = (data: unknown): string => {
  const _typeStr = Object.prototype.toString.call(data);
  return _typeStr.slice(8, -1).toLowerCase();
}

class TNode {
  label: string;
  children: TNode[];
  value?: unknown;
  id?: string;
  typeName?: string;
  schema?: unknown;

  constructor(_label: string, _value?: unknown) {
    this.label = _label;
    this.value = _value;
    this.children = [];
    this.id = Math.random().toString(36).slice(2);
    this.typeName = getTypeName(_value);
  }

}

const jsonTreeView = (node: TNode, data: unknown): TNode => {
  if (Array.isArray(data)) {
    node.typeName = getTypeName(data);
    (data as unknown[]).forEach((item, _idx) => {
      if (isPrimitive(item)) {
        node.children.push(new TNode(`${_idx}`, item))
      } else {
        const newNode = markRaw(new TNode(`${_idx}`));
        jsonTreeView(newNode, item);
        node.children.push(newNode)
      }
    })
  } else if (typeof data === 'object' && data !== null) {
    for (let key in data as Record<string, unknown>) {
      const val = (data as Record<string, unknown>)[key]
      if (isPrimitive(val)) {
        node.children.push(new TNode(`${key}`, val))
      } else {
        const newNode = markRaw(new TNode(key));
        jsonTreeView(newNode, val);
        node.children.push(newNode)
      }
    }
  }
  return node
}

const theTree: Ref<unknown> = ref(null);

const geoJsonTreeData: Ref<TNode[] | undefined> = ref(undefined);
watch(props, () => {
  if (props.data?.features?.length > 0) {
    const treeView = jsonTreeView(markRaw(new TNode("root")), props.data.features);
    geoJsonTreeData.value = [treeView]
  } else {
    geoJsonTreeData.value = undefined
  }
}, {deep: true, immediate: true})


class GeoInfoNode {
  label: string;
  label2?: string;
  geoType?: string;
  geoData?: unknown;
  typeName?: string;
  children: GeoInfoNode[];
  value?: unknown;
  id?: string;
  disabled: boolean = false;
  geometry?: Record<string, unknown>;

  constructor(_label: string, _children?: GeoInfoNode[], _geoType?: string, _geoData?: unknown) {
    this.label = _label;
    this.children = [];
    this.id = Math.random().toString(36).slice(2);
    this.geoType = _geoType;
    this.geoData = _geoData;
    if (_children) {
      this.children.push(..._children);
    }
  }
}

const inspector: Record<string, (coordinates: unknown[], idx?: number) => GeoInfoNode> = {
  "Point": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const coords = coordinates as number[];
    const xNode = new GeoInfoNode(`X`);
    xNode.value = coords[0];
    xNode.typeName = getTypeName(coords[0]);
    const yNode = new GeoInfoNode(`Y`);
    yNode.value = coords[1];
    yNode.typeName = getTypeName(coords[1]);
    const pNode = new GeoInfoNode("点", [], 'Point', coordinates);
    pNode.label2 = `${idx ?? 0}`
    pNode.geometry = {
      type: "Point",
      coordinates: coordinates
    }
    return pNode;
  },
  "LineString": (coordinates: unknown[]): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode("线", (coordinates as unknown[]).map((c: unknown) => inspector.Point(c as unknown[])), 'LineString', coordinates)
    geoInfoNode.geometry = {
      type: "LineString",
      coordinates: coordinates
    }
    return geoInfoNode;
  },
  "Polygon": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNodes = [];
    const rings = coordinates as unknown[][];
    for (let i = 0; i < rings.length; i++) {
      const node = new GeoInfoNode("环", rings[i].map((c: unknown) => inspector.Point(c as unknown[])))
      node.label2 = `${idx ?? 0}: ${i === 0 ? "外部环" : "内部环"}`;
      node.geometry = {
        type: "LineString",
        coordinates: rings[i] as unknown[]
      }
      geoInfoNodes.push(node)
    }
    const pNode = new GeoInfoNode("面", geoInfoNodes, 'Polygon', coordinates);
    pNode.label2 = `${idx ?? 0} : ${rings.length > 1 ? "含岛洞" : "无岛洞"}`;
    pNode.geometry = {
      type: "Polygon",
      coordinates: coordinates
    }
    return pNode;
  },
  "MultiPoint": (coordinates: unknown[]): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode("多点", (coordinates as unknown[]).map((c: unknown) => inspector.Point(c as unknown[])), 'MultiPoint', coordinates)
    geoInfoNode.geometry = {
      type: "MultiPoint",
      coordinates: coordinates
    }
    return geoInfoNode;
  },
  "MultiLineString": (coordinates: unknown[]): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode("多线", (coordinates as unknown[]).map((c: unknown) => inspector.LineString(c as unknown[])), 'MultiLineString', coordinates)
    geoInfoNode.geometry = {
      type: "MultiLineString",
      coordinates: coordinates
    }
    return geoInfoNode;
  },
  "MultiPolygon": (coordinates: unknown[]): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode("多面", (coordinates as unknown[]).map((c: unknown) => inspector.Polygon(c as unknown[])), 'MultiPolygon', coordinates);
    geoInfoNode.label2 = `面数:${coordinates.length}`
    geoInfoNode.geometry = {
      type: "MultiPolygon",
      coordinates: coordinates
    }
    return geoInfoNode;
  }
}
const inspectFeature = (feature: GeoJSON.Feature, _idx: number = 0): GeoInfoNode => {

  // 处理 geometry 为 null 或 undefined 的情况
  if (!feature.geometry) {
    const nullNode = new GeoInfoNode("空几何");
    nullNode.label2 = `${_idx}`;
    const node = new GeoInfoNode("要素对象", [nullNode]);
    node.label2 = `${_idx} : 无几何`;
    return node;
  }

  const geoType: string = feature.geometry.type;
  let handleFun = inspector[geoType];
  if (!handleFun) {
    handleFun = () => new GeoInfoNode("未知几何类型:" + geoType)
  }
  const geoInfoNode = handleFun(feature.geometry.coordinates as unknown[], _idx);

  const properties = feature.properties;
  const propertyInfoNode = new GeoInfoNode("属性数据");
  propertyInfoNode.disabled = true;
  if (properties) {
    for (const key in properties) {
      const val = properties[key];
      const node = new GeoInfoNode(key);
      node.value = val;
      node.typeName = getTypeName(val);
      if (node.typeName === "string") {
        node.value = `"${node.value}"`;
      } else if (!isPrimitive(val)) {
        node.value = `[${node.typeName}]`;
      }
      propertyInfoNode.children.push(node);
      propertyInfoNode.disabled = false;
    }
  }

  const geoTypeName = GeomUtils.getTypeName(geoType);
  const node = new GeoInfoNode("要素对象", [geoInfoNode, propertyInfoNode]);
  node.label2 = `${_idx} : ${geoTypeName}`;
  node.geometry = feature.geometry as Record<string, unknown>;
  return node;
}

const geoJsonTreeData2: Ref<GeoInfoNode[] | undefined> = ref(undefined);

watch(() => props.data, (newData, oldData) => {
  logger.info('[Inspact] props.data watch triggered', {
    hasNewData: !!newData,
    newFeaturesCount: newData?.features?.length || 0,
    oldFeaturesCount: oldData?.features?.length || 0,
    mapInited: mapInited.value,
    conpomentVisiblity: conpomentVisiblity.value,
    mapReady: mapReady.value
  });

  if (newData?.features?.length) {
    // 生成树形数据
    const children = newData.features
      .map((f, _idx) => inspectFeature(f, _idx))
      .filter((node): node is GeoInfoNode => node !== undefined);
    const geoInfoNode = new GeoInfoNode("要素集合", children);
    geoInfoNode.id = 'root';
    geoInfoNode.label2 = `总数:${newData.features.length}`;
    geoInfoNode.geometry = {
      type: "GeometryCollection",
      geometries: newData.features.filter(f => f.geometry).map(x => x.geometry)
    };
    geoJsonTreeData2.value = [geoInfoNode];

    // 只有在地图准备好后才加载数据
    if (mapReady.value) {
      logger.info('[Inspact] Map ready, loading features');
      renderMapFeatures();
    } else {
      logger.info('[Inspact] Map not ready yet, will load after map initializes');
    }
  } else {
    geoJsonTreeData2.value = undefined;
  }
}, {deep: true, immediate: true})
const flashGeometries = (geometries: Record<string, unknown>[]) => {
  logger.info('[Inspact] flashGeometries called', {
    geometriesCount: geometries.length,
    curInstanceId: curInstanceId.value
  });

  const addFeaturesEvent = new GisMapflashFeaturesEvent(geometries.map(x => {
    return {
      type: "Feature",
      geometry: x,
    }
  }));
  eventBus.emit(`${curInstanceId.value}`, addFeaturesEvent);
}

const handleTreeNodeView = (data: GeoInfoNode) => {
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}
const activeName = ref('first');

function findMultiPolygonInterseciont(coordinates: Position[][][]) {
  const numPolygons = coordinates.length;
  const intersections: GeoFeature[] = [];
  for (let i = 0; i < numPolygons; i++) {
    for (let j = i + 1; j < numPolygons; j++) {
      const polygon1 = turf.polygon(coordinates[i]);
      const polygon2 = turf.polygon(coordinates[j]);

      const intersection = turf.intersect(turf.featureCollection([polygon1, polygon2]));
      if (intersection) intersections.push(intersection)
    }
  }
  intersections.forEach(errFea => {
    if (!errFea.properties) {
      errFea.properties = {}
    }
    errFea.properties!.name = "面内自相交";
  })
  return intersections;
}

function findRingsInterseciont(rings: Position[][]) {
  const numRings = rings.length;
  const intersections: GeoFeature[] = [];
  for (let i = 0; i < numRings; i++) {
    for (let j = i + 1; j < numRings; j++) {

      const polygon1 = turf.lineString(rings[i]);
      const polygon2 = turf.lineString(rings[j]);

      const intersection = turf.lineIntersect(polygon1, polygon2);
      if (intersection?.features) {
        intersections.push(...intersection.features)
      } else {
        intersections.push(...(intersection as unknown as GeoJSON.FeatureCollection).features)
      }
    }
  }
  intersections.forEach(errFea => {
    if (!errFea.properties) {
      errFea.properties = {}
    }
    errFea.properties!.name = "面内环自相交";
  })
  return intersections;
}

function findRingSelfIntersections(coordinates: Position[]) {
  const numSegments = coordinates.length - 1;
  const intersections: number[][] = [];
  for (let i = 0; i < numSegments; i++) {
    for (let j = i + 1; j < numSegments; j++) {
      const segment1 = turf.lineString([coordinates[i], coordinates[i + 1]]);
      const segment2 = turf.lineString([coordinates[j], coordinates[j + 1]]);

      const intersection = turf.lineIntersect(segment1, segment2);
      for (let feature of intersection.features) {
        const {geometry: {coordinates: intCoord}} = feature as GeoFeature<GeoPoint>;
        if (
            !(intCoord[0] === coordinates[i][0] && intCoord[1] === coordinates[i][1]) &&
            !(intCoord[0] === coordinates[i + 1][0] && intCoord[1] === coordinates[i + 1]    [1]) &&
            !(intCoord[0] === coordinates[j][0] && intCoord[1] === coordinates[j][1]) &&
            !(intCoord[0] === coordinates[j + 1][0] && intCoord[1] === coordinates[j + 1][1])
        ) {
          intersections.push(intCoord);
        }
      }
    }
  }
  if (intersections.length > 0) {
    const errFea = turf.multiPoint(intersections)
    if (!errFea.properties) {
      errFea.properties = {}
    }
    errFea.properties!.name = "环自相交";
    return [errFea];
  } else {
    return []
  }
}

const validHandlers: Record<string, (coordinates: unknown) => GeoFeature[]> = {
  "LineString": (coordinates: unknown) => {
    return findRingSelfIntersections(coordinates as number[][]);
  },
  "MultiLineString": (coordinates: unknown) => {
    return (coordinates as number[][][]).map(line => findRingSelfIntersections(line)).flat()
  },
  "Polygon": (coordinates: unknown) => {
    const coords = coordinates as number[][][];
    const reuslt: GeoFeature[] = [];
    const ringNum = coords.length;
    if (ringNum === 1) {
      return findRingSelfIntersections(coords[0]);
    }
    reuslt.push(...findRingsInterseciont(coords))
    const shell = turf.polygon([coords[0]]);
    for (let i = 1; i < ringNum; i++) {
      const hole = turf.polygon([coords[i]]);
      if (!turf.booleanContains(shell, hole)) {
        hole.properties!.name = "洞不在壳内";
        reuslt.push(hole)
      }
    }
    if (ringNum > 3) {
      for (let i = 1; i < ringNum; i++) {
        for (let j = i; j < ringNum; j++) {
          const hole1 = turf.polygon([coords[i]]);
          const hole2 = turf.polygon([coords[j]]);
          if (turf.booleanIntersects(hole1, hole2)) {
            let intersect = turf.intersect(turf.featureCollection([hole1, hole2]));
            if (intersect) {
              intersect.properties!.name = "洞与洞相交";
              reuslt.push(intersect)
            }
          }
        }
      }

    }
    return reuslt
  },
  "MultiPolygon": (coordinates: unknown) => {
    const coords = coordinates as number[][][][];
    const reuslt: GeoFeature[] = [];
    coords.forEach(polygon => {
      const re = validHandlers["Polygon"](polygon);
      reuslt.push(...re)
    })
    reuslt.push(...findMultiPolygonInterseciont(coords));
    return reuslt
  }
}
const validResult = ref<GeoFeature[]>([]);
const handleValid = () => {

  busy.value = true;
  Common.timeout(() => {
    try {
      validResult.value = []
      const result = props.data.features.map(f => {
        const gType = f.geometry.type as string;
        if (validHandlers[gType]) {
          let apply = Reflect.apply(validHandlers[gType], null, [f.geometry.coordinates]);
          return apply as GeoFeature[];
        } else {
          return [];
        }
      }).flat().flat().filter((x): x is GeoFeature => !!x);
      if (result.length === 0) {
        ElMessageBox.alert("数据无错误", {
          title: "系统提示",
          confirmButtonText: "确定",
          type: "success",
        });
      }
      logger.debug('validResult:', result);
      validResult.value = result;
    } catch (e) {
      logger.error('数据校验失败:', e);
      ElMessage.error("数据校验失败");
    }
    busy.value = false;
  }, 500)

}

const validResultTreeData: Ref<GeoInfoNode[] | undefined> = ref(undefined);
watch(validResult, () => {
  logger.info('[Inspact] validResult watch triggered', {
    count: validResult.value.length
  });

  if (validResult.value.length > 0) {
    const geoInfoNode = new GeoInfoNode("错误集合", validResult.value.map((f, _idx) => inspectFeature(f as unknown as { geometry: { type: string; coordinates: unknown[] }; properties: Record<string, unknown> }, _idx)));
    geoInfoNode.id = 'root';
    geoInfoNode.label2 = `总数:${validResult.value.length}`;
    geoInfoNode.geometry = {
      type: "GeometryCollection",
      geometries: validResult.value.map(x => x.geometry)
    };
    // 注意：这里不应该重置 mapInited，否则会导致地图数据丢失
    validResultTreeData.value = [geoInfoNode];
  } else {
    validResultTreeData.value = undefined;
  }
}, {deep: true, immediate: true})
</script>
<template>
  <div v-loading="!mapReloaded || busy" class="gis-data-inspector-container">
    <el-tabs v-model="activeName" :type="'border-card'" class="gis-data-inspector-tree">
      <el-tab-pane label="Struct" name="first">
        <el-tree-v2 ref="theTree" :height="treeHeight" :default-expanded-keys="['root']"
                    :data="geoJsonTreeData2"
                    :props="{ label: 'label', children: 'children' }"
                    :highlight-current="false"
                    :check-on-click-node="true"
                    :expand-on-click-node="false"
                    node-key="id"
>
          <template #default="{ data }">
            <span v-if="data" :class="`custom-tree-node ${data.disabled?'disabled':''}`">
            <span class="key">{{ data.label }}:</span>
            <span v-if="data.label2" class="label2">[{{ data.label2 }}]</span>
             <span :class="`val-${ data.typeName}`">{{ data.value }}</span>
           </span>
            <span v-if="data?.geometry!==undefined" class="node-btns"><View
                @click.stop.prevent="handleTreeNodeView(data)"
/></span>
          </template>
        </el-tree-v2>
      </el-tab-pane>
      <el-tab-pane label="validation" name="second">
        <div :style="{height:`${treeHeight-40}px`}">
          <el-tree-v2 :height="treeHeight-40" :default-expanded-keys="['root']"
                      :data="validResultTreeData"
                      :props="{ label: 'label', children: 'children' }"
                      :highlight-current="false"
                      :check-on-click-node="true"
                      :expand-on-click-node="false"
                      node-key="id"
>
            <template #default="{ data }">
            <span v-if="data" :class="`custom-tree-node error ${data.disabled?'disabled':''}`">
            <span class="key">{{ data.label }}:</span>
            <span v-if="data.label2" class="label2">[{{ data.label2 }}]</span>
             <span :class="`val-${ data.typeName}`">{{ data.value }}</span>
           </span>
              <span v-if="data?.geometry!==undefined" class="node-btns"><View
                  @click.stop.prevent="handleTreeNodeView(data)"
/></span>
            </template>
          </el-tree-v2>
        </div>
        <div style="text-align: center">
          <el-button type="primary" @click="handleValid">Run</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
    <div v-if="mapReloaded && (conpomentVisiblity||mapInited)" class="map-container">
      <gis-map-blank :map-name="`${curInstanceId}`" :options="{projection:epsgCode}" />
    </div>
  </div>
</template>

<style scoped>


.gis-data-inspector-container :deep(.custom-tree-node) {
  width: 100%;
}

.gis-data-inspector-container :deep(.custom-tree-node .key) {
  color: var(--el-color-primary-dark-2);
  padding-right: 5px;
}

.gis-data-inspector-container :deep(.custom-tree-node.error .key) {
  color: var(--el-color-danger);
}

.gis-data-inspector-container :deep(.custom-tree-node .val-string) {
  color: var(--el-color-success-dark-2);
}

.gis-data-inspector-container :deep(.custom-tree-node .val-number) {
  color: blue;
}

.gis-data-inspector-container :deep(.custom-tree-node .val-boolean) {
  color: red;
}

.gis-data-inspector-container :deep( .custom-tree-node .val-null, .custom-tree-node .val-undefined ) {
  color: #909399;
}

.gis-data-inspector-container :deep( .custom-tree-node .label2 ) {
  color: #bfc6cb;
}

.gis-data-inspector-container :deep( .custom-tree-node .type ) {
  color: #fbe792;
}

.gis-data-inspector-container :deep( .custom-tree-node.disabled * ) {
  color: #bfc6cb !important;
  cursor: not-allowed;
  pointer-events: none;
}

.gis-data-inspector-container {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  border: 1px solid #CCC;
}

.map-container {
  width: calc(100% - 240px);
  height: 100%;
  border-left: 1px solid #CCC;
  box-sizing: border-box;
}

.gis-data-inspector-tree {
  width: 240px;
}

.gis-data-inspector-tree :deep( .el-tree-node__content ) {
  justify-content: space-between;
  padding-right: 5px;
  box-sizing: border-box;
}

.node-btns {
  display: flex;
  align-items: center;
}

.node-btns svg {
  width: 14px;
  height: 14px;
  cursor: pointer;
  padding: 4px;
  color: #DDD;
}

.node-btns svg:hover {
  color: var(--el-color-primary-dark-2);
}
</style>
