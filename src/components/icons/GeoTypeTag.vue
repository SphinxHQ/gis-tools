<script setup lang="ts">
/**
 * 几何类型小标签：图标 + 汉字
 * 用于数据信息、历史记录等处的类型展示
 */
import { computed } from 'vue'
import GeomUtils from '~/common/GeomUtils'
import GeoTypeIcon from './GeoTypeIcon.vue'

const props = withDefaults(defineProps<{
  type?: string
  size?: number
}>(), {
  size: 14,
})

const name = computed(() => props.type ? GeomUtils.getTypeName(props.type) : '未知')
</script>

<template>
  <span class="geo-type-tag">
    <GeoTypeIcon :type="type" :size="size" />
    <span class="geo-type-tag-text">{{ name }}</span>
  </span>
</template>

<style scoped>
.geo-type-tag {
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
.geo-type-tag-text {
  color: var(--gis-text-secondary);
}
</style>
