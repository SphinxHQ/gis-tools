<script setup lang="ts">
import proj4 from 'proj4'
import { computed, ref } from 'vue'

import GisCrs from '~/components/data/GisCrs'
import { CrsBounds, CrsInfo } from '~/components/data/GisProjectedBounds'
import { registerProj4Def } from '~/components/gismap/proj4Defs'

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
})

const emit = defineEmits<{
  change: [value: CrsInfo]
}>()

// === 根据模式过滤 CRS 列表 ===
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

// === 搜索功能 ===
const searchText = ref('')
const filteredCrsList = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return baseCrsList.value
  return baseCrsList.value.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    String(c.epsgCode).includes(keyword) ||
    c.name.split('/')[0].trim().toLowerCase().includes(keyword)
  )
})
const selectedCrsFromSearch = ref<CrsInfo | null>(null)
const handleSearchSelect = (crs: CrsInfo) => {
  selectedCrsFromSearch.value = crs
  curCrsInfo.value = crs
  // 同步到 cascader
  const family = crs.name.split('/')[0].trim()
  const projected = crs.projected
  const cascaderValues: (string | number)[] = []
  cascaderValues.push(projected ? 0 : 2)
  cascaderValues.push(family)
  cascaderValues.push(crs.epsgCode)
  cascader.value = cascaderValues
  if (!props.showConfirm) {
    emit('change', crs)
  }
}
const isSearchActive = computed(() => searchText.value.trim().length > 0)

// === Cascader 浏览 ===
type CascaderOptions = {
  key: any,
  label: string,
  disabled: boolean,
  value?: any,
  isLeaf?: boolean,
  children?: CascaderOptions[]
}

const generateData = () => {
  const optPrj: CascaderOptions = {
    key: 0,
    label: '投影坐标系',
    disabled: false,
    value: { name: '投影坐标系' },
    children: []
  };
  const optGra: CascaderOptions = {
    key: 2,
    label: '地理坐标系',
    disabled: false,
    value: { name: '地理坐标系' },
    children: []
  }
  baseCrsList.value.forEach(item => {
    const projected = item.projected;
    const groupName = item.name.split("/")[0].trim();
    let _opt = projected ? optPrj : optGra;
    if (!_opt.children?.some((item: any) => item.label === groupName)) {
      _opt.children?.push({
        key: groupName,
        label: groupName,
        disabled: false,
        children: []
      })
    }
    const find = _opt?.children?.find(item => item.label === groupName);
    find?.children?.push({
      key: item.epsgCode,
      label: item.name,
      value: item,
      isLeaf: true,
      disabled: props.disableValues.includes(item.epsgCode)
    })
  });
  const result = []
  if (optPrj.children && optPrj.children.length > 0) result.push(optPrj)
  if (optGra.children && optGra.children.length > 0) result.push(optGra)
  return result
}

const cascaderOptions = computed(() => generateData())
const cascader = ref()
const curCrsInfo = ref<CrsInfo>({} as CrsInfo)
const handleChange = (value: any[]) => {
  if (value && value[2]) {
    curCrsInfo.value = value[2]
    selectedCrsFromSearch.value = value[2]
    if (!props.showConfirm) {
      emit('change', value[2])
    }
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
    curCrsInfo.value = customCrsInfo
    selectedCrsFromSearch.value = customCrsInfo
  } catch (e: unknown) {
    customError.value = e instanceof Error ? e.message : '注册失败'
  }
}

// 确认选择
const handleConfirm = () => {
  if (curCrsInfo.value?.epsgCode) {
    emit('change', curCrsInfo.value)
  }
}
</script>

<template>
  <div class="crs-selector" :class="{ 'crs-selector--compact': compact }">
    <!-- 搜索区域 -->
    <el-input
      v-model="searchText"
      placeholder="搜索坐标系（名称或EPSG代码）"
      clearable
      class="crs-search"
    >
      <template #prefix>
        <el-icon><search /></el-icon>
      </template>
    </el-input>

    <!-- 搜索结果 -->
    <div v-if="isSearchActive" class="crs-search-results">
      <el-scrollbar :height="compact ? '200px' : '300px'">
        <div
          v-for="crs in filteredCrsList"
          :key="crs.epsgCode"
          class="crs-search-item"
          :class="{
            'is-selected': selectedCrsFromSearch?.epsgCode === crs.epsgCode,
            'is-disabled': disableValues.includes(crs.epsgCode)
          }"
          @click="!disableValues.includes(crs.epsgCode) && handleSearchSelect(crs)"
        >
          <span class="crs-search-item-code">EPSG:{{ crs.epsgCode }}</span>
          <span class="crs-search-item-name">{{ crs.name }}</span>
          <el-tag size="small" :type="crs.projected ? 'warning' : 'success'">
            {{ crs.projected ? '投影' : '地理' }}
          </el-tag>
        </div>
        <div v-if="filteredCrsList.length === 0" class="crs-search-empty">
          未找到匹配的坐标系
        </div>
      </el-scrollbar>
    </div>

    <!-- Cascader 浏览 -->
    <div v-else>
      <el-cascader-panel
        v-model="cascader"
        filterable
        class="w-full"
        :options="cascaderOptions"
        @change="handleChange"
      >
        <template #default="{ data }">
          <span>{{ data.label }}</span>
          <span v-if="data.children"> ({{ data.children.length }}) </span>
        </template>
      </el-cascader-panel>
    </div>

    <!-- 选中信息（非紧凑模式） -->
    <el-descriptions v-if="!compact && curCrsInfo?.epsgCode" border :column="2" class="crs-detail">
      <el-descriptions-item label-class-name="w-80px" label="坐标系名称">
        <span class="c-value">{{ curCrsInfo.name }}</span>
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="坐标系代码">
        <span class="c-value">{{ curCrsInfo.epsgCode }}</span>
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="坐标系类型">
        <span class="c-value">{{ curCrsInfo.projected ? '投影坐标系' : '地理坐标系' }}</span>
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="带号">
        <span class="c-value">{{ curCrsInfo.withZone ? curCrsInfo.zoneNumber : '无' }}</span>
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="中央经线">
        <span class="c-value">{{ curCrsInfo.centralMeridian }}</span>
      </el-descriptions-item>
      <el-descriptions-item label-class-name="w-80px" label="经度范围">
        <span class="c-value">{{ curCrsInfo.minLon }} ~ {{ curCrsInfo.maxLon }}</span>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 操作栏 -->
    <div v-if="showConfirm || !compact" class="c-button">
      <el-button v-if="!compact" size="small" @click="showCustomInput = !showCustomInput">
        自定义proj4
      </el-button>
      <el-button v-if="showConfirm" type="primary" :disabled="!curCrsInfo?.epsgCode" @click="handleConfirm">
        确定
      </el-button>
    </div>

    <!-- 自定义 proj4 输入（非紧凑模式） -->
    <div v-if="!compact && showCustomInput" class="custom-proj4">
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

.crs-search {
  flex-shrink: 0;
}

.crs-search-results {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.crs-search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.crs-search-item:hover {
  background: var(--el-fill-color-light);
}

.crs-search-item.is-selected {
  background: var(--el-color-primary-light-9);
}

.crs-search-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.crs-search-item-code {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-color-primary);
  min-width: 90px;
}

.crs-search-item-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crs-search-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.crs-detail {
  flex-shrink: 0;
}

.c-value {
  display: inline-block;
  width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.c-button {
  display: flex;
  justify-content: space-between;
  gap: 8px;
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
