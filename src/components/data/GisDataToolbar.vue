<script setup lang="ts">
import { computed } from 'vue'

import { themeMode } from '~/composables/dark'
import { useGisDataStore } from '~/composables/gisDataStore'

const { datasets } = useGisDataStore()
const datasetCount = computed(() => datasets.value.length)
</script>

<template>
  <div class="gis-data-toolbar">
    <div class="toolbar-left">
      <svg class="toolbar-logo" viewBox="0 0 44 44" width="22" height="22" aria-hidden="true">
        <polygon points="22,5 39,17 33,39 11,39 5,17" fill="rgba(234,88,12,0.18)" stroke="#ea580c" stroke-width="3.5" stroke-linejoin="round" />
      </svg>
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

.toolbar-logo {
  flex-shrink: 0;
  border-radius: 5px;
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
