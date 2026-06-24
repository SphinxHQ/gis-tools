<script setup lang="ts">
/**
 * @file Geometry type icon render
 * @description Renders a geometry type icon based on the feature type.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */

/**
 * 几何类型图标渲染组件
 * 使用 src/assets/geo-icons/ 下的纯色 SVG 作为固定资产
 * 语义色：点=蓝 线=绿 面=橙  集合=灰
 */
import { computed } from 'vue'

import collectionIcon from '~/assets/geo-icons/collection.svg'
import lineIcon from '~/assets/geo-icons/line.svg'
import multilineIcon from '~/assets/geo-icons/multiline.svg'
import multipointIcon from '~/assets/geo-icons/multipoint.svg'
import multipolygonIcon from '~/assets/geo-icons/multipolygon.svg'
import pointIcon from '~/assets/geo-icons/point.svg'
import polygonIcon from '~/assets/geo-icons/polygon.svg'

const props = withDefaults(defineProps<{
  /** Geometry type string (e.g., 'Point', 'Polygon') */
  type?: string
  /** Icon size in pixels */
  size?: number
}>(), {
  size: 14,
})

/** Map from geometry type to its SVG icon URL */
const ICON_MAP: Record<string, string> = {
  Point: pointIcon,
  MultiPoint: multipointIcon,
  LineString: lineIcon,
  MultiLineString: multilineIcon,
  Polygon: polygonIcon,
  MultiPolygon: multipolygonIcon,
  GeometryCollection: collectionIcon,
}

/** Computed icon source URL, defaults to collection icon for unknown types */
 const src = computed(() => props.type ? (ICON_MAP[props.type] ?? collectionIcon) : collectionIcon)
</script>

<template>
  <img :src="src" :width="size" :height="size" class="geo-type-icon-render" alt="" />
</template>
<style scoped>
.geo-type-icon-render {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
