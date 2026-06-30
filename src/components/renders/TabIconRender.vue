<script setup lang="ts">
/**
 * @file Tab icon render
 * @description Renders bottom tab bar icons as inline SVG (currentColor inherits parent CSS color).
 *              Tabs: crs (globe with graticule), feature (map pin), validate (check badge),
 *              export (document with arrow), vertex (triangle with nodes).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-27
 */

withDefaults(defineProps<{
  /** Tab name: crs, feature, validate, export, vertex */
  tab?: string
  /** Icon size in pixels */
  size?: number
}>(), {
  tab: '',
  size: 20,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    class="tab-icon"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- crs: 坐标系（地球 + 经纬线，表达地理坐标系） -->
    <template v-if="tab === 'crs'">
      <circle cx="8" cy="8" r="6" />
      <ellipse cx="8" cy="8" rx="6" ry="2.4" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2.5" y1="6" x2="13.5" y2="6" opacity="0.5" />
      <line x1="2.5" y1="10" x2="13.5" y2="10" opacity="0.5" />
    </template>

    <!-- feature: 要素（地图图钉，表达地图上的地理要素） -->
    <template v-else-if="tab === 'feature'">
      <path d="M8 2 C5.2 2 3 4.2 3 7 C3 10 8 14 8 14 C8 14 13 10 13 7 C13 4.2 10.8 2 8 2 Z" />
      <circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" />
    </template>

    <!-- validate: 校验（盾牌 + 勾号，表达数据质量校验） -->
    <template v-else-if="tab === 'validate'">
      <path d="M8 2 L13 4 L13 8 C13 11 8 14 8 14 C8 14 3 11 3 8 L3 4 Z" />
      <polyline points="5.5,8 7,9.5 10.5,6" />
    </template>

    <!-- export: 导出（文档 + 向右箭头，表达数据导出输出） -->
    <template v-else-if="tab === 'export'">
      <path d="M3 3 L3 13 L9 13" />
      <path d="M3 5 L11 5 L11 8" />
      <path d="M9 11 L14 11 M12 9 L14 11 L12 13" />
    </template>

    <!-- vertex: 顶点（三角形 + 实心顶点节点，表达几何顶点） -->
    <template v-else-if="tab === 'vertex'">
      <polygon points="8,3.5 13,12 3,12" opacity="0.4" />
      <circle cx="8" cy="3.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="13" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </template>

    <!-- fallback: 空圆环 -->
    <template v-else>
      <circle cx="8" cy="8" r="4" />
    </template>
  </svg>
</template>

<style scoped>
.tab-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
