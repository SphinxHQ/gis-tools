<script setup lang="ts">
/**
 * @file Vertex count render
 * @description Renders vertex count with color gradient from green to red.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */

import { computed } from 'vue'
/**
 * 顶点数分级渲染
 * 从绿色(0)到红色(max)线性插值，用于直观展示顶点数量级别
 * 默认 max=20000，即 20000 顶点为纯红
 */
const props = withDefaults(defineProps<{
  /** Vertex count to display */
  count: number
  /** Maximum count for the red end of the gradient */
  max?: number
}>(), {
  max: 20000,
})

/** Text color interpolated from green (0) to red (max) */
const color = computed(() => {
  const ratio = Math.min(props.count / props.max, 1)
  const hue = 120 * (1 - ratio)
  return `hsl(${hue}, 70%, 45%)`
})

/** Background color (lighter variant) for the tag */
const bgColor = computed(() => {
  const ratio = Math.min(props.count / props.max, 1)
  const hue = 120 * (1 - ratio)
  return `hsla(${hue}, 70%, 45%, 0.12)`
})

const formatted = computed(() => {
  if (props.count >= 10000) return `${(props.count / 10000).toFixed(1)}万`
  return props.count.toLocaleString()
})
</script>

<template>
  <span class="vertex-count-render" :style="{ color, backgroundColor: bgColor }">
    {{ formatted }}
  </span>
</template>

<style scoped>
.vertex-count-render {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
  white-space: nowrap;
}
</style>
