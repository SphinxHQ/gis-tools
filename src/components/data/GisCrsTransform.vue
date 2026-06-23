<script lang="ts" setup>
import {ElMessage} from "element-plus";
import {computed, ref} from "vue";

import {
    formatPoint,
    parseBatchCoordinateInput,
    parseCoordinateInput,
    transformPoint,
    transformPoints,
    TransformResult
} from "~/common/coordinateTransform";
import {logger} from "~/common/logger";
import {CrsInfo} from "~/components/data/GisProjectedBounds";
import {eventBus} from "~/composables/eventBus";

import {GisMapAddFeaturesEvent} from "../gismap/events/GisMapEvents";

const props = defineProps({
  mapName: {
    type: String,
    default: 'main'
  }
})

const sourceCrsInfo = ref<CrsInfo | null>(null)
const targetCrsInfo = ref<CrsInfo | null>(null)
const inputMode = ref<'single' | 'batch'>('single')
const singleInput = ref('')
const batchInput = ref('')
const transformResults = ref<TransformResult[]>([])
const isTransforming = ref(false)

const sourceEpsg = computed(() => sourceCrsInfo.value?.epsgCode ?? 0)
const targetEpsg = computed(() => targetCrsInfo.value?.epsgCode ?? 0)
const canTransform = computed(() => {
  return sourceEpsg.value > 0 && targetEpsg.value > 0 && sourceEpsg.value !== targetEpsg.value
})
const hasResults = computed(() => transformResults.value.length > 0)
const successCount = computed(() => transformResults.value.filter(r => r.success).length)
const failCount = computed(() => transformResults.value.filter(r => !r.success).length)

const handleSourceCrsChange = (crs: CrsInfo) => {
  sourceCrsInfo.value = crs
}

const handleTargetCrsChange = (crs: CrsInfo) => {
  targetCrsInfo.value = crs
}

const handleSwapCrs = () => {
  const temp = sourceCrsInfo.value
  sourceCrsInfo.value = targetCrsInfo.value
  targetCrsInfo.value = temp
}

const handleTransform = () => {
  if (!canTransform.value) {
    ElMessage.warning('请选择源坐标系和目标坐标系')
    return
  }

  isTransforming.value = true
  transformResults.value = []

  try {
    if (inputMode.value === 'single') {
      const point = parseCoordinateInput(singleInput.value)
      if (!point) {
        ElMessage.error('坐标格式错误，请输入如: 116.397428, 39.90923')
        isTransforming.value = false
        return
      }
      const result = transformPoint(point, sourceEpsg.value, targetEpsg.value)
      transformResults.value = [result]
    } else {
      const points = parseBatchCoordinateInput(batchInput.value)
      if (points.length === 0) {
        ElMessage.error('未找到有效坐标，每行一个坐标，格式: 116.397428, 39.90923')
        isTransforming.value = false
        return
      }
      transformResults.value = transformPoints(points, sourceEpsg.value, targetEpsg.value)
    }
  } catch (e) {
    logger.error('坐标转换失败:', e)
    ElMessage.error(`转换失败: ${(e as Error).message}`)
  }

  isTransforming.value = false
}

const handleCopyResult = () => {
  if (!hasResults.value) return
  const text = transformResults.value
    .map(r => r.success ? formatPoint(r.targetPoint) : `错误: ${r.error}`)
    .join('\n')
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const handleAddToMap = () => {
  const successResults = transformResults.value.filter(r => r.success)
  if (successResults.length === 0) return

  const features: GeoJSON.Feature[] = successResults.map((r, idx) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: r.targetPoint
    },
    properties: {
      id: idx,
      sourceCrs: r.sourceCrs,
      targetCrs: r.targetCrs,
      sourcePoint: formatPoint(r.sourcePoint),
      targetPoint: formatPoint(r.targetPoint)
    }
  }))

  const addFeaturesEvent = new GisMapAddFeaturesEvent(features, {clear: true})
  eventBus.emit(props.mapName, addFeaturesEvent)
  ElMessage.success(`已添加${features.length}个点到地图`)
}

const handleClear = () => {
  singleInput.value = ''
  batchInput.value = ''
  transformResults.value = []
}

const handleSample = (type: string) => {
  if (inputMode.value === 'single') {
    const samples: Record<string, string> = {
      'beijing': '116.397428, 39.90923',
      'shanghai': '121.473701, 31.230416',
      'guangzhou': '113.264385, 23.129112',
    }
    singleInput.value = samples[type] || ''
  } else {
    batchInput.value = '116.397428, 39.90923\n121.473701, 31.230416\n113.264385, 23.129112'
  }
  transformResults.value = []
}
</script>

