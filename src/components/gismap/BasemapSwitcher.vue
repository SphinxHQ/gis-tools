<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { logger } from '~/common/logger'
import { TianDiTuGisMapLayer } from '~/components/gismap/layer/GisLayer'
import {
  buildTianDiTuLayerUrl,
  checkTianDiTuAvailability,
  getTianDiTuProjSuffix,
  TIAN_DI_TU_BASEMAPS,
  type TianDiTuBasemapType,
} from '~/components/gismap/tiandituConfig'
import type { GisMapLayer } from '~/components/gismap/layer/GisLayer'

/**
 * 底图类型
 * - none: 无底图
 * - local: 本地底图（保留当前底图）
 * - vec: 天地图矢量（矢量底图 + 矢量注记）
 * - img: 天地图影像（影像底图 + 影像注记）
 */
type BasemapId = 'none' | 'local' | TianDiTuBasemapType

interface BasemapOption {
  id: BasemapId
  label: string
  icon: string
  available: boolean
}

const props = defineProps<{
  /** 获取当前地图视图投影代码 */
  getViewProjCode: () => string
  /** 切换底图图层组 */
  onSwitchBasemap: (layers: GisMapLayer[]) => void
  /** 获取当前本地底图图层组（用于切回本地） */
  getLocalBaseLayers: () => GisMapLayer[]
  /** 初始底图类型，用于设置初始选中状态和降级判断 */
  initialBasemap?: 'none' | 'local' | 'vec' | 'img'
}>()

const currentBasemap = ref<BasemapId>(props.initialBasemap ?? 'none')
const tianDiTuAvailable = ref(false)
const checking = ref(false)

const basemapOptions = computed<BasemapOption[]>(() => [
  {
    id: 'vec',
    label: '矢量',
    icon: '🗺️',
    available: tianDiTuAvailable.value,
  },
  {
    id: 'img',
    label: '影像',
    icon: '🛰️',
    available: tianDiTuAvailable.value,
  },
  {
    id: 'local',
    label: '本地',
    icon: '📍',
    available: true,
  },
  {
    id: 'none',
    label: '无',
    icon: '✕',
    available: true,
  },
])

/**
 * 构建天地图底图图层组
 */
function buildTianDiTuLayers(type: TianDiTuBasemapType): GisMapLayer[] {
  const config = TIAN_DI_TU_BASEMAPS[type]
  const projCode = props.getViewProjCode()
  const suffix = getTianDiTuProjSuffix(projCode)
  return [
    new TianDiTuGisMapLayer({ url: buildTianDiTuLayerUrl(config.baseLayer.type, suffix), zIndex: -1 }),
    new TianDiTuGisMapLayer({ url: buildTianDiTuLayerUrl(config.annotationLayer.type, suffix), zIndex: -1 }),
  ]
}

/**
 * 切换底图
 */
function handleSwitch(id: BasemapId): void {
  const option = basemapOptions.value.find(o => o.id === id)
  if (!option || !option.available) {
    logger.warn(`底图 ${id} 不可用`)
    return
  }

  let layers: GisMapLayer[]
  if (id === 'none') {
    layers = []
  } else if (id === 'local') {
    layers = props.getLocalBaseLayers()
  } else {
    layers = buildTianDiTuLayers(id)
  }

  props.onSwitchBasemap(layers)
  currentBasemap.value = id
  logger.info(`底图已切换至: ${option.label}`)
}

/**
 * 检测天地图可达性
 * 内部已自动探测并轮换 key（多个 key 时选第一个可用的）
 */
async function checkAvailability(): Promise<void> {
  checking.value = true
  try {
    tianDiTuAvailable.value = await checkTianDiTuAvailability()
  } finally {
    checking.value = false
  }
  // 如果天地图不可用且当前选中的是天地图底图，切回本地底图
  if (!tianDiTuAvailable.value && (currentBasemap.value === 'vec' || currentBasemap.value === 'img')) {
    handleSwitch('local')
  }
}

onMounted(() => {
  void checkAvailability()
})
</script>

<template>
  <div class="gismap-btns-wrap">
    <div class="basemap-switcher gismap-btns">
      <button
        v-for="option in basemapOptions"
        :key="option.id"
        type="button"
        class="gismap-btn"
        :class="{
          active: currentBasemap === option.id,
          disabled: !option.available,
        }"
        :title="option.available ? option.label : `${option.label}（不可用）`"
        :disabled="!option.available"
        @click="handleSwitch(option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 .gismap-btns / .gismap-btn 样式 */
</style>
