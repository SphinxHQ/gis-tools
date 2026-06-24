<script setup lang="ts">
/**
 * @file Geometry type render
 * @description Renders geometry type as a colored Element Plus tag.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */

/**
 * 几何类型渲染组件：图标 + 汉字
 * 用于数据信息、历史记录等处的类型展示
 */
import { computed } from 'vue'
import GeomUtils from '~/common/GeomUtils'
import GeoTypeIconRender from './GeoTypeIconRender.vue'

const props = withDefaults(defineProps<{
  type?: string
  size?: number
}>(), {
  size: 14,
})

const name = computed(() => props.type ? GeomUtils.getTypeName(props.type) : '未知')
</script>

<template>
  <span class="geo-type-render">
    <GeoTypeIconRender :type="type" :size="size" />
    <span class="geo-type-render-text">{{ name }}</span>
  </span>
</template>

<style scoped>
.geo-type-render {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px 1px 6px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  line-height: 1.6;
  white-space: nowrap;
}
.geo-type-render-text {
  color: var(--gis-text-secondary);
}
</style>
