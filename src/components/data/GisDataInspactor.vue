<script setup lang="ts">

import {View} from "@element-plus/icons-vue";
import * as turf from "@turf/turf";
import {ElMessage, ElMessageBox} from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position, Feature } from "geojson";
import {ComponentInternalInstance,
  computed,
  getCurrentInstance,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  Ref,
  watch
} from "vue";
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

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
  sourceFeature?: GeoJSON.Feature;

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
  node.sourceFeature = feature;
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

const selectedNodeId = ref<string | null>(null);
const selectedNodeData = ref<GeoInfoNode | null>(null);

const getOriginalJson = (node: GeoInfoNode | null): string => {
  if (!node) return '';
  if (node.sourceFeature) {
    return JSON.stringify(node.sourceFeature, null, 2);
  }
  if (node.geometry) {
    return JSON.stringify(node.geometry, null, 2);
  }
  if (node.value !== undefined) {
    return JSON.stringify(node.value, null, 2);
  }
  return '';
};

const editedJson = ref('');
const isDirty = ref(false);

const handleEditorInput = (val: string) => {
  editedJson.value = val;
  isDirty.value = val !== getOriginalJson(selectedNodeData.value);
}

const handleJsonUpdate = () => {
  const node = selectedNodeData.value;
  if (!node) return;
  try {
    const parsed = JSON.parse(editedJson.value);
    if (node.sourceFeature && parsed.type === 'Feature') {
      // 更新 Feature 的 geometry 和 properties
      if (parsed.geometry) {
        node.sourceFeature.geometry = parsed.geometry;
        node.geometry = parsed.geometry as Record<string, unknown>;
      }
      if (parsed.properties) {
        node.sourceFeature.properties = parsed.properties;
      }
      // 重建树
      const idx = props.data.features.indexOf(node.sourceFeature);
      if (idx >= 0) {
        const newFeature = { ...node.sourceFeature } as GeoJSON.Feature;
        props.data.features[idx] = newFeature;
        node.sourceFeature = newFeature;
      }
      renderMapFeatures();
    } else if (node.geometry) {
      node.geometry = parsed as Record<string, unknown>;
      if (node.sourceFeature) {
        node.sourceFeature.geometry = parsed as GeoJSON.Geometry;
        renderMapFeatures();
      }
    }
    isDirty.value = false;
    ElMessage.success('更新成功');
  } catch (e: unknown) {
    ElMessage.error('JSON 格式错误，无法更新');
  }
}

const handleJsonCancel = () => {
  editedJson.value = getOriginalJson(selectedNodeData.value);
  isDirty.value = false;
}

const handleTreeNodeClick = (data: GeoInfoNode) => {
  selectedNodeId.value = data.id ?? null;
  selectedNodeData.value = data;
  editedJson.value = getOriginalJson(data);
  isDirty.value = false;
  if (data.geometry) {
    flashGeometries([data.geometry]);
  }
}

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
        for (let j = i + 1; j < ringNum; j++) {
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
    <Splitpanes class="default-theme">
      <Pane :size="20" :min-size="10" :max-size="40">
        <el-tabs v-model="activeName" :type="'border-card'" class="gis-data-inspector-tree">
          <el-tab-pane label="结构" name="first">
            <el-tree-v2 ref="theTree" :height="treeHeight" :default-expanded-keys="['root']"
                        :data="geoJsonTreeData2"
                        :props="{ label: 'label', children: 'children' }"
                        :highlight-current="true"
                        :check-on-click-node="true"
                        :expand-on-click-node="false"
                        node-key="id"
                        @node-click="handleTreeNodeClick"
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
          <el-tab-pane label="校验" name="second">
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
              <el-button type="primary" @click="handleValid">执行校验</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </Pane>
      <Pane v-if="activeName === 'first' && editedJson" :size="30" :min-size="15" :max-size="50">
        <div class="json-editor-container">
          <geo-str-editor :value="editedJson" :read-only="false" :minimap="false" language="json" class="json-editor-main" @input="handleEditorInput" />
          <div class="json-editor-footer">
            <el-button type="primary" size="small" :disabled="!isDirty" @click="handleJsonUpdate">更新</el-button>
            <el-button size="small" :disabled="!isDirty" @click="handleJsonCancel">取消/还原</el-button>
          </div>
        </div>
      </Pane>
      <Pane v-if="mapReloaded && (conpomentVisiblity||mapInited)" :size="50" :min-size="20">
        <div class="map-container">
          <gis-map-blank :map-name="`${curInstanceId}`" :options="{projection:epsgCode}" />
        </div>
      </Pane>
    </Splitpanes>
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
  color: var(--el-text-color-secondary);
}

.gis-data-inspector-container :deep( .custom-tree-node .label2 ) {
  color: var(--el-text-color-placeholder);
}

.gis-data-inspector-container :deep( .custom-tree-node .type ) {
  color: var(--el-color-warning);
}

.gis-data-inspector-container :deep( .custom-tree-node.disabled * ) {
  color: var(--el-text-color-placeholder) !important;
  cursor: not-allowed;
  pointer-events: none;
}

.gis-data-inspector-container {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color-lighter);
}

.gis-data-inspector-container :deep(.splitpanes) {
  height: 100%;
}

.map-container {
  height: 100%;
  box-sizing: border-box;
}

.json-editor-container {
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.json-editor-main {
  flex: 1;
  min-height: 0;
}

.json-editor-footer {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.gis-data-inspector-tree {
  height: 100%;
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
  color: var(--el-text-color-placeholder);
}

.node-btns svg:hover {
  color: var(--el-color-primary-dark-2);
}
</style>
