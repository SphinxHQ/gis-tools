<!-- <script lang="ts" setup>
/**
 * @file GeoJSON parser component
 * @description Text editor with syntax highlighting for GeoJSON input.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */

import {ElMessage} from "element-plus";
import {computed, ref} from "vue";

import {logger} from "~/common/logger";
import {GeoJsonDataFormat} from "~/components/data/GeoJsonDataFormat";
import GisDataInfo from "~/components/data/GisDataInfo";
import {eventBus} from "~/composables/eventBus";

import {GisMapAddFeaturesEvent} from "../gismap/events/GisMapEvents";

const props = defineProps({
  /** Map instance name for emitting events */
  mapName: {
    type: String,
    default: 'main'
  }
})

/** GeoJSON text input */
const geojsonInput = ref('')
/** Validation error message */
const validationError = ref('')
/** Whether the input has passed validation */
const isValid = ref(false)
/** Parsed GeoJSON features from successful validation */
const parsedFeatures = ref<GeoJSON.Feature[]>([])
/** Whether validation is in progress */
const isValidating = ref(false)

/** Whether there is any text input */
const hasInput = computed(() => geojsonInput.value.trim().length > 0)
/** Whether features have been parsed */
const hasParsed = computed(() => parsedFeatures.value.length > 0)
/** Unique geometry types found in parsed features */
const geometryTypes = computed(() => {
  if (!hasParsed.value) return []
  return [...new Set(parsedFeatures.value.map(f => f.geometry.type))]
})

/** Validate the GeoJSON input: parse JSON, check structure, and extract features */
const handleValidate = () => {
  validationError.value = ''
  isValid.value = false
  parsedFeatures.value = []

  const input = geojsonInput.value.trim()
  if (!input) {
    validationError.value = '请输入GeoJSON数据'
    return
  }

  let jsonObj: unknown
  try {
    jsonObj = JSON.parse(input)
  } catch (e) {
    validationError.value = `JSON语法错误: ${(e as Error).message}`
    return
  }

  if (!jsonObj || typeof jsonObj !== 'object') {
    validationError.value = '数据不是有效的JSON对象'
    return
  }

  const obj = jsonObj as Record<string, unknown>
  if (!obj.type) {
    validationError.value = 'GeoJSON缺少type字段'
    return
  }

  const validTypes = ['Feature', 'FeatureCollection', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection']
  if (!validTypes.includes(obj.type as string)) {
    validationError.value = `不支持的GeoJSON类型: ${obj.type}`
    return
  }

  if (obj.type === 'Feature') {
    if (!obj.geometry || typeof obj.geometry !== 'object') {
      validationError.value = 'Feature缺少geometry字段'
      return
    }
    const geom = obj.geometry as Record<string, unknown>
    if (!geom.type || !geom.coordinates) {
      validationError.value = 'Feature的geometry缺少type或coordinates字段'
      return
    }
  } else if (obj.type === 'FeatureCollection') {
    if (!Array.isArray(obj.features)) {
      validationError.value = 'FeatureCollection缺少features数组'
      return
    }
  }

  isValidating.value = true
  const geoJsonDataFormat = new GeoJsonDataFormat()
  geoJsonDataFormat.read(input).then((data: GisDataInfo) => {
    parsedFeatures.value = data.features
    isValid.value = true
    if (parsedFeatures.value.length === 0) {
      validationError.value = 'GeoJSON解析结果为空'
      isValid.value = false
    }
    isValidating.value = false
  }).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('GeoJSON验证失败:', e)
    validationError.value = `GeoJSON验证失败: ${msg}`
    isValidating.value = false
  })
}

/** Format the JSON input with 2-space indentation */
const handleFormat = () => {
  try {
    const obj = JSON.parse(geojsonInput.value)
    geojsonInput.value = JSON.stringify(obj, null, 2)
  } catch (e) {
    ElMessage.error('JSON格式错误，无法格式化')
  }
}

/** Add parsed features to the map via event bus */
const handleAddToMap = () => {
  if (parsedFeatures.value.length > 0) {
    const addFeaturesEvent = new GisMapAddFeaturesEvent(parsedFeatures.value, {clear: true})
    eventBus.emit(props.mapName, addFeaturesEvent)
    ElMessage.success(`已添加${parsedFeatures.value.length}个要素到地图`)
  }
}

/** Clear all input and validation state */
const handleClear = () => {
  geojsonInput.value = ''
  validationError.value = ''
  isValid.value = false
  parsedFeatures.value = []
}

/** Load a sample GeoJSON string for the given geometry type */
const handleSample = (type: string) => {
  const samples: Record<string, string> = {
    'Point': '{"type":"Feature","geometry":{"type":"Point","coordinates":[116.4,39.9]},"properties":{}}',
    'LineString': '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[116.4,39.9],[117.2,40.1],[118.0,39.5]]},"properties":{}}',
    'Polygon': '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[116.4,39.9],[117.2,40.1],[117.0,39.0],[116.4,39.9]]]},"properties":{}}',
    'FeatureCollection': '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[116.4,39.9]},"properties":{"name":"北京"}},{"type":"Feature","geometry":{"type":"Point","coordinates":[121.5,31.2]},"properties":{"name":"上海"}}]}',
  }
  geojsonInput.value = samples[type] || ''
  validationError.value = ''
  isValid.value = false
  parsedFeatures.value = []
  try {
    const obj = JSON.parse(geojsonInput.value)
    geojsonInput.value = JSON.stringify(obj, null, 2)
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="geojson-parser-container">
    <div class="geojson-parser-input">
      <el-input
        v-model="geojsonInput"
        type="textarea"
        :rows="8"
        placeholder="请输入GeoJSON格式数据"
        :disabled="isValidating"
      />
    </div>
    <div class="geojson-parser-samples">
      <span class="sample-label">示例：</span>
      <el-button size="small" link type="primary" @click="handleSample('Point')">Point</el-button>
      <el-button size="small" link type="primary" @click="handleSample('LineString')">LineString</el-button>
      <el-button size="small" link type="primary" @click="handleSample('Polygon')">Polygon</el-button>
      <el-button size="small" link type="primary" @click="handleSample('FeatureCollection')">FeatureCollection</el-button>
    </div>
    <div class="geojson-parser-actions">
      <el-button :disabled="!hasInput || isValidating" :loading="isValidating" type="primary" @click="handleValidate">验证</el-button>
      <el-button :disabled="!hasInput" @click="handleFormat">格式化</el-button>
      <el-button @click="handleClear">清空</el-button>
      <el-button :disabled="!isValid || !hasParsed" type="success" @click="handleAddToMap">添加到地图</el-button>
    </div>
    <div v-if="validationError" class="geojson-parser-error">
      <el-alert :title="validationError" type="error" show-icon :closable="false" />
    </div>
    <div v-if="isValid && hasParsed" class="geojson-parser-result">
      <el-alert title="验证通过" type="success" show-icon :closable="false" />
      <el-descriptions :column="2" border size="small" style="margin-top: 8px">
        <el-descriptions-item label="要素">{{ parsedFeatures.length }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ geometryTypes.join(', ') }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<style scoped>
.geojson-parser-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 8px;
  gap: 8px;
}

.geojson-parser-input {
  flex: 1;
  min-height: 160px;
}

.geojson-parser-input :deep(.el-textarea__inner) {
  height: 100% !important;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.geojson-parser-samples {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.sample-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.geojson-parser-actions {
  display: flex;
  gap: 8px;
}

.geojson-parser-error {
  margin-top: 4px;
}

.geojson-parser-result {
  margin-top: 4px;
}
</style> -->
