<script setup lang="ts">
import { computed } from 'vue'

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
</script>

<template>
  <div class="gis-data-overview">
    <div class="overview-card">
      <div class="overview-header">
        <span class="overview-title">{{ props.data?.name || '未命名' }}</span>
        <el-tag v-if="hasValidCrs" size="small" type="info" effect="plain">
          EPSG:{{ props.data?.crs?.epsgCode }}
        </el-tag>
      </div>

      <div class="overview-body">
        <div class="overview-item">
          <span class="overview-label">要素数量</span>
          <span class="overview-value">{{ props.data?.features?.length ?? 0 }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">几何类型</span>
          <div v-if="geometryTypes.length" class="overview-types">
            <GeoTypeRender v-for="t in geometryTypes" :key="t" :type="t" />
          </div>
          <span v-else class="overview-value">无</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">总顶点数</span>
          <VertexCountRender :count="totalVertexCount" />
        </div>
        <div v-if="crsInfo" class="overview-item">
          <span class="overview-label">坐标系</span>
          <CrsInfoRender :crs-info="crsInfo" display="name" type="info" />
        </div>
        <div v-if="crsInfo" class="overview-item">
          <span class="overview-label">坐标系类型</span>
          <CrsInfoRender :crs-info="crsInfo" display="projected" />
        </div>
      </div>

      <!-- 转换链溯源 -->
      <div v-if="transformChain.length > 1" class="transform-chain">
        <span class="chain-label">转换历程：</span>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-data-overview {
  padding: 8px;
}

.overview-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.overview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.overview-body {
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.overview-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.overview-value {
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.overview-types {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.transform-chain {
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  background: var(--el-fill-color-lighter);
}

.chain-label {
  color: var(--el-text-color-secondary);
}

.chain-node {
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-color-primary);
  transition: background 0.2s;
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
}
</style>
