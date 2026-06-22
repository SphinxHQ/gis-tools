<script setup lang="ts">
import { ref } from 'vue'

const importDialogVisible = ref(false)
</script>

<template>
  <div class="gis-data-page">
    <gis-data-toolbar />
    <gis-data-import-dialog v-model="importDialogVisible" />
    <div class="data-content">
      <gis-data-set-tabs @open-import="importDialogVisible = true" />
    </div>
  </div>
</template>

<style scoped>
.gis-data-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.data-content {
  flex: 1;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--el-bg-color);
}
</style>
