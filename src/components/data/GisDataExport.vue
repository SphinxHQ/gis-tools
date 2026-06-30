<script setup lang="ts">
/**
 * @file GIS data export component
 * @description Provides data export functionality supporting GeoJSON, WKT, Shapefile (zip),
 *              and clipboard copy with format selection and CRS transformation.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-24
 */
import { Download } from "@element-plus/icons-vue";
import { ShapefileParser, GeoJSONFeatureCollection } from "@sphinx_hq/shapefile-parser";
import { ElMessage } from "element-plus";
import { computed, Ref, ref, watch } from "vue";

import { ExchangeDataFormat } from "~/components/data/ExchangeDataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import { TopoJsonDataFormat } from "~/components/data/TopoJsonDataFormat";
import { WktDataFormat } from "~/components/data/WktDataFormat";
import GeoTypeIconRender from "~/components/renders/GeoTypeIconRender.vue";
import ModeIconRender from "~/components/renders/ModeIconRender.vue";

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  }
})

const exportType = ref<'geojson' | 'wkt' | 'exchange' | 'topojson'>('geojson')

// ===== GeoJson 导出 =====
const geoJsonType = ref("FeatureCollection")
const includeCrs = ref(false)
const jsonFormat = ref("pretty")
const dataStr_Geojson = ref<string | string[] | undefined>(undefined)
const curGeo = ref<string | null>(null)
const splitFeatureIdx = ref(0)

const crsObj = computed(() => {
  if (!includeCrs.value || !props.data?.crs?.isValid) return null
  return { type: "name", properties: { name: `EPSG:${props.data.crs.epsgCode}` } }
})

const jsonSpace = computed(() => jsonFormat.value === 'pretty' ? 2 : undefined)

watch(() => [props.data, geoJsonType.value, includeCrs.value, jsonFormat.value], () => {
  if (!props.data || !props.data.features?.length) {
    dataStr_Geojson.value = undefined
    return
  }
  const type = geoJsonType.value
  const space = jsonSpace.value
  switch (type) {
    case "FeatureListArray": {
      const features = props.data.features.map(f => {
        const fea = { ...f }
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value
        return fea
      })
      dataStr_Geojson.value = JSON.stringify(features, null, space)
      break
    }
    case "FeatureCollection": {
      const fc: Record<string, unknown> = {
        type: "FeatureCollection",
        features: props.data.features
      }
      if (crsObj.value) fc.crs = crsObj.value
      dataStr_Geojson.value = JSON.stringify(fc, null, space)
      break
    }
    case "FeatureSplit": {
      curGeo.value = null
      dataStr_Geojson.value = props.data.features.map(f => {
        const fea = { ...f }
        if (crsObj.value) (fea as Record<string, unknown>).crs = crsObj.value
        return JSON.stringify(fea, null, space)
      })
      break
    }
    default:
      dataStr_Geojson.value = undefined
  }
}, { deep: true, immediate: true })

const handleDownloadJson = () => {
  let downloadContent: string
  if (geoJsonType.value === "FeatureSplit") {
    downloadContent = curGeo.value ?? ''
  } else if (Array.isArray(dataStr_Geojson.value)) {
    downloadContent = dataStr_Geojson.value.join('\r\n')
  } else {
    downloadContent = dataStr_Geojson.value ?? ''
  }
  let fileName = geoJsonType.value + new Date().getTime()
  const blob = new Blob([downloadContent], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName + ".json"
  a.click()
  URL.revokeObjectURL(url)
}

const shpLoading = ref(false)
const handleDownloadShp = async () => {
  if (!props.data?.features?.length) {
    ElMessage.warning("没有数据可导出")
    return
  }
  shpLoading.value = true
  try {
    const parser = new ShapefileParser()
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: props.data.features as GeoJSONFeatureCollection['features']
    }
    const fileName = "shapefile_" + new Date().getTime()
    await parser.write(geojson, {
      filename: fileName,
      download: true,
      fieldNameStrategy: 'auto'
    })
    ElMessage.success("Shapefile 导出成功")
  } catch (e: any) {
    ElMessage.error(e.message || "导出失败")
  } finally {
    shpLoading.value = false
  }
}

// FeatureSplit 相关
const titleField = ref('')
const allPropertyKeys = computed(() => {
  const keys = new Set<string>()
  for (const f of props.data?.features ?? []) {
    if (f.properties) Object.keys(f.properties).forEach(k => keys.add(k))
  }
  return [...keys]
})

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

function featureCardTitle(f: GeoJSON.Feature, idx: number): string {
  if (titleField.value && f.properties?.[titleField.value] != null) {
    return String(f.properties[titleField.value])
  }
  return f.properties?.name ?? f.properties?.NAME ?? `要素 #${idx}`
}

