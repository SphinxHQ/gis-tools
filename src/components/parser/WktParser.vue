<!-- <script lang="ts" setup>
/**
 * @file WKT parser component
 * @description A text editor with syntax highlighting for WKT (Well-Known Text) input,
 *              providing real-time parsing and map preview.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import {ElMessage} from "element-plus";
import {computed, ref} from "vue";

import GeomUtils from "~/common/GeomUtils";
import {logger} from "~/common/logger";
import {WktDataFormat} from "~/components/data/WktDataFormat";
import {eventBus} from "~/composables/eventBus";

import {GisMapAddFeaturesEvent} from "../gismap/events/GisMapEvents";

const props = defineProps({
  /** Map instance name for emitting events */
  mapName: {
    type: String,
    default: 'main'
  }
})

/** WKT text input */
const wktInput = ref('')
/** Parse error message */
const parseError = ref('')
/** Parsed GeoJSON features from successful parse */
const parsedFeatures = ref<GeoJSON.Feature[]>([])
/** Whether parsing is in progress */
const isParsing = ref(false)

/** Whether there is any text input */
const hasInput = computed(() => wktInput.value.trim().length > 0)
/** Whether features have been parsed */
const hasParsed = computed(() => parsedFeatures.value.length > 0)
/** Unique geometry types found in parsed features */
const geometryTypes = computed(() => {
  if (!hasParsed.value) return []
  return [...new Set(parsedFeatures.value.map(f => f.geometry.type))]
})
/** Total coordinate count across all parsed features */
const coordinateCount = computed(() => {
  if (!hasParsed.value) return 0
  return parsedFeatures.value.reduce((sum, f) => sum + GeomUtils.getCoordinatesCount(f as Record<string, unknown>), 0)
})

/** Parse the WKT input and extract features */
const handleParse = () => {
  parseError.value = ''
  parsedFeatures.value = []

  const wkt = wktInput.value.trim()
  if (!wkt) {
    parseError.value = '请输入WKT数据'
    return
  }

  isParsing.value = true
  const wktDataFormat = new WktDataFormat()
  wktDataFormat.read(wkt).then((data) => {
    parsedFeatures.value = data.features
    if (parsedFeatures.value.length === 0) {
      parseError.value = 'WKT解析结果为空，请检查格式'
    }
    isParsing.value = false
  }).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('WKT解析失败:', e)
    parseError.value = `WKT格式错误: ${msg}`
    isParsing.value = false
  })
}

const handleAddToMap = () => {
  if (parsedFeatures.value.length > 0) {
    const addFeaturesEvent = new GisMapAddFeaturesEvent(parsedFeatures.value, {clear: true})
    eventBus.emit(props.mapName, addFeaturesEvent)
    ElMessage.success(`已添加${parsedFeatures.value.length}个要素到地图`)
  }
}

const handleClear = () => {
  wktInput.value = ''
  parsedFeatures.value = []
  parseError.value = ''
}

const handleSample = (type: string) => {
  const samples: Record<string, string> = {
    'Point': 'POINT(116.4 39.9)',
    'LineString': 'LINESTRING(116.4 39.9, 117.2 40.1, 118.0 39.5)',
    'Polygon': 'POLYGON((116.4 39.9, 117.2 40.1, 117.0 39.0, 116.4 39.9))',
    'MultiPolygon': 'MULTIPOLYGON(((116.4 39.9, 117.2 40.1, 117.0 39.0, 116.4 39.9)),((118.0 40.0, 119.0 40.5, 118.5 39.5, 118.0 40.0)))',
    'GeometryCollection': 'GEOMETRYCOLLECTION(POINT(116.4 39.9),LINESTRING(116.4 39.9, 117.2 40.1))',
  }
  wktInput.value = samples[type] || ''
  parseError.value = ''
  parsedFeatures.value = []
}
</script>

<template>
  <div class="wkt-parser-container">
    <div class="wkt-parser-input">
      <el-input
        v-model="wktInput"
        type="textarea"
        :rows="6"
        placeholder="请输入WKT格式数据，如：POINT(116.4 39.9)&#10;LINESTRING(116.4 39.9, 117.2 40.1)&#10;POLYGON((116.4 39.9, 117.2 40.1, 117.0 39.0, 116.4 39.9))"
        :disabled="isParsing"
      />
    </div>
    <div class="wkt-parser-samples">
      <span class="sample-label">示例：</span>
      <el-button size="small" link type="primary" @click="handleSample('Point')">Point</el-button>
      <el-button size="small" link type="primary" @click="handleSample('LineString')">LineString</el-button>
      <el-button size="small" link type="primary" @click="handleSample('Polygon')">Polygon</el-button>
      <el-button size="small" link type="primary" @click="handleSample('MultiPolygon')">MultiPolygon</el-button>
      <el-button size="small" link type="primary" @click="handleSample('GeometryCollection')">GeometryCollection</el-button>
    </div>
    <div class="wkt-parser-actions">
      <el-button :disabled="!hasInput || isParsing" :loading="isParsing" type="primary" @click="handleParse">解析</el-button>
      <el-button @click="handleClear">清空</el-button>
      <el-button :disabled="!hasParsed" type="success" @click="handleAddToMap">添加到地图</el-button>
    </div>
    <div v-if="parseError" class="wkt-parser-error">
      <el-alert :title="parseError" type="error" show-icon :closable="false" />
    </div>
    <div v-if="hasParsed" class="wkt-parser-result">
      <el-descriptions title="解析结果" :column="2" border size="small">
        <el-descriptions-item label="要素">{{ parsedFeatures.length }}</el-descriptions-item>
        <el-descriptions-item label="坐标">{{ coordinateCount }}</el-descriptions-item>
        <el-descriptions-item label="类型" :span="2">{{ geometryTypes.join(', ') }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<style scoped>
.wkt-parser-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 8px;
  gap: 8px;
}

.wkt-parser-input {
  flex: 1;
  min-height: 120px;
}

.wkt-parser-input :deep(.el-textarea__inner) {
  height: 100% !important;
}

.wkt-parser-samples {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.sample-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.wkt-parser-actions {
  display: flex;
  gap: 8px;
}

.wkt-parser-error {
  margin-top: 4px;
}

.wkt-parser-result {
  margin-top: 4px;
}
</style> -->
