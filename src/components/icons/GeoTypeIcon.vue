<script setup lang="ts">
/**
 * 几何类型图标组件
 * 使用 src/assets/geo-icons/ 下的纯色 SVG 作为固定资产
 * 语义色：点=蓝 线=绿 面=橙 集合=灰
 */
import { computed } from 'vue'

import pointIcon from '~/assets/geo-icons/point.svg'
import multipointIcon from '~/assets/geo-icons/multipoint.svg'
import lineIcon from '~/assets/geo-icons/line.svg'
import multilineIcon from '~/assets/geo-icons/multiline.svg'
import polygonIcon from '~/assets/geo-icons/polygon.svg'
import multipolygonIcon from '~/assets/geo-icons/multipolygon.svg'
import collectionIcon from '~/assets/geo-icons/collection.svg'

const props = withDefaults(defineProps<{
  type?: string
  size?: number
}>(), {
  size: 14,
})

const ICON_MAP: Record<string, string> = {
  Point: pointIcon,
  MultiPoint: multipointIcon,
  LineString: lineIcon,
  MultiLineString: multilineIcon,
  Polygon: polygonIcon,
  MultiPolygon: multipolygonIcon,
  GeometryCollection: collectionIcon,
}

const src = computed(() => props.type ? (ICON_MAP[props.type] ?? collectionIcon) : collectionIcon)
</script>

<template>
  <img :src="src" :width="size" :height="size" class="geo-type-icon" alt="" />
</template>

<style scoped>
.geo-type-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
