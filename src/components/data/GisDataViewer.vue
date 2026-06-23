<script setup lang="ts">
import { ShapefileParser, GeoJSONFeatureCollection } from "@sphinx_hq/shapefile-parser";
import { ElMessage } from "element-plus";
import { computed, Ref, ref, watch } from "vue";

import { ExchangeDataFormat } from "~/components/data/ExchangeDataFormat";
import CrsInfoRender from "~/components/renders/CrsInfoRender.vue";
import GisDataInfo from "~/components/data/GisDataInfo";
import VertexCountRender from "~/components/renders/VertexCountRender.vue";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import GeoTypeRender from "~/components/renders/GeoTypeRender.vue";
import { WktDataFormat } from "~/components/data/WktDataFormat";

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  transformChain: {
    type: Array as () => number[],
    default: () => []
  }
})

const emit = defineEmits<{
  'transform-crs': []
  'reset-crs': []
  'navigate-chain': [epsgCode: number]
}>()

const curGeo = ref<string | null>(null)
const splitFeatureIdx = ref(0)

const exchangeDataType = ref("HasProperties");
const dataStr_exchange = ref<string[]>([]);
const display_exchange = computed(() => {
  const displayArr: string[] = [];
  if (exchangeDataType.value !== 'HasProperties') {
    dataStr_exchange.value.forEach((x: string) => {
      if (x.startsWith("J")) {
        displayArr.push(x);
      } else if (x.endsWith("@")) {
        displayArr.push("");
      }
    })
    return displayArr.join("\r\n");
  } else {
    return dataStr_exchange.value.join("\r\n");
  }
})

const wktType = ref("GeometryCollection");
const dataStr_wkt: Ref<string[]> = ref<string[]>([]);


watch(() => props.data, (newData) => {
  if (!newData || !newData.features?.length) {
    dataStr_exchange.value = [];
    dataStr_wkt.value = [];
    return;
  }
  //exchangeData
  const exchangeDataFormat = new ExchangeDataFormat();
  exchangeDataFormat.write(newData).then(res => {
    dataStr_exchange.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })
  //wktData
  const wktDataFormat = new WktDataFormat();
  wktDataFormat.write(newData).then(res => {
    dataStr_wkt.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })

}, { deep: true, immediate: true })
const geoJsonType = ref("FeatureCollection");
const includeCrs = ref(false);
const jsonFormat = ref("pretty");
const dataStr_Geojson = ref<string | string[] | undefined>(undefined);

const crsObj = computed(() => {
  if (!includeCrs.value || !props.data?.crs?.isValid) return null;
  return { type: "name", properties: { name: `EPSG:${props.data.crs.epsgCode}` } };
});

const jsonSpace = computed(() => jsonFormat.value === 'pretty' ? 2 : undefined);

watch(() => [props.data, geoJsonType.value, includeCrs.value, jsonFormat.value], () => {
  if (!props.data || !props.data.features?.length) {
    dataStr_Geojson.value = undefined;
    return;
  }
  const type = geoJsonType.value;
  const space = jsonSpace.value;
  switch (type) {
    case "FeatureListArray": {
      const features = props.data.features.map(f => {
        const fea = { ...f };
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value;
        return fea;
      });
      dataStr_Geojson.value = JSON.stringify(features, null, space);
      break;
    }
    case "FeatureCollection": {
      const fc: Record<string, unknown> = {
        type: "FeatureCollection",
        features: props.data.features
      };
      if (crsObj.value) fc.crs = crsObj.value;
      dataStr_Geojson.value = JSON.stringify(fc, null, space);
      break;
    }
    case "FeatureSplit": {
      curGeo.value = null;
      dataStr_Geojson.value = props.data.features.map(f => {
        const fea = { ...f };
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value;
        return JSON.stringify(fea, null, space);
      });
      break;
    }
    default:
      dataStr_Geojson.value = undefined;
  }
}, { deep: true, immediate: true })

