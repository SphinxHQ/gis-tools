<script setup lang="ts">
import { computed } from 'vue'

import { themeMode } from '~/composables/dark'
import { useGisDataStore } from '~/composables/gisDataStore'

const emit = defineEmits<{
  'open-import': []
}>()

const { datasets } = useGisDataStore()
const datasetCount = computed(() => datasets.value.length)
</script>

<template>
  <div class="gis-data-toolbar">
    <div class="toolbar-left">
      <el-button type="primary" size="small" @click="emit('open-import')">
        <el-icon><upload-filled /></el-icon>
        导入数据
      </el-button>
      <span class="toolbar-title">Gis Tools</span>
    </div>
    <div class="toolbar-right">
      <a href="mailto:yuanyu@supermap.com" class="toolbar-contact" title="yuanyu@supermap.com">
        <el-icon :size="14"><Message /></el-icon>
        <span>yuanyu@supermap.com</span>
      </a>
      <span v-if="datasetCount > 0" class="toolbar-badge">{{ datasetCount }} 个数据集</span>
      <el-radio-group v-model="themeMode" size="small" class="theme-switch">
        <el-radio-button value="auto">
          <el-icon :size="14"><Monitor /></el-icon>
        </el-radio-button>
        <el-radio-button value="light">
          <el-icon :size="14"><Sunny /></el-icon>
        </el-radio-button>
        <el-radio-button value="dark">
          <el-icon :size="14"><Moon /></el-icon>
        </el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>

<style scoped>
.gis-data-toolbar {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.5px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-badge {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 10px;
}

.toolbar-contact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  transition: color 0.2s, background 0.2s;
}

.toolbar-contact:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.theme-switch :deep(.el-radio-button__inner) {
  padding: 4px 8px;
}
</style>
