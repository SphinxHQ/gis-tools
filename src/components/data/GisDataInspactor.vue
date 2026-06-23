<script setup lang="ts">

import * as turf from "@turf/turf";
import {ElMessage, ElMessageBox} from "element-plus";
import type { Feature as GeoFeature, Point as GeoPoint, Position } from "geojson";
import { Splitpanes, Pane } from 'splitpanes'
import { Edit } from '@element-plus/icons-vue'
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
import 'splitpanes/dist/splitpanes.css'

import Common from "~/common/Common";
import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import GisDataInfo from "~/components/data/GisDataInfo";
import GisFeatureEditor from "~/components/data/GisFeatureEditor.vue";
import GisMapTianditu from "~/components/gismap/GisMapTianditu.vue";
import {GisMapAddFeaturesEvent, GisMapflashFeaturesEvent, GisMapStopModifyEvent} from "~/components/gismap/events/GisMapEvents";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
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
    mapReady: mapReady.value,
    isInEditMode: isInEditMode.value
  });

  if (isInEditMode.value) {
    logger.info('[Inspact] renderMapFeatures skipped: in edit mode');
    return;
  }

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
let mapReadyHandler: (() => void) | null = null;

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
    mapReadyHandler = () => {
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
  // 移除 map-ready 事件监听器
  if (mapReadyHandler && curInstanceId.value) {
    eventBus.off(`${curInstanceId.value}`, 'map-ready', mapReadyHandler)
    mapReadyHandler = null
  }
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

/**
 * 节点 label2 标签的视觉类型：根据标签文本/错误态做差异化配色
 */
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

/**
 * 把 label 拆成「名称」+「#N 编号」两部分，编号用浅色单独渲染。
 * 例如 "要素 #0" → { name: "要素", index: "#0" }
 *      "多边形 #2 · 含岛屿" → { name: "多边形 #2 · 含岛屿", index: undefined }
 *      "几何要素" → { name: "几何要素", index: undefined }
 */
const INDEX_RE = /\s*#(\d+)\s*$/
const splitLabel = (label: string): { name: string; index?: string } => {
  const m = label.match(INDEX_RE)
  if (!m) return { name: label }
  return { name: label.slice(0, m.index).trimEnd(), index: `#${m[1]}` }
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
    const xNode = new GeoInfoNode(`经度`);
    xNode.value = coords[0];
    xNode.typeName = getTypeName(coords[0]);
    const yNode = new GeoInfoNode(`纬度`);
    yNode.value = coords[1];
    yNode.typeName = getTypeName(coords[1]);
    const pNode = new GeoInfoNode(
      idx !== undefined ? `顶点 #${idx}` : "顶点",
      [],
      'Point',
      coordinates,
    );
    pNode.label2 = idx !== undefined ? `#${idx}` : undefined;
    pNode.geometry = {
      type: "Point",
      coordinates: coordinates
    }
    return pNode;
  },
  "LineString": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `折线 #${idx}` : "折线",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Point(c as unknown[], i)),
      'LineString',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 节点`
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
      const isOuter = i === 0
      const node = new GeoInfoNode(
        `${isOuter ? "外环" : "内环"} #${i}`,
        rings[i].map((c: unknown, j: number) => inspector.Point(c as unknown[], j)),
      )
      node.label2 = `${rings[i].length} 顶点`
      node.geometry = {
        type: "LineString",
        coordinates: rings[i] as unknown[]
      }
      geoInfoNodes.push(node)
    }
    const pNode = new GeoInfoNode(
      idx !== undefined
        ? (rings.length > 1 ? `多边形 · 含岛屿 #${idx}` : `多边形 #${idx}`)
        : (rings.length > 1 ? "多边形 · 含岛屿" : "多边形"),
      geoInfoNodes,
      'Polygon',
      coordinates,
    );
    pNode.label2 = `${rings.length} 环 · ${rings.reduce((acc, r) => acc + (r as unknown[]).length, 0)} 顶点`
    pNode.geometry = {
      type: "Polygon",
      coordinates: coordinates
    }
    return pNode;
  },
  "MultiPoint": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多点集 #${idx}` : "多点集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Point(c as unknown[], i)),
      'MultiPoint',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 个点`
    geoInfoNode.geometry = {
      type: "MultiPoint",
      coordinates: coordinates
    }
    return geoInfoNode;
  },
  "MultiLineString": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多线集 #${idx}` : "多线集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.LineString(c as unknown[], i)),
      'MultiLineString',
      coordinates,
    )
    geoInfoNode.label2 = `${(coordinates as unknown[]).length} 条折线`
    geoInfoNode.geometry = {
      type: "MultiLineString",
      coordinates: coordinates
    }
    return geoInfoNode;
  },
  "MultiPolygon": (coordinates: unknown[], idx?: number): GeoInfoNode => {
    const geoInfoNode = new GeoInfoNode(
      idx !== undefined ? `多面集 #${idx}` : "多面集",
      (coordinates as unknown[]).map((c: unknown, i: number) => inspector.Polygon(c as unknown[], i)),
      'MultiPolygon',
      coordinates,
    );
    geoInfoNode.label2 = `${coordinates.length} 个多边形`
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
    const node = new GeoInfoNode(`要素 #${_idx}`, [nullNode]);
    node.label2 = "无几何";
    return node;
  }

  const geoType: string = feature.geometry.type;
  let handleFun = inspector[geoType];
  if (!handleFun) {
    handleFun = () => new GeoInfoNode("未知几何类型:" + geoType)
  }
  const geoInfoNode = handleFun((feature.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates as unknown[], _idx);

  const properties = feature.properties;
  const propertyInfoNode = new GeoInfoNode("属性");
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
  const node = new GeoInfoNode(`要素 #${_idx}`, [geoInfoNode, propertyInfoNode]);
  node.label2 = geoTypeName;
  node.geometry = feature.geometry as unknown as Record<string, unknown>;
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
    const geoInfoNode = new GeoInfoNode("几何要素", children);
    geoInfoNode.id = 'root';
    geoInfoNode.label2 = `${newData.features.length} 项`;
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
  if (!node) return ''
  // 默认格式化（带 2 空格缩进），方便在编辑器中阅读与编辑
  if (node.sourceFeature) return JSON.stringify(node.sourceFeature, null, 2)
  if (node.geometry) return JSON.stringify(node.geometry, null, 2)
  if (node.value !== undefined) return JSON.stringify(node.value, null, 2)
  return ''
};

