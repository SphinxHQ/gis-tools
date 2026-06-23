<script setup lang="ts">
import { CrsInfo } from '~/components/data/GisProjectedBounds'
import GisCrsSelector from '~/components/data/GisCrsSelector.vue'

/**
 * 坐标系转换选择器 —— GisCrsSelector 的薄包装层
 * 复用 GisCrsSelector 的搜索、分组列表、详情展示
 * 取消/确认按钮由 GisCrsSelector 自带
 */
const props = defineProps<{
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
