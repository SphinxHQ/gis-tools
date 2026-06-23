<script setup lang="ts">
import { computed } from 'vue'
import { Location, DataLine, Histogram, Coordinate } from '@element-plus/icons-vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import CrsInfoRender from '~/components/renders/CrsInfoRender.vue'
import VertexCountRender from '~/components/renders/VertexCountRender.vue'
import GeoTypeRender from '~/components/renders/GeoTypeRender.vue'

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  transformChain: {
    type: Array as () => number[],
    default: () => []
  },
  mode: {
    type: String as () => 'full' | 'compact',
    default: 'full'
  }
})

const emit = defineEmits<{
  'navigate-chain': [epsgCode: number]
}>()

const hasFeatures = computed(() => {
  return props.data?.features?.length > 0
})

const hasValidCrs = computed(() => {
  const crs = props.data?.crs
  return crs && crs.epsgCode > 0 && crs.isValid
})

const crsInfo = computed(() => props.data?.crs?.crsInfo ?? null)

const totalVertexCount = computed(() => props.data?.getTotalVertexCount?.() ?? 0)
const geometryTypes = computed(() => props.data?.getTypes?.() ?? [])

const isCompact = computed(() => props.mode === 'compact')
</script>

<template>
  <div class="gis-data-status-bar" :class="{ 'is-compact': isCompact }">
    <!-- 数据名称 -->
    <div class="status-item status-name">
      <el-icon :size="14"><Location /></el-icon>
      <span class="status-text">{{ props.data?.name || '未命名' }}</span>
    </div>

    <!-- 要素数量 -->
    <div class="status-item">
      <el-icon :size="14"><DataLine /></el-icon>
      <span class="status-label" v-if="!isCompact">要素</span>
      <span class="status-value">{{ props.data?.features?.length ?? 0 }}</span>
    </div>

    <!-- 几何类型 -->
    <div v-if="geometryTypes.length" class="status-item">
      <template v-if="isCompact">
        <el-tooltip :content="geometryTypes.join(', ')" placement="top">
          <div class="status-types-compact">
            <GeoTypeRender v-for="t in geometryTypes" :key="t" :type="t" />
          </div>
        </el-tooltip>
      </template>
      <template v-else>
        <div class="status-types">
          <GeoTypeRender v-for="t in geometryTypes" :key="t" :type="t" />
        </div>
      </template>
    </div>

    <!-- 总顶点数 -->
    <div class="status-item">
      <el-icon :size="14"><Histogram /></el-icon>
      <span class="status-label" v-if="!isCompact">顶点</span>
      <VertexCountRender :count="totalVertexCount" />
    </div>

    <!-- 坐标系 -->
    <div v-if="hasValidCrs" class="status-item">
      <el-icon :size="14"><Coordinate /></el-icon>
      <template v-if="isCompact">
        <el-tooltip :content="crsInfo?.name || `EPSG:${props.data?.crs?.epsgCode}`" placement="top">
          <el-tag size="small" type="info" effect="plain">EPSG:{{ props.data?.crs?.epsgCode }}</el-tag>
        </el-tooltip>
      </template>
      <template v-else>
        <CrsInfoRender v-if="crsInfo" :crs-info="crsInfo" display="name" type="info" />
      </template>
    </div>

    <!-- 转换链溯源 -->
    <div v-if="transformChain.length > 1" class="status-item status-chain">
      <template v-if="isCompact">
        <el-tooltip placement="top">
          <template #content>
            <div class="chain-tooltip">
              <span v-for="(epsg, idx) in transformChain" :key="epsg">
                EPSG:{{ epsg }}<span v-if="idx < transformChain.length - 1"> → </span>
              </span>
            </div>
          </template>
          <span class="chain-compact">链: {{ transformChain.length }}</span>
        </el-tooltip>
      </template>
      <template v-else>
        <template v-for="(epsg, idx) in transformChain" :key="epsg">
          <span
            class="chain-node"
            :class="{ 'is-current': idx === transformChain.length - 1 }"
            @click="idx < transformChain.length - 1 && emit('navigate-chain', epsg)"
          >
            EPSG:{{ epsg }}
          </span>
          <span v-if="idx < transformChain.length - 1" class="chain-arrow">→</span>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gis-data-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  height: 28px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 12px;
}

.gis-data-status-bar.is-compact {
  gap: 10px;
  padding: 0 8px;
  height: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  flex-shrink: 0;
}

.status-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-compact .status-name {
  max-width: 120px;
}

.status-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-label {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.status-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.status-types {
  display: flex;
  align-items: center;
  gap: 2px;
}

.status-types-compact {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
}

.status-chain {
  margin-left: auto;
}

.chain-node {
  padding: 1px 4px;
  border-radius: 3px;
  cursor: pointer;
  color: var(--el-color-primary);
  transition: background 0.2s;
  font-size: 11px;
}

.chain-node:hover {
  background: var(--el-color-primary-light-9);
}

.chain-node.is-current {
  background: var(--el-color-primary);
  color: #fff;
  cursor: default;
}

.chain-node.is-current:hover {
  background: var(--el-color-primary);
}

.chain-arrow {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  margin: 0 2px;
}

.chain-compact {
  cursor: pointer;
  color: var(--el-color-primary);
  font-size: 11px;
}

.chain-tooltip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