const editedJson = ref('')
const isDirty = ref(false)
/**
 * 当前正在编辑的节点：点击哪个节点的【编辑】按钮就编辑哪个节点，
 * 关闭弹窗前始终只操作这一个节点，不再依赖 selectedNodeData。
 */
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
      .catch(() => {
        // 继续编辑
      })
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
      // 更新 Feature 的 geometry 和 properties
      if (parsed.geometry) {
        node.sourceFeature.geometry = parsed.geometry
        node.geometry = parsed.geometry as Record<string, unknown>
      }
      if (parsed.properties) {
        node.sourceFeature.properties = parsed.properties
      }
      // 重建树
      const idx = props.data.features.indexOf(node.sourceFeature)
      if (idx >= 0) {
        const newFeature = { ...node.sourceFeature } as GeoJSON.Feature
        // eslint-disable-next-line vue/no-mutating-props
        props.data.features[idx] = newFeature
        node.sourceFeature = newFeature
      }
      renderMapFeatures()
    } else if (node.geometry) {
      node.geometry = parsed as Record<string, unknown>
      if (node.sourceFeature) {
        node.sourceFeature.geometry = parsed as GeoJSON.Geometry
        renderMapFeatures()
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
      type: "Feature" as const,
      geometry: x as unknown as GeoJSON.Geometry,
      properties: {} as GeoJSON.GeoJsonProperties,
    } satisfies GeoJSON.Feature;
  }));
  eventBus.emit(`${curInstanceId.value}`, addFeaturesEvent);
}

const handleTreeNodeView = (data: GeoInfoNode) => {
  if (data.geometry) {
    flashGeometries([data.geometry])
  }
}
const activeName = ref('first');
const isInEditMode = ref(false);

