<script setup lang="ts">
import { computed } from 'vue'
/**
 * 顶点数分级徽标
 * 从绿色(0)到红色(max)线性插值，用于直观展示顶点数量级别
 * 默认 max=20000，即 20000 顶点为纯红
 */
const props = withDefaults(defineProps<{
  count: number
  max?: number
}>(), {
  max: 20000,
})

const color = computed(() => {
  const ratio = Math.min(props.count / props.max, 1)
  const hue = 120 * (1 - ratio)
  return `hsl(${hue}, 70%, 45%)`
})

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
  <span class="vertex-badge" :style="{ color, backgroundColor: bgColor }">
    {{ formatted }}
  </span>
</template>

<style scoped>
.vertex-badge {
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
