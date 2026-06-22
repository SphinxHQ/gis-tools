<script setup lang="ts">
import { computed, ref } from 'vue'

import GisCrs from '~/components/data/GisCrs'
import { CrsInfo } from '~/components/data/GisProjectedBounds'

const props = defineProps<{
  sourceCrs: CrsInfo | null
  existingEpsgCodes: number[]
}>()

const emit = defineEmits<{
  select: [value: CrsInfo]
  cancel: []
}>()

const searchText = ref('')

const compatibleTargets = computed(() => {
  if (!props.sourceCrs) return []
  return GisCrs.getCompatibleTargetCrsList(props.sourceCrs)
})

const filteredTargets = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const targets = compatibleTargets.value
  if (!keyword) return targets
  return targets.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    String(c.epsgCode).includes(keyword) ||
    c.name.split('/')[0].trim().toLowerCase().includes(keyword)
  )
})

const selectedCrs = ref<CrsInfo | null>(null)

const isDisabled = (crs: CrsInfo) => props.existingEpsgCodes.includes(crs.epsgCode)

const handleSelect = (crs: CrsInfo) => {
  if (isDisabled(crs)) return
  selectedCrs.value = crs
}

const handleConfirm = () => {
  if (selectedCrs.value && !isDisabled(selectedCrs.value)) {
    emit('select', selectedCrs.value)
  }
}

const sourceCrsLabel = computed(() => {
  if (!props.sourceCrs) return '（无）'
  return `EPSG:${props.sourceCrs.epsgCode}`
})

// 按族名分组
const groupedTargets = computed(() => {
  const groups: Record<string, CrsInfo[]> = {}
  for (const crs of filteredTargets.value) {
    const family = crs.name.split('/')[0].trim()
    if (!groups[family]) groups[family] = []
    groups[family].push(crs)
  }
  return groups
})
</script>

<template>
  <div class="crs-transform-selector">
    <!-- 源CRS信息 -->
    <div class="source-info">
      <span class="source-label">当前坐标系：</span>
      <el-tag type="primary">{{ sourceCrsLabel }}</el-tag>
      <el-tag v-if="sourceCrs" :type="sourceCrs.projected ? 'warning' : 'success'" size="small">
        {{ sourceCrs.projected ? '投影' : '地理' }}
      </el-tag>
    </div>

    <!-- 搜索 -->
    <el-input
      v-model="searchText"
      placeholder="搜索目标坐标系"
      clearable
    >
      <template #prefix>
        <el-icon><search /></el-icon>
      </template>
    </el-input>

    <!-- 目标列表 -->
    <el-scrollbar height="350px" class="target-list">
      <div v-for="(crsList, family) in groupedTargets" :key="family" class="target-group">
        <div class="target-group-title">{{ family }}</div>
        <div
          v-for="crs in crsList"
          :key="crs.epsgCode"
          class="target-item"
          :class="{
            'is-selected': selectedCrs?.epsgCode === crs.epsgCode,
            'is-disabled': isDisabled(crs)
          }"
          @click="handleSelect(crs)"
        >
          <span class="target-item-code">EPSG:{{ crs.epsgCode }}</span>
          <span class="target-item-name">{{ crs.name }}</span>
          <el-tag size="small" :type="crs.projected ? 'warning' : 'success'">
            {{ crs.projected ? '投影' : '地理' }}
          </el-tag>
        </div>
      </div>
      <div v-if="filteredTargets.length === 0" class="target-empty">
        无可转换的坐标系
      </div>
    </el-scrollbar>

    <!-- 操作 -->
    <div class="selector-footer">
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button
        type="primary"
        :disabled="!selectedCrs || isDisabled(selectedCrs)"
        @click="handleConfirm"
      >
        转换
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.crs-transform-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.target-list {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.target-group-title {
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

.target-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.target-item:hover:not(.is-disabled) {
  background: var(--el-fill-color-light);
}

.target-item.is-selected {
  background: var(--el-color-primary-light-9);
}

.target-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.target-item-code {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-color-primary);
  min-width: 90px;
}

.target-item-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.selector-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
