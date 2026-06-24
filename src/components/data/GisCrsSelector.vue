<script setup lang="ts">
/**
 * @file CRS selector component
 * @description Provides a searchable dropdown for selecting a coordinate reference system,
 *              filtering by category (projected/geographic) and EPSG code.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
import proj4 from 'proj4'
import { computed, ref } from 'vue'

import GisCrs from '~/components/data/GisCrs'
import { CrsBounds, CrsInfo } from '~/components/data/GisProjectedBounds'
import { registerProj4Def } from '~/components/gismap/proj4Defs'
import CrsInfoRender from '~/components/renders/CrsInfoRender.vue'

const props = defineProps({
  /** 禁用的 EPSG 代码列表 */
  disableValues: {
    type: Array as () => number[],
    default: () => []
  },
  /** 选择模式：all=全部, geographic=仅地理, projected=仅投影, compatible=仅兼容目标 */
  mode: {
    type: String as () => 'all' | 'geographic' | 'projected' | 'compatible',
    default: 'all'
  },
  /** 当 mode='compatible' 时的源坐标系 */
  sourceCrs: {
    type: Object as () => CrsInfo | null,
    default: null
  },
  /** 紧凑模式：隐藏详情描述和自定义proj4 */
  compact: {
    type: Boolean,
    default: false
  },
  /** 是否显示确认按钮（false 时点击即选中） */
  showConfirm: {
    type: Boolean,
    default: true
  },
  /** 确认按钮文字 */
  confirmText: {
    type: String,
    default: '确定'
  },
  /** 是否在顶部展示源坐标系信息（转换场景） */
  showSourceInfo: {
    type: Boolean,
    default: false
  },
})

const emit = defineEmits<{
  change: [value: CrsInfo]
  cancel: []
}>()

// === 类型筛选 ===
type CategoryFilter = 'all' | 'geographic' | 'projected'
const categoryFilter = ref<CategoryFilter>('all')

// === 根据模式 + 类型筛选过滤 CRS 列表 ===
const baseCrsList = computed(() => {
  let list = Object.values(CrsBounds).sort((a, b) => a.epsgCode - b.epsgCode)
  switch (props.mode) {
    case 'geographic':
      return list.filter(c => !c.projected)
    case 'projected':
      return list.filter(c => c.projected)
    case 'compatible':
      if (props.sourceCrs) {
        return GisCrs.getCompatibleTargetCrsList(props.sourceCrs)
      }
      return list
    default:
      return list
  }
})

const categoryFilteredList = computed(() => {
  switch (categoryFilter.value) {
    case 'geographic':
      return baseCrsList.value.filter(c => !c.projected)
    case 'projected':
      return baseCrsList.value.filter(c => c.projected)
    default:
      return baseCrsList.value
  }
})

// === 搜索功能 ===
const searchText = ref('')
const filteredCrsList = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return categoryFilteredList.value
  return categoryFilteredList.value.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    String(c.epsgCode).includes(keyword) ||
    c.name.split('/')[0].trim().toLowerCase().includes(keyword)
  )
})

// 按族名分组
const groupedCrsList = computed(() => {
  const groups: Record<string, CrsInfo[]> = {}
  for (const crs of filteredCrsList.value) {
    const family = crs.name.split('/')[0].trim()
    if (!groups[family]) groups[family] = []
    groups[family].push(crs)
  }
  return groups
})

const selectedCrs = ref<CrsInfo | null>(null)
const isDisabled = (crs: CrsInfo) => props.disableValues.includes(crs.epsgCode)

const handleSelect = (crs: CrsInfo) => {
  if (isDisabled(crs)) return
  selectedCrs.value = crs
  if (!props.showConfirm) {
    emit('change', crs)
  }
}

