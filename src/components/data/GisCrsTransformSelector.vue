<script setup lang="ts">
/**
 * @file CRS transform selector component
 * @description A combined source/target CRS selector pair for coordinate transformation,
 *              with swap button and validation feedback.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-13
 */
import GisCrsSelector from '~/components/data/GisCrsSelector.vue'
import { CrsInfo } from '~/components/data/GisProjectedBounds'

/**
 * 坐标系转换选择器 —— GisCrsSelector 的薄包装层
 * 复用 GisCrsSelector 的搜索、分组列表、详情展示
 * 取消/确认按钮由 GisCrsSelector 自带
 */
defineProps<{
  sourceCrs: CrsInfo | null
  existingEpsgCodes: number[]
}>()

const emit = defineEmits<{
  select: [value: CrsInfo]
  cancel: []
}>()

const handleChange = (crs: CrsInfo) => {
  emit('select', crs)
}
</script>

<template>
  <GisCrsSelector
    mode="compatible"
    :source-crs="sourceCrs"
    :disable-values="existingEpsgCodes"
    :show-source-info="true"
    confirm-text="转换"
    @change="handleChange"
    @cancel="emit('cancel')"
  />
</template>