const handleTabChange = (tab: string) => {
  if (tab === 'third') {
    // 进入要素列表：激活编辑器（渲染编辑层+影子层）
    isInEditMode.value = true;
    featureEditorRef.value?.activate();
  } else {
    // 离开要素列表
    if (isInEditMode.value) {
      isInEditMode.value = false;
      // 1. 停止地图编辑交互，清空编辑层，恢复输入层
      if (curInstanceId.value) {
        eventBus.emit(`${curInstanceId.value}`, new GisMapStopModifyEvent());
        // 同步清空影子层（stopModify 不清影子层，需单独清理）
        eventBus.emit(`${curInstanceId.value}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] });
      }
      // 2. 重新渲染原始数据到输入层
      renderMapFeatures();
      // 3. 如果有未提交的编辑，在影子层叠加显示
      handleShowShadow();
    }
  }
};

const handleEditorExit = () => {
  isInEditMode.value = false;
  activeName.value = 'third';
  // 编辑器退出时，stopModify已恢复原始图层可见性
  // 无论保存还是取消，都需要重新渲染以确保地图数据与 data.features 同步
  renderMapFeatures();
};

const handleEditorModifyChange = (feature: GeoJSON.Feature) => {
  // 编辑器通知要素修改，重新渲染地图编辑图层
  logger.info('[Inspact] Feature modified in editor');
};

const handleEditorDataChanged = () => {
  // 要素级操作（分割/合并）后数据变化，重新构建树和渲染地图
  buildGeoJsonTree();
  renderMapFeatures();
};

const handleCreateArchive = (payload: { name: string; features: GeoJSON.Feature[]; sourceIdx: number }) => {
  // 生成新档案：给新要素设置名称后缀，添加到当前数据
  payload.features.forEach((f, i) => {
    if (!f.properties) f.properties = {};
    f.properties.name = payload.name + (payload.features.length > 1 ? ` #${i + 1}` : '');
    props.data.features.push(f);
  });
  buildGeoJsonTree();
  renderMapFeatures();
};

const featureEditorRef = ref<InstanceType<typeof GisFeatureEditor> | null>(null);

const handleShowShadow = () => {
  // 离开要素列表时，如果有未提交的编辑，展示影子
  // 注意：defineExpose 自动 unwrap ref/computed，不需要 .value
  const hasEditsVal = featureEditorRef.value?.hasEdits ?? false
  const workingFeatures = featureEditorRef.value?.workingFeatures ?? []
  console.log('[Inspact] handleShowShadow', { hasEdits: hasEditsVal, workingFeaturesLength: workingFeatures.length, instanceId: curInstanceId.value })
  if (hasEditsVal && curInstanceId.value) {
    eventBus.emit(`${curInstanceId.value}`, {
      event_type: 'map-event:show-edit-shadow',
      options: {},
      params: [JSON.parse(JSON.stringify(workingFeatures))],
    });
    console.log('[Inspact] showEditShadow event emitted');
  }
};

const handleClearShadow = () => {
  if (curInstanceId.value) {
    eventBus.emit(`${curInstanceId.value}`, { event_type: 'map-event:clear-edit-shadow', options: {}, params: [] });
  }
};

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
          let apply = Reflect.apply(validHandlers[gType], null, [(f.geometry as GeoJSON.Geometry & { coordinates: unknown[] }).coordinates]);
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
    const geoInfoNode = new GeoInfoNode("校验问题", validResult.value.map((f, _idx) => inspectFeature(f as unknown as GeoJSON.Feature, _idx)));
    geoInfoNode.id = 'root';
    geoInfoNode.label2 = `${validResult.value.length} 项`;
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
      <Pane :size="22" :min-size="12" :max-size="40">
        <el-tabs v-model="activeName" :type="'border-card'" class="gis-data-inspector-tree" @tab-change="handleTabChange">
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
                <template #default="{ data: nodeData }">
                  <span v-if="nodeData" :class="`custom-tree-node error ${nodeData.disabled?'disabled':''}`">
                  <GeoTypeIconRender v-if="nodeData.geoType" :type="nodeData.geoType" :size="13" />
                    <span class="key">{{ splitLabel(nodeData.label).name }}</span>
                    <el-tag v-if="nodeData.label2" size="small" type="danger" effect="plain" round class="label2">
                      {{ nodeData.label2 }}
                    </el-tag>
                    <span v-if="nodeData.value !== undefined" :class="`val-${ nodeData.typeName}`">{{ nodeData.value }}</span>
                    <el-icon v-if="nodeData.geometry || nodeData.sourceFeature" class="node-btn node-btn-edit" title="编辑JSON" @click.stop="handleEditDialogOpen(nodeData)"><Edit /></el-icon>
                  </span>
                </template>
              </el-tree-v2>
            </div>
            <div style="text-align: center">
              <el-button type="primary" @click="handleValid">执行校验</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="要素列表" name="third">
            <gis-feature-editor
              ref="featureEditorRef"
              :data="data"
              :instance-id="curInstanceId"
              :style="{height: `${treeHeight}px`}"
              @exit="handleEditorExit"
              @modify-change="handleEditorModifyChange"
              @data-changed="handleEditorDataChanged"
              @create-archive="handleCreateArchive"
              @show-shadow="handleShowShadow"
              @clear-shadow="handleClearShadow"
            />
          </el-tab-pane>
        </el-tabs>
      </Pane>
      <Pane v-if="mapReloaded && (conpomentVisiblity||mapInited)" :size="78" :min-size="40">
        <div class="map-container">
          <gis-map-tianditu :map-name="`${curInstanceId}`" :options="{projection:epsgCode}" />
        </div>
      </Pane>
    </Splitpanes>

    <!-- 节点 JSON 编辑弹窗（点击哪个节点的编辑按钮，就编辑哪个节点） -->
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

/* === 节点美化样式 === */
.gis-data-inspector-container :deep(.custom-tree-node) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}
.gis-data-inspector-container :deep(.custom-tree-node .geo-type-icon) {
  flex-shrink: 0;
  margin-right: 4px;
  opacity: 0.85;
}
.gis-data-inspector-container :deep(.custom-tree-node.error .geo-type-icon) {
  opacity: 0.5;
}
.gis-data-inspector-container :deep(.custom-tree-node .key) {
  flex-shrink: 1;
  min-width: 0;
  font-weight: 500;
}
.gis-data-inspector-container :deep(.custom-tree-node .key-index) {
  flex-shrink: 0;
  margin-left: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--el-text-color-placeholder);
  letter-spacing: 0.3px;
}
.gis-data-inspector-container :deep(.custom-tree-node .key-index::before) {
  content: '';
  display: inline-block;
  width: 1px;
  height: 9px;
  margin-right: 4px;
  vertical-align: -1px;
  background: var(--el-border-color-lighter);
}
.gis-data-inspector-container :deep(.custom-tree-node .label2) {
  flex-shrink: 0;
  font-size: 11px;
  height: 18px;
  padding: 0 7px;
}
.gis-data-inspector-container :deep(.custom-tree-node .val-string),
.gis-data-inspector-container :deep(.custom-tree-node .val-number),
.gis-data-inspector-container :deep(.custom-tree-node .val-boolean) {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.node-btn {
  width: 18px;
  height: 18px;
  padding: 2px;
  margin-left: auto;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  transition: color 0.15s;
}
.node-btn:hover {
  color: var(--el-color-primary);
}
.node-btn-edit:hover {
  color: var(--el-color-warning);
}

/* === 弹窗编辑样式（紧凑布局） === */
:deep(.node-edit-dialog) {
  display: flex;
  flex-direction: column;
}
:deep(.node-edit-dialog .el-dialog__header) {
  padding: 12px 16px 8px;
}
:deep(.node-edit-dialog .el-dialog__body) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  padding: 8px 16px 12px;
  height: 70vh;
  box-sizing: border-box;
}
:deep(.node-edit-dialog .el-dialog__footer) {
  padding: 8px 16px 12px;
}
.json-editor-container.dialog-editor {
  position: relative;
  height: 100%;
  flex: 1 1 auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
}
.json-editor-container.dialog-editor .json-editor-main {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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
  margin-right: auto;
  opacity: 0;
  transition: opacity 0.2s;
}
.dirty-tip.visible {
  opacity: 1;
}

</style>