// === 自定义 proj4 输入 ===
const showCustomInput = ref(false)
const customEpsg = ref('')
const customDef = ref('')
const customError = ref('')
const handleCustomRegister = () => {
  const code = parseInt(customEpsg.value.trim())
  if (isNaN(code) || code <= 0) {
    customError.value = '请输入有效的EPSG代码'
    return
  }
  const def = customDef.value.trim()
  if (!def) {
    customError.value = '请输入proj4定义字符串'
    return
  }
  try {
    registerProj4Def(code, def)
    const verified = proj4.defs(`EPSG:${code}`)
    if (!verified) {
      customError.value = 'proj4定义注册失败'
      return
    }
    customError.value = ''
    showCustomInput.value = false
    const customCrsInfo: CrsInfo = {
      projected: !def.includes('+proj=longlat'),
      envelope: { top: 90, left: -180, bottom: -90, right: 180 },
      minLon: -180,
      maxLon: 180,
      withZone: false,
      crs: { type: 'name', properties: { name: `EPSG:${code}` } },
      epsgCode: code,
      name: `Custom EPSG:${code}`,
      centralMeridian: 0,
    }
    selectedCrs.value = customCrsInfo
    if (!props.showConfirm) {
      emit('change', customCrsInfo)
    }
  } catch (e: unknown) {
    customError.value = e instanceof Error ? e.message : '注册失败'
  }
}

// 确认选择
const handleConfirm = () => {
  if (selectedCrs.value?.epsgCode) {
    emit('change', selectedCrs.value)
  }
}
</script>

<template>
  <div class="crs-selector" :class="{ 'crs-selector--compact': compact }">
    <!-- 源坐标系信息（转换场景） -->
    <div v-if="showSourceInfo && sourceCrs" class="source-info">
      <span class="source-label">当前坐标系：</span>
      <CrsInfoRender :crs-info="sourceCrs" display="epsgCode" />
      <CrsInfoRender :crs-info="sourceCrs" display="projected" />
    </div>

    <!-- 搜索 + 类型筛选 -->
    <div class="crs-search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索坐标系（名称或EPSG代码）"
        clearable
        class="crs-search-input"
      >
        <template #prefix>
          <el-icon><search /></el-icon>
        </template>
      </el-input>
      <el-select v-if="mode === 'all' || mode === 'compatible'" v-model="categoryFilter" class="crs-category-select">
        <el-option label="全部" value="all" />
        <el-option label="地理" value="geographic" />
        <el-option label="投影" value="projected" />
      </el-select>
    </div>

    <!-- 坐标系列表 -->
    <el-scrollbar :height="compact ? '200px' : '300px'" class="crs-list">
      <div v-for="(crsList, family) in groupedCrsList" :key="family" class="crs-group">
        <div class="crs-group-title">{{ family }}</div>
        <div
          v-for="crs in crsList"
          :key="crs.epsgCode"
          class="crs-item"
          :class="{
            'is-selected': selectedCrs?.epsgCode === crs.epsgCode,
            'is-disabled': isDisabled(crs)
          }"
          @click="handleSelect(crs)"
        >
          <CrsInfoRender :crs-info="crs" display="projected" />
          <span class="crs-item-code">EPSG:{{ crs.epsgCode }}</span>
          <span class="crs-item-name">{{ crs.name }}</span>
        </div>
      </div>
      <div v-if="filteredCrsList.length === 0" class="crs-list-empty">
        未找到匹配的坐标系
      </div>
    </el-scrollbar>

    <!-- 选中详情（非紧凑模式） -->
    <el-descriptions v-if="!compact && selectedCrs?.epsgCode" border :column="2" class="crs-detail">
      <el-descriptions-item label-class-name="w-40px" label="名称">
        <CrsInfoRender :crs-info="selectedCrs" display="name" />
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-40px" label="代码">
        <CrsInfoRender :crs-info="selectedCrs" display="epsgCode" />
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-40px" label="类型">
        <CrsInfoRender :crs-info="selectedCrs" display="projected" />
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-40px" label="带号">
        <CrsInfoRender :crs-info="selectedCrs" display="withZone" />
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-40px" label="中线">
        <CrsInfoRender :crs-info="selectedCrs" display="centralMeridian" />
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-40px" label="经度">
        <CrsInfoRender :crs-info="selectedCrs" display="minLon" /> ~ <CrsInfoRender :crs-info="selectedCrs" display="maxLon" />
      </el-descriptions-item>
    </el-descriptions>

    <!-- 操作栏：左下 注册自定义坐标系，右下 按钮组 -->
    <div class="crs-footer">
      <el-button size="small" @click="showCustomInput = !showCustomInput">
        注册自定义坐标系
      </el-button>
      <div class="crs-footer-right">
        <slot name="footer-extra" />
        <el-button @click="emit('cancel')">取消</el-button>
        <el-button v-if="showConfirm" type="primary" :disabled="!selectedCrs?.epsgCode" @click="handleConfirm">
          {{ confirmText }}
        </el-button>
      </div>
    </div>

    <!-- 自定义 proj4 输入 -->
    <div v-if="showCustomInput" class="custom-proj4">
      <el-input v-model="customEpsg" placeholder="EPSG代码，如 32650" size="small" />
      <el-input
        v-model="customDef"
        type="textarea"
        placeholder="proj4定义字符串，如 +proj=utm +zone=50 +datum=WGS84 +units=m +no_defs"
        :rows="2"
        size="small"
      />
      <div v-if="customError" class="custom-error">{{ customError }}</div>
      <el-button size="small" type="primary" @click="handleCustomRegister">注册</el-button>
    </div>
  </div>
