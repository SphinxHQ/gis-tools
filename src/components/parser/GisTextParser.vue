<!-- <script lang="ts" setup>
/**
 * @file GIS text parser component
 * @description Tabbed text parser for WKT and GeoJSON input formats.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2024-08-06
 */

import {ref} from "vue";

const activeTab = ref('wkt')
</script>

<template>
  <div class="gis-text-parser-container">
    <el-tabs v-model="activeTab" class="gis-text-parser-tabs">
      <el-tab-pane label="WKT" name="wkt">
        <wkt-parser />
      </el-tab-pane>
      <el-tab-pane label="GeoJSON" name="geojson">
        <geo-json-parser />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-text-parser-container {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 5px;
  box-sizing: border-box;
}

.gis-text-parser-tabs {
  height: 100%;
}

.gis-text-parser-container :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

.gis-text-parser-container :deep(.el-tab-pane) {
  height: 100%;
}
</style> -->
