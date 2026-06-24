<script setup lang="ts">
/**
 * @file CRS info render
 * @description Renders CRS information as an Element Plus tag with category color.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-23
 */

import { computed } from 'vue'

import { CrsInfo } from '~/components/data/GisProjectedBounds'
import { CrsCategory } from '~/enums'

/**
 * CrsInfo 字段渲染器
 * 通过 display 指定要展示的字段名，按字段类型映射到合适的 el-tag 样式
 *
 * 支持的 display 字段：
 *   - projected     投影 / 地理（使用 CrsCategory 枚举）
 *   - withZone      带带号 / 无带号
 *   - epsgCode      EPSG:xxxxx
 *   - name          坐标系名称
 *   - centralMeridian 中央经线
 *   - zoneNumber    带号
 *   - zoneDegree    分带度数
 *   - minLon / maxLon 经度范围
 *   - envelope      矩形范围
 *   - crs           crs.properties.name
 *   - 其它字段      按原始值渲染
 */
const props = withDefaults(defineProps<{
  crsInfo?: CrsInfo | null
  display: string
  size?: 'large' | 'default' | 'small'
  effect?: 'dark' | 'light' | 'plain'
  type?: 'primary' | 'success' | 'info' | 'warning' | 'danger'
}>(), {
  crsInfo: null,
  size: 'small',
  effect: 'light',
})

type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger'
type FieldConfig = {
  label: string
  tagType: TagType | ((v: any) => TagType)
  format: (v: any, info: CrsInfo) => string
}

const FIELD_MAP: Record<string, FieldConfig> = {
  projected: {
    label: '类型',
    tagType: v => CrsCategory.fromProjected(v).tagType,
    format: v => CrsCategory.fromProjected(v).label,
  },
  withZone: {
    label: '带号',
    tagType: 'info',
    format: v => (v ? '带带号' : '无带号'),
  },
  epsgCode: {
    label: 'EPSG',
    tagType: 'primary',
    format: v => `EPSG:${v}`,
  },
  name: {
    label: '名称',
    tagType: 'info',
    format: v => String(v ?? ''),
  },
  centralMeridian: {
    label: '中央经线',
    tagType: 'info',
    format: v => `${v}°`,
  },
  zoneNumber: {
    label: '带号',
    tagType: 'warning',
    format: v => (v == null || v < 0 ? '无' : String(v)),
  },
  zoneDegree: {
    label: '分带度数',
    tagType: 'info',
    format: v => (v == null || v < 0 ? '无' : `${v}°`),
  },
  minLon: {
    label: '最小经度',
    tagType: 'info',
    format: v => String(v ?? ''),
  },
  maxLon: {
    label: '最大经度',
    tagType: 'info',
    format: v => String(v ?? ''),
  },
  envelope: {
    label: '范围',
    tagType: 'info',
    format: v => {
      if (!v) return ''
      return `[${v.left}, ${v.bottom}] – [${v.right}, ${v.top}]`
    },
  },
  crs: {
    label: 'CRS',
    tagType: 'primary',
    format: v => v?.properties?.name ?? '',
  },
}

const isEmpty = computed(() => !props.crsInfo || Object.keys(props.crsInfo).length === 0)

const config = computed<FieldConfig | null>(() => {
  if (FIELD_MAP[props.display]) return FIELD_MAP[props.display]
  return null
})

const rawValue = computed(() => {
  if (!props.crsInfo) return undefined
  return (props.crsInfo as unknown as Record<string, unknown>)[props.display]
})

const displayText = computed(() => {
  if (isEmpty.value) return ''
  if (config.value) return config.value.format(rawValue.value, props.crsInfo as CrsInfo)
  if (rawValue.value == null) return ''
  if (typeof rawValue.value === 'object') return JSON.stringify(rawValue.value)
  return String(rawValue.value)
})

const tagType = computed(() => {
  if (props.type) return props.type
  if (!config.value) return 'info'
  const tt = config.value.tagType
  return typeof tt === 'function' ? tt(rawValue.value) : tt
})
const tagEffect = computed(() => props.effect)
</script>

<template>
  <el-tag v-if="!isEmpty && displayText" :type="tagType" :size="size" :effect="tagEffect" class="crs-info-render">
    <!-- <span v-if="config" class="crs-info-render-label">{{ config.label }}：</span> -->
    {{ displayText }}
  </el-tag>
  <span v-else class="crs-info-render-empty">—</span>
</template>

<style scoped>
.crs-info-render {
  white-space: nowrap;
}

.crs-info-render-empty {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