const handleDownloadJson = () => {
  let downloadContent: string;
  if (geoJsonType.value === "FeatureSplit") {
    downloadContent = curGeo.value ?? '';
  } else if (Array.isArray(dataStr_Geojson.value)) {
    downloadContent = dataStr_Geojson.value.join('\r\n');
  } else {
    downloadContent = dataStr_Geojson.value ?? '';
  }
  let fileName = geoJsonType.value + new Date().getTime();
  const blob = new Blob([downloadContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

const shpLoading = ref(false);
const handleDownloadShp = async () => {
  if (!props.data?.features?.length) {
    ElMessage.warning("没有数据可导出");
    return;
  }
  shpLoading.value = true;
  try {
    const parser = new ShapefileParser();
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: props.data.features as GeoJSONFeatureCollection['features']
    };
    const fileName = "shapefile_" + new Date().getTime();
    await parser.write(geojson, {
      filename: fileName,
      download: true,
      fieldNameStrategy: 'auto'
    });
    ElMessage.success("Shapefile 导出成功");
  } catch (e: any) {
    ElMessage.error(e.message || "导出失败");
  } finally {
    shpLoading.value = false;
  }
}


const handleDownloadExchange = () => {
  let downloadContent: string = dataStr_exchange.value.join("\r\n");
  let fileName = "电子报盘" + new Date().getTime();
  const blob = new Blob([downloadContent], { type: "application/text" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}
const hasFeatures = computed(() => {
  return props.data?.features?.length > 0;
})

const hasValidCrs = computed(() => {
  const crs = props.data?.crs
  return crs && crs.epsgCode > 0 && crs.isValid
})

const crsInfo = computed(() => props.data?.crs?.crsInfo ?? null)

const totalVertexCount = computed(() => props.data?.getTotalVertexCount?.() ?? 0)
const geometryTypes = computed(() => props.data?.getTypes?.() ?? [])

// ===== Feature Split 卡片相关 =====
const titleField = ref('')

// 所有要素的属性字段名（用于选择卡片标题）
const allPropertyKeys = computed(() => {
  const keys = new Set<string>()
  for (const f of props.data?.features ?? []) {
    if (f.properties) Object.keys(f.properties).forEach(k => keys.add(k))
  }
  return [...keys]
})

// 计算单个要素的顶点数
function featureVertexCount(f: GeoJSON.Feature): number {
  const geo = f.geometry
  if (!geo) return 0
  switch (geo.type) {
    case 'Point': return 1
    case 'MultiPoint': return (geo.coordinates as number[][]).length
    case 'LineString': return (geo.coordinates as number[][]).length
    case 'MultiLineString': return (geo.coordinates as number[][][]).reduce((s, l) => s + l.length, 0)
    case 'Polygon': return (geo.coordinates as number[][][]).reduce((s, r) => s + Math.max(0, r.length - 1), 0)
    case 'MultiPolygon': return (geo.coordinates as number[][][][]).reduce((s, p) => s + p.reduce((s2, r) => s2 + Math.max(0, r.length - 1), 0), 0)
    default: return 0
  }
}

// 卡片标题：优先用选中的属性字段，否则回退到 name/NAME/要素 #N
function featureCardTitle(f: GeoJSON.Feature, idx: number): string {
  if (titleField.value && f.properties?.[titleField.value] != null) {
    return String(f.properties[titleField.value])
  }
  return f.properties?.name ?? f.properties?.NAME ?? `要素 #${idx}`
}

// 监听 splitFeatureIdx 同步 curGeo
watch(splitFeatureIdx, (idx) => {
  if (geoJsonType.value === 'FeatureSplit' && Array.isArray(dataStr_Geojson.value)) {
    curGeo.value = dataStr_Geojson.value[idx] ?? null
  }
})

// 切换到 FeatureSplit 时自动选中第一个
watch(() => geoJsonType.value, (type) => {
  if (type === 'FeatureSplit') {
    splitFeatureIdx.value = 0
    if (Array.isArray(dataStr_Geojson.value) && dataStr_Geojson.value.length > 0) {
      curGeo.value = dataStr_Geojson.value[0]
    }
  }
})

// ===== 要素预览弹窗 =====
const previewVisible = ref(false)
const previewFeature = ref<GeoJSON.Feature | null>(null)

function openPreview(f: GeoJSON.Feature, e: MouseEvent) {
  e.stopPropagation()
  previewFeature.value = f
  previewVisible.value = true
}

// 计算坐标范围
function coordBounds(f: GeoJSON.Feature): string {
  const b = featureBboxArray(f)
  if (!b) return '无坐标'
  return `[${b.map(v => v.toFixed(4)).join(', ')}]`
}

// 计算 bbox 数组 [minLon, minLat, maxLon, maxLat]
function featureBboxArray(f: GeoJSON.Feature): number[] | null {
  const geo = f.geometry
  if (!geo) return null
  const coords = JSON.stringify(geo.coordinates)
  const nums = coords.match(/-?\d+\.?\d*/g)?.map(Number) ?? []
  if (nums.length < 2) return null
  const xs = nums.filter((_, i) => i % 2 === 0)
  const ys = nums.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

// bbox 显示字符串
function featureBbox(f: GeoJSON.Feature): string {
  const b = featureBboxArray(f)
  if (!b) return '无'
  return `[${b.map(v => v.toFixed(6)).join(', ')}]`
}

// 将 GeoJSON 几何转为 SVG path 的 d 属性（归一化到 0~200 视口）
function geoToSvgPath(geo: GeoJSON.Geometry): string | null {
  // 收集所有坐标对 [lon, lat]
  const allCoords: number[][] = []
  const collect = (c: number[]) => allCoords.push(c)

  if (geo.type === 'Point') collect(geo.coordinates as number[])
  else if (geo.type === 'MultiPoint' || geo.type === 'LineString')
    (geo.coordinates as number[][]).forEach(collect)
  else if (geo.type === 'MultiLineString' || geo.type === 'Polygon')
    (geo.coordinates as number[][][]).flat().forEach(collect)
  else if (geo.type === 'MultiPolygon')
    (geo.coordinates as number[][][][]).flat(2).forEach(collect)
  else return null

  if (allCoords.length === 0) return null

  // 计算边界
  const xs = allCoords.map(c => c[0])
  const ys = allCoords.map(c => c[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  // 视口参数
  const VW = 180, VH = 180, PAD = 10
  const scaleX = VW / rangeX
  const scaleY = VH / rangeY
  const scale = Math.min(scaleX, scaleY)
  const offX = PAD + (VW - rangeX * scale) / 2
  const offY = PAD + (VH - rangeY * scale) / 2

  // 坐标转换（Y 翻转：纬度大的在上）
  const tx = (lon: number, lat: number) => ({
    x: offX + (lon - minX) * scale,
    y: offY + VH - (lat - minY) * scale - (VH - rangeY * scale)
  })

  const parts: string[] = []

  const ringToPath = (ring: number[][]) => {
    ring.forEach((c, i) => {
      const p = tx(c[0], c[1])
      parts.push(i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    })
    parts.push('Z')
  }

  if (geo.type === 'Point') {
    const p = tx(allCoords[0][0], allCoords[0][1])
    return null // 点用 circle
  } else if (geo.type === 'MultiPoint') {
    return null // 多点用 circle
  } else if (geo.type === 'LineString') {
    (geo.coordinates as number[][]).forEach((c, i) => {
      const p = tx(c[0], c[1])
      parts.push(i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    })
  } else if (geo.type === 'MultiLineString') {
    (geo.coordinates as number[][][]).forEach(line => {
      line.forEach((c, i) => {
        const p = tx(c[0], c[1])
        parts.push(i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      })
    })
  } else if (geo.type === 'Polygon') {
    (geo.coordinates as number[][][]).forEach(ring => ringToPath(ring))
  } else if (geo.type === 'MultiPolygon') {
    (geo.coordinates as number[][][][]).forEach(poly => poly.forEach(ring => ringToPath(ring)))
  }

  return parts.join(' ') || null
}

// 预览用的 SVG 内容
const previewSvgPath = computed(() => {
  if (!previewFeature.value?.geometry) return null
  if (featureVertexCount(previewFeature.value) > 2000) return null
  return geoToSvgPath(previewFeature.value.geometry)
})

const previewSvgPoints = computed(() => {
  const geo = previewFeature.value?.geometry
  if (!geo) return []
  if (featureVertexCount(previewFeature.value!) > 2000) return []
  if (geo.type === 'Point') {
    return [{ type: 'point' as const, lon: (geo.coordinates as number[])[0], lat: (geo.coordinates as number[])[1] }]
  }
  if (geo.type === 'MultiPoint') {
    return (geo.coordinates as number[][]).map(c => ({ type: 'point' as const, lon: c[0], lat: c[1] }))
  }
  return []
})

const previewSvgTooManyVertices = computed(() => {
  if (!previewFeature.value) return false
  return featureVertexCount(previewFeature.value) > 2000
})

const previewIsLine = computed(() => {
  const t = previewFeature.value?.geometry?.type
  return t === 'LineString' || t === 'MultiLineString'
})

</script>
<template>
  <div class="gis-data-viewer-container">
    <el-tabs class="gis-data-viewer-tabs">
      <el-tab-pane label="数据信息">
        <div class="data-info-content">
          <el-descriptions :column="2" border label-class-name="info-label" class="data-info-desc">
            <el-descriptions-item label="数据名称">{{ props.data?.name || '未命名' }}</el-descriptions-item>
            <el-descriptions-item label="要素数量">{{ props.data?.features?.length ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="几何类型">
              <div v-if="geometryTypes.length" class="geo-types-cell">
                <GeoTypeRender v-for="t in geometryTypes" :key="t" :type="t" />
              </div>
              <span v-else>无</span>
            </el-descriptions-item>
            <el-descriptions-item label="总顶点数">
              <VertexCountRender :count="totalVertexCount" />
            </el-descriptions-item>

            <template v-if="crsInfo">
              <el-descriptions-item label="坐标系">
                <CrsInfoRender :crs-info="crsInfo" display="epsgCode" type="info" />
              </el-descriptions-item>
              <el-descriptions-item label="坐标系名称">
                <CrsInfoRender :crs-info="crsInfo" display="name" type="info" />
              </el-descriptions-item>
              <el-descriptions-item label="坐标系类型">
                <CrsInfoRender :crs-info="crsInfo" display="projected" />
              </el-descriptions-item>
              <el-descriptions-item label="中央经线">
                <CrsInfoRender :crs-info="crsInfo" display="centralMeridian" />
              </el-descriptions-item>
              <el-descriptions-item label="带号">
                <CrsInfoRender :crs-info="crsInfo" display="zoneNumber" />
              </el-descriptions-item>
              <el-descriptions-item label="经度范围">
                <CrsInfoRender :crs-info="crsInfo" display="minLon" /> ~
                <CrsInfoRender :crs-info="crsInfo" display="maxLon" />
              </el-descriptions-item>
              <el-descriptions-item label="是否带号">
                <CrsInfoRender :crs-info="crsInfo" display="withZone" />
              </el-descriptions-item>
            </template>
            <template v-else>
              <el-descriptions-item label="坐标系">
                <span class="text-muted">未设置</span>
              </el-descriptions-item>
            </template>
          </el-descriptions>

          <!-- 转换链溯源 -->
          <div v-if="transformChain.length > 1" class="transform-chain">
            <span class="chain-label">转换历程：</span>
            <template v-for="(epsg, idx) in transformChain" :key="epsg">
              <span class="chain-node" :class="{ 'is-current': idx === transformChain.length - 1 }"
                @click="idx < transformChain.length - 1 && emit('navigate-chain', epsg)">
                EPSG:{{ epsg }}
              </span>
              <span v-if="idx < transformChain.length - 1" class="chain-arrow">→</span>
            </template>
          </div>

          <div class="data-info-actions">
            <el-button size="small" type="primary" :disabled="!hasValidCrs" @click="emit('transform-crs')">
              坐标转换
            </el-button>
            <el-button size="small" @click="emit('reset-crs')">
              重设坐标系
            </el-button>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="编辑&查看">
        <gis-data-inspactor :data="props.data" />
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="GeoJson">
        <div class="h-40px"
          style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-radio-group v-model="geoJsonType" size="small">
              <el-radio-button value="FeatureCollection">FeatureCollection</el-radio-button>
              <el-radio-button value="FeatureListArray">FeatureList Array</el-radio-button>
              <el-radio-button value="FeatureSplit">Feature Split</el-radio-button>
            </el-radio-group>
            <el-checkbox v-model="includeCrs" :disabled="!hasValidCrs" size="small">CRS</el-checkbox>
            <el-select v-model="jsonFormat" size="small" style="width: 100px;">
              <el-option label="格式化" value="pretty" />
              <el-option label="压缩" value="compact" />
            </el-select>
          </div>
          <div style="display: flex; gap: 8px;">
            <el-button type="primary" @click="handleDownloadJson">Download Json File</el-button>
            <el-button type="success" :loading="shpLoading" @click="handleDownloadShp">Download Shapefile</el-button>
          </div>
        </div>
        <div class="h-[calc(100%-40px)] overflow-auto">
          <div v-if="geoJsonType === 'FeatureSplit'" class="feature-split-layout">
            <div class="feature-split-sidebar">
              <div class="sidebar-header">
                <span class="sidebar-count">{{ props.data?.features?.length ?? 0 }} 个要素</span>
                <el-select v-model="titleField" size="small" placeholder="标题字段" clearable class="title-field-select">
                  <el-option label="默认" value="" />
                  <el-option v-for="k in allPropertyKeys" :key="k" :label="k" :value="k" />
                </el-select>
              </div>
              <div class="sidebar-cards">
                <div v-for="(f, idx) in props.data?.features ?? []" :key="idx" class="feature-card"
                  :class="{ active: splitFeatureIdx === idx }" @click="splitFeatureIdx = idx">
                  <div class="card-header">
                    <div class="card-title">{{ featureCardTitle(f, idx) }}</div>
                    <svg class="card-preview-btn" viewBox="0 0 24 24" width="16" height="16" title="预览"
                      @click="openPreview(f, $event)">
                      <path
                        d="M12 5C5.636 5 2 12 2 12s3.636 7 10 7 10-7 10-7-3.636-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"
                        fill="currentColor" />
                    </svg>
                  </div>
                  <div class="card-meta">
                    <GeoTypeIconRender v-if="f.geometry?.type" :type="f.geometry.type" :size="12" />
                    <span v-if="f.geometry?.type" class="card-type">{{ f.geometry.type }}</span>
                    <span class="card-vertices">{{ featureVertexCount(f) }} 顶点</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="feature-split-editor">
              <geo-str-editor :value="curGeo" language="geojson" />
            </div>
          </div>
          <geo-str-editor v-else class="h-[calc(100%-40px)]" :value="dataStr_Geojson" language="geojson" />
        </div>
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="Wkt">
        <div class="h-40px"
          style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; ">
          <el-radio-group v-model="wktType">
            <el-radio-button value="GeometryCollection">GeometryCollection</el-radio-button>
            <el-radio-button value="GeometrySplit">Geometry Split</el-radio-button>
          </el-radio-group>
        </div>
        <div class="h-[calc(100%-40px)]">
          <geo-str-editor
            :value="wktType === 'GeometrySplit' ? dataStr_wkt.join(`\r\n\r\n\r\n`) : `GEOMETRYCOLLECTION(${dataStr_wkt.join(`,`)})`"
            language="wkt" />
        </div>
      </el-tab-pane>
      <el-tab-pane :disabled="!hasFeatures" label="电子报盘">
        <div class="h-40px"
          style="display: flex;flex-direction: row;align-items: center;justify-content: space-between; ">
          <el-radio-group v-model="exchangeDataType">
            <el-radio-button value="HasProperties">HasProperties</el-radio-button>
            <el-radio-button value="NoProperties">NoProperties</el-radio-button>
          </el-radio-group>
          <el-button type="primary" @click="handleDownloadExchange">DownloadTxt</el-button>
        </div>
        <div class="h-[calc(100%-40px)]">
          <geo-str-editor :value="display_exchange" language="exchange" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 要素预览弹窗 -->
    <el-dialog v-model="previewVisible" title="要素预览" width="560px" :close-on-click-modal="true" align-center
      class="feature-preview-dialog">
      <template v-if="previewFeature">
        <div class="preview-layout">
          <div class="preview-left">
            <el-descriptions :column="1" border size="small" class="preview-desc">
              <el-descriptions-item label="类型">
                <div v-if="previewFeature.geometry?.type" style="display:inline-flex;align-items:center;gap:4px;">
                  <GeoTypeIconRender :type="previewFeature.geometry.type" :size="14" />
                  {{ previewFeature.geometry.type }}
                </div>
                <span v-else>无几何</span>
              </el-descriptions-item>
              <el-descriptions-item label="顶点">{{ featureVertexCount(previewFeature) }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="previewFeature.properties && Object.keys(previewFeature.properties).length"
              class="preview-props">
              <div class="preview-props-title">属性 ({{ Object.keys(previewFeature.properties).length }})</div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item v-for="(val, key) in previewFeature.properties" :key="key" :label="String(key)">
                  <span class="preview-prop-val">{{ val == null ? '(空)' : String(val) }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
          <div class="preview-right">
            <div v-if="previewSvgTooManyVertices" class="preview-svg-placeholder">
              <span>顶点过多，不提供轮廓预览</span>
            </div>
            <svg v-else-if="previewSvgPath" class="preview-svg" viewBox="0 0 200 200">
              <path :d="previewSvgPath"
                :fill="previewIsLine ? 'none' : 'rgba(234,88,12,0.15)'"
                stroke="#ea580c" stroke-width="1.5"
                stroke-linejoin="round" />
            </svg>
            <div v-else class="preview-svg-placeholder">
              <span>无几何图形</span>
            </div>
          </div>
        </div>
        <div class="preview-bbox-bar">
          <span class="bbox-label">BBox</span>
          <span class="bbox-value">{{ featureBbox(previewFeature) }}</span>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.gis-data-viewer-container {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 5px;
  box-sizing: border-box;
}

.gis-data-viewer-tabs {
  height: calc(100%);
}

.split-btns {
  width: 50px;
  margin: 2px;
  padding: 0;
}

.gis-data-viewer-container .el-tabs .el-tabs__content .el-tab-pane {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.data-info-content {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-info-desc {
  width: 100%;
}

.data-info-desc :deep(.info-label) {
  width: 100px;
  min-width: 100px;
  font-size: 13px;
}

.data-info-desc :deep(.el-descriptions__body) {
  font-size: 13px;
}

.data-info-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.transform-chain {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.chain-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  margin-right: 4px;
}

.chain-node {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  cursor: default;
  transition: all 0.2s;
}

.chain-node:not(.is-current) {
  cursor: pointer;
  color: var(--el-color-primary);
  border-color: transparent;
}

.chain-node:not(.is-current):hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.chain-node.is-current {
  background: var(--el-color-primary-light-8);
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary-dark-2);
  font-weight: 600;
}

.chain-arrow {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  margin: 0 1px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

/* 坐标系类型 chip（投影 = 紫，地理 = 青） */
:deep(.crs-tag-projected.el-tag) {
  --el-tag-bg-color: var(--gis-crs-projected-bg);
  --el-tag-border-color: var(--gis-crs-projected-bg);
  --el-tag-text-color: var(--gis-crs-projected);
}

:deep(.crs-tag-geographic.el-tag) {
  --el-tag-bg-color: var(--gis-crs-geographic-bg);
  --el-tag-border-color: var(--gis-crs-geographic-bg);
  --el-tag-text-color: var(--gis-crs-geographic);
}

.geo-types-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.geo-types-text {
  font-size: 13px;
  color: var(--gis-text-secondary);
}

/* ===== Feature Split 卡片布局 ===== */
.feature-split-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.feature-split-sidebar {
  width: 220px;
  min-width: 180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  gap: 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.sidebar-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.title-field-select {
  width: 100px;
}

.title-field-select :deep(.el-input__inner) {
  font-size: 11px;
}

.sidebar-cards {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px;
}

.feature-card {
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.feature-card:hover {
  background: var(--el-fill-color);
  border-color: var(--el-border-color-lighter);
}

.feature-card.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.feature-card.active .card-title {
  color: var(--el-color-primary-dark-2);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.card-type {
  color: var(--el-text-color-regular);
}

.card-vertices {
  color: var(--el-text-color-placeholder);
}

.feature-split-editor {
  flex: 1 1 auto;
  height: 100%;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}

.card-preview-btn {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: color 0.15s;
  margin-top: 1px;
}

.card-preview-btn:hover {
  color: var(--el-color-primary);
}

.card-preview-btn.disabled {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}

.preview-desc {
  margin-bottom: 10px;
}

.preview-props {
  max-height: 260px;
  overflow-y: auto;
}

.preview-props-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.preview-prop-val {
  font-size: 12px;
  word-break: break-all;
}

.preview-layout {
  display: flex;
  gap: 12px;
}

.preview-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.preview-right {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-svg {
  width: 200px;
  height: 200px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.preview-svg-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.preview-bbox-bar {
  margin-top: 8px;
  padding: 4px 8px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.bbox-label {
  color: var(--el-text-color-secondary);
  font-weight: 500;
  flex-shrink: 0;
}

.bbox-value {
  color: var(--el-text-color-regular);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}
</style>