</template>

<style scoped>
.crs-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crs-selector--compact {
  gap: 6px;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.source-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.crs-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.crs-search-input {
  flex: 1;
}

.crs-category-select {
  width: 100px;
  flex-shrink: 0;
}

.crs-list {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.crs-group-title {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  position: sticky;
  top: 0;
  z-index: 1;
  letter-spacing: 0.3px;
}

.crs-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.crs-item:hover:not(.is-disabled) {
  background: var(--el-fill-color-light);
}

.crs-item.is-selected {
  background: var(--el-color-primary-light-9);
}

.crs-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.crs-item-code {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-color-primary);
  min-width: 90px;
}

.crs-item-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crs-list-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.crs-detail {
  flex-shrink: 0;
}

.crs-detail :deep(.el-descriptions__label) {
  white-space: nowrap;
}

.crs-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.crs-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  .crs-selector {
    gap: 8px;
  }

  .source-info {
    padding: 6px 10px;
    font-size: 12px;
  }

  .crs-search-input :deep(.el-input__wrapper) {
    padding: 4px 8px;
  }

  .crs-category-select {
    width: 80px;
  }

  .crs-list :deep(.el-scrollbar__bar) {
    display: none;
  }

  .crs-group-title {
    padding: 4px 10px;
    font-size: 11px;
  }

  .crs-item {
    padding: 5px 10px;
    gap: 6px;
  }

  .crs-item-code {
    font-size: 12px;
    min-width: 70px;
  }

  .crs-item-name {
    font-size: 12px;
  }

  /* 移动端：列表项上的 projected tag 缩小 */
  .crs-item :deep(.el-tag) {
    height: 18px;
    padding: 0 5px;
    font-size: 10px;
    line-height: 18px;
  }

  /* 移动端：选中详情用单列展示，缩小 padding */
  .crs-detail :deep(.el-descriptions__label),
  .crs-detail :deep(.el-descriptions__content) {
    padding: 6px 8px;
    font-size: 12px;
  }

  /* 移动端：自定义 proj4 区域紧凑 */
  .custom-proj4 {
    padding: 8px;
    gap: 6px;
  }

  /* 移动端：注册按钮文字缩小 */
  .crs-footer :deep(.el-button) {
    padding: 5px 10px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  /* 超窄屏：隐藏族名分组标题 */
  .crs-group-title {
    display: none;
  }

  .crs-item-code {
    min-width: 60px;
    font-size: 11px;
  }
}

.custom-proj4 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.custom-error {
  color: var(--el-color-danger);
  font-size: 12px;
}
</style>