watch(splitFeatureIdx, (idx) => {
  if (geoJsonType.value === 'FeatureSplit' && Array.isArray(dataStr_Geojson.value)) {
    curGeo.value = dataStr_Geojson.value[idx] ?? null
  }
})

watch(() => geoJsonType.value, (type) => {
  if (type === 'FeatureSplit') {
    splitFeatureIdx.value = 0
    if (Array.isArray(dataStr_Geojson.value) && dataStr_Geojson.value.length > 0) {
      curGeo.value = dataStr_Geojson.value[0]
    }
  }
})

// ===== Wkt 导出 =====
const wktType = ref("GeometryCollection")
const dataStr_wkt: Ref<string[]> = ref<string[]>([])

watch(() => props.data, (newData) => {
  if (!newData || !newData.features?.length) {
    dataStr_wkt.value = []
    return
  }
  const wktDataFormat = new WktDataFormat()
  wktDataFormat.write(newData).then(res => {
    dataStr_wkt.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })
}, { deep: true, immediate: true })

// ===== 电子报盘导出 =====
const exchangeDataType = ref("HasProperties")
const dataStr_exchange = ref<string[]>([])
const display_exchange = computed(() => {
  const displayArr: string[] = []
  if (exchangeDataType.value !== 'HasProperties') {
    dataStr_exchange.value.forEach((x: string) => {
      if (x.startsWith("J")) {
        displayArr.push(x)
      } else if (x.endsWith("@")) {
        displayArr.push("")
      }
    })
    return displayArr.join("\r\n")
  } else {
    return dataStr_exchange.value.join("\r\n")
  }
})

watch(() => props.data, (newData) => {
  if (!newData || !newData.features?.length) {
    dataStr_exchange.value = []
    return
  }
  const exchangeDataFormat = new ExchangeDataFormat()
  exchangeDataFormat.write(newData).then(res => {
    dataStr_exchange.value = res
  }).catch(e => {
    ElMessage.error(e.message)
  })
}, { deep: true, immediate: true })

