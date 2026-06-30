<script setup lang="ts">
/**
 * @file Mode icon render
 * @description Renders mode icons as inline SVG (currentColor inherits parent CSS color).
 *              Modes: datasource (database), dataset (table), collection ({}), array ([]), split (fork).
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-27
 */

withDefaults(defineProps<{
  /** Mode type: datasource, dataset, collection, array, split */
  mode?: string
  /** Icon size in pixels */
  size?: number
}>(), {
  mode: 'datasource',
  size: 16,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    class="mode-icon"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- datasource: 数据源（圆柱形数据库） -->
    <template v-if="mode === 'datasource'">
      <ellipse cx="8" cy="3.5" rx="5" ry="1.8" />
      <path d="M3 3.5 L3 12.5 C3 13.5 5.24 14.3 8 14.3 C10.76 14.3 13 13.5 13 12.5 L13 3.5" />
      <path d="M3 8 C3 9 5.24 9.8 8 9.8 C10.76 9.8 13 9 13 8" />
    </template>

    <!-- dataset: 数据集（表格） -->
    <template v-else-if="mode === 'dataset'">
      <rect x="2" y="3" width="12" height="10" rx="0.5" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="9" x2="14" y2="9" />
      <line x1="6" y1="3" x2="6" y2="13" />
      <line x1="10" y1="3" x2="10" y2="13" />
    </template>

    <!-- collection: FeatureCollection（大括号 {}） -->
    <template v-else-if="mode === 'collection'">
      <path d="M6.5 2 Q4.5 2 4.5 4 L4.5 7 Q4.5 8 2.5 8 Q4.5 8 4.5 9 L4.5 12 Q4.5 14 6.5 14" />
      <path d="M9.5 2 Q11.5 2 11.5 4 L11.5 7 Q11.5 8 13.5 8 Q11.5 8 11.5 9 L11.5 12 Q11.5 14 9.5 14" />
    </template>

    <!-- array: FeatureListArray（方括号 [] + 三元素） -->
    <template v-else-if="mode === 'array'">
      <path d="M5 2 L2.5 2 L2.5 14 L5 14" />
      <path d="M11 2 L13.5 2 L13.5 14 L11 14" />
      <rect x="5.5" y="5.5" width="1.5" height="5" fill="currentColor" stroke="none" />
      <rect x="7.25" y="5.5" width="1.5" height="5" fill="currentColor" stroke="none" />
      <rect x="9" y="5.5" width="1.5" height="5" fill="currentColor" stroke="none" />
    </template>

    <!-- split: FeatureSplit（一个源分叉成多个） -->
    <template v-else-if="mode === 'split'">
      <rect x="6" y="1.5" width="4" height="3" rx="0.5" />
      <rect x="1.5" y="11.5" width="4" height="3" rx="0.5" />
      <rect x="10.5" y="11.5" width="4" height="3" rx="0.5" />
      <path d="M8 4.5 L8 6.5 L3.5 9.5 L3.5 11.5" />
      <path d="M8 6.5 L12.5 9.5 L12.5 11.5" />
    </template>

    <!-- fallback: database -->
    <template v-else>
      <ellipse cx="8" cy="3.5" rx="5" ry="1.8" />
      <path d="M3 3.5 L3 12.5 C3 13.5 5.24 14.3 8 14.3 C10.76 14.3 13 13.5 13 12.5 L13 3.5" />
      <path d="M3 8 C3 9 5.24 9.8 8 9.8 C10.76 9.8 13 9 13 8" />
    </template>
  </svg>
</template>

<style scoped>
.mode-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