<template>
  <div class="crs-transform-container">
    <el-form label-width="80px" size="small" class="crs-transform-form">
      <el-form-item label="源坐标系">
        <div v-if="sourceCrsInfo" class="crs-info-display">
          EPSG:{{ sourceCrsInfo.epsgCode }} - {{ sourceCrsInfo.name }}
        </div>
        <div v-else class="crs-info-placeholder">请选择源坐标系</div>
        <el-button size="small" @click="($refs.sourceDialog as any)?.show()">选择</el-button>
      </el-form-item>
      <el-form-item label="目标坐标系">
        <div v-if="targetCrsInfo" class="crs-info-display">
          EPSG:{{ targetCrsInfo.epsgCode }} - {{ targetCrsInfo.name }}
        </div>
        <div v-else class="crs-info-placeholder">请选择目标坐标系</div>
        <el-button size="small" @click="($refs.targetDialog as any)?.show()">选择</el-button>
      </el-form-item>
      <el-form-item>
        <el-button size="small" :disabled="!sourceCrsInfo || !targetCrsInfo" @click="handleSwapCrs">交换坐标系</el-button>
      </el-form-item>
      <el-form-item label="输入模式">
        <el-radio-group v-model="inputMode" @change="handleClear">
          <el-radio-button value="single">单点</el-radio-button>
          <el-radio-button value="batch">批量</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="inputMode === 'single'" label="输入坐标">
        <el-input v-model="singleInput" placeholder="116.397428, 39.90923" />
      </el-form-item>
      <el-form-item v-else label="输入坐标">
        <el-input v-model="batchInput" type="textarea" :rows="4" placeholder="每行一个坐标，格式: 116.397428, 39.90923" />
      </el-form-item>
      <el-form-item>
        <div class="crs-transform-samples">
          <span class="sample-label">示例：</span>
          <el-button size="small" link type="primary" @click="handleSample('beijing')">北京</el-button>
          <el-button size="small" link type="primary" @click="handleSample('shanghai')">上海</el-button>
          <el-button size="small" link type="primary" @click="handleSample('guangzhou')">广州</el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button :disabled="!canTransform" :loading="isTransforming" type="primary" @click="handleTransform">转换</el-button>
        <el-button @click="handleClear">清空</el-button>
        <el-button :disabled="!hasResults" type="success" @click="handleAddToMap">添加到地图</el-button>
        <el-button :disabled="!hasResults" @click="handleCopyResult">复制结果</el-button>
      </el-form-item>
    </el-form>

    <div v-if="hasResults" class="crs-transform-results">
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="总数">{{ transformResults.length }}</el-descriptions-item>
        <el-descriptions-item label="成功">
          <span style="color: var(--el-color-success)">{{ successCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="失败">
          <span v-if="failCount > 0" style="color: var(--el-color-danger)">{{ failCount }}</span>
          <span v-else>0</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-table :data="transformResults" size="small" max-height="200" style="margin-top: 8px">
        <el-table-column label="源坐标" min-width="180">
          <template #default="{ row }">
            {{ formatPoint(row.sourcePoint) }}
          </template>
        </el-table-column>
        <el-table-column label="目标坐标" min-width="180">
          <template #default="{ row }">
            <span v-if="row.success">{{ formatPoint(row.targetPoint) }}</span>
            <span v-else style="color: var(--el-color-danger)">失败</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误" min-width="120">
          <template #default="{ row }">
            <span v-if="row.error" style="color: var(--el-color-danger); font-size: 12px">{{ row.error }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog ref="sourceDialog" title="选择源坐标系" width="700" :append-to-body="true">
      <gis-crs-selector @change="(crs: CrsInfo) => { handleSourceCrsChange(crs); ($refs.sourceDialog as any).visible = false }" />
    </el-dialog>
    <el-dialog ref="targetDialog" title="选择目标坐标系" width="700" :append-to-body="true">
      <gis-crs-selector
        mode="compatible"
        :source-crs="sourceCrsInfo"
        :show-source-info="true"
        confirm-text="选择"
        @change="(crs: CrsInfo) => { handleTargetCrsChange(crs); ($refs.targetDialog as any).visible = false }"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.crs-transform-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 8px;
  gap: 8px;
  overflow-y: auto;
}

.crs-transform-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.crs-transform-form :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.crs-info-display {
  font-size: 13px;
  color: var(--el-text-color-primary);
  flex: 1;
  min-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crs-info-placeholder {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  flex: 1;
  min-width: 200px;
}

.crs-transform-samples {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sample-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.crs-transform-results {
  margin-top: 8px;
}
</style>