const handleDownloadExchange = () => {
  let downloadContent: string = dataStr_exchange.value.join("\r\n")
  let fileName = "电子报盘" + new Date().getTime()
  const blob = new Blob([downloadContent], { type: "application/text" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName + ".txt"
  a.click()
  URL.revokeObjectURL(url)
}

// ===== TopoJSON 导出 =====
const dataStr_topojson = ref<string | undefined>(undefined)
const topojsonFormat = ref<"pretty" | "compact">("pretty")

watch(() => [props.data, topojsonFormat.value], () => {
  if (!props.data || !props.data.features?.length) {
    dataStr_topojson.value = undefined
    return
  }
  const topoFormat = new TopoJsonDataFormat()
  topoFormat.write(props.data).then(res => {
    // res 是 JSON 字符串，按格式化选项重新序列化
    try {
      const parsed = JSON.parse(res)
      const space = topojsonFormat.value === 'pretty' ? 2 : undefined
      dataStr_topojson.value = JSON.stringify(parsed, null, space)
    } catch {
      dataStr_topojson.value = res
    }
  }).catch(e => {
    ElMessage.error(e?.message || 'TopoJSON 转换失败')
    dataStr_topojson.value = undefined
  })
}, { deep: true, immediate: true })

const handleDownloadTopojson = () => {
  if (!dataStr_topojson.value) {
    ElMessage.warning("没有数据可导出")
    return
  }
  const fileName = "topojson_" + new Date().getTime()
  const blob = new Blob([dataStr_topojson.value], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName + ".topojson"
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="gis-data-export-container">
    <!-- 导出类型切换 -->
    <div class="export-type-switcher">
      <el-segmented v-model="exportType" :options="[
        { value: 'geojson', label: 'GeoJson' },
        { value: 'topojson', label: 'TopoJSON' },
        { value: 'wkt', label: 'WKT' },
        { value: 'exchange', label: '电子报盘' }
      ]" size="small"
/>
    </div>

    <!-- GeoJson 导出 -->
    <div v-if="exportType === 'geojson'" class="export-panel">
      <!-- 编辑器预览（顶部，占据主要空间） -->
      <div class="export-editor">
        <geo-str-editor
          v-if="geoJsonType !== 'FeatureSplit'"
          :value="dataStr_Geojson"
          language="geojson"
          :read-only="true"
        />
        <geo-str-editor
          v-else
          :value="curGeo"
          language="geojson"
          :read-only="true"
        />
      </div>

      <!-- FeatureSplit 要素列表 -->
      <div v-if="geoJsonType === 'FeatureSplit'" class="feature-split-view">
        <div class="split-header">
          <el-select v-model="titleField" size="small" placeholder="标题字段" clearable>
            <el-option label="默认" value="" />
            <el-option v-for="k in allPropertyKeys" :key="k" :label="k" :value="k" />
          </el-select>
        </div>
        <div class="split-cards">
          <div
            v-for="(f, idx) in data?.features ?? []"
            :key="idx"
            class="feature-card"
            :class="{ active: splitFeatureIdx === idx }"
            @click="splitFeatureIdx = idx"
          >
            <div class="card-title">{{ featureCardTitle(f, idx) }}</div>
            <div class="card-meta">
              <GeoTypeIconRender v-if="f.geometry?.type" :type="f.geometry.type" :size="12" />
              <span class="card-type">{{ f.geometry?.type }}</span>
              <span class="card-vertices">{{ featureVertexCount(f) }} 顶点</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 选项和操作区域（底部） -->
      <div class="export-bottom-bar">
        <el-radio-group v-model="geoJsonType" size="small">
          <el-radio-button value="FeatureCollection">
            <ModeIconRender mode="collection" :size="14" />
          </el-radio-button>
          <el-radio-button value="FeatureListArray">
            <ModeIconRender mode="array" :size="14" />
          </el-radio-button>
          <el-radio-button value="FeatureSplit">
            <ModeIconRender mode="split" :size="14" />
          </el-radio-button>
        </el-radio-group>
        <div class="export-bottom-right">
          <el-checkbox v-model="includeCrs" :disabled="!data?.crs?.isValid" size="small">CRS</el-checkbox>
          <el-select v-model="jsonFormat" size="small" style="width: 80px;">
            <el-option label="格式化" value="pretty" />
            <el-option label="压缩" value="compact" />
          </el-select>
          <el-button type="success" size="small" :icon="Download" @click="handleDownloadJson">JSON</el-button>
          <el-button type="success" size="small" :icon="Download" :loading="shpLoading" @click="handleDownloadShp">SHP</el-button>
        </div>
      </div>
    </div>

    <!-- Wkt 导出 -->
    <div v-else-if="exportType === 'wkt'" class="export-panel">
      <div class="export-editor">
        <geo-str-editor
          :value="wktType === 'GeometrySplit' ? dataStr_wkt.join(`\r\n\r\n\r\n`) : `GEOMETRYCOLLECTION(${dataStr_wkt.join(`,`)})`"
          language="wkt"
          :read-only="true"
        />
      </div>
      <div class="export-bottom-bar">
        <el-radio-group v-model="wktType" size="small">
          <el-radio-button value="GeometryCollection">
            <ModeIconRender mode="collection" :size="14" />
          </el-radio-button>
          <el-radio-button value="GeometrySplit">
            <ModeIconRender mode="split" :size="14" />
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 电子报盘导出 -->
    <div v-else-if="exportType === 'exchange'" class="export-panel">
      <div class="export-editor">
        <geo-str-editor :value="display_exchange" language="exchange" :read-only="true" />
      </div>
      <div class="export-bottom-bar">
        <el-radio-group v-model="exchangeDataType" size="small">
          <el-radio-button value="HasProperties">Has Props</el-radio-button>
          <el-radio-button value="NoProperties">No Props</el-radio-button>
        </el-radio-group>
        <el-button type="success" size="small" :icon="Download" @click="handleDownloadExchange">下载 TXT</el-button>
      </div>
    </div>

    <!-- TopoJSON 导出 -->
    <div v-else-if="exportType === 'topojson'" class="export-panel">
      <div class="export-editor">
        <geo-str-editor :value="dataStr_topojson" language="geojson" :read-only="true" />
      </div>
      <div class="export-bottom-bar">
        <div class="export-bottom-right">
          <el-select v-model="topojsonFormat" size="small" style="width: 80px;">
            <el-option label="格式化" value="pretty" />
            <el-option label="压缩" value="compact" />
          </el-select>
          <el-button type="success" size="small" :icon="Download" @click="handleDownloadTopojson">下载 TopoJSON</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-data-export-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.export-type-switcher {
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.export-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
  overflow: hidden;
}

.export-editor {
  flex: 1;
  overflow: hidden;
  min-height: 120px;
}

.export-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  padding: 6px 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.export-bottom-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.feature-split-view {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.split-header {
  padding: 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.split-cards {
  flex: 1;
  overflow: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-card {
  padding: 6px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.feature-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.card-type {
  color: var(--el-color-primary);
}

.card-vertices {
  color: var(--el-text-color-placeholder);
}
</style>
