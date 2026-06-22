<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import type { TabPaneName } from 'element-plus'
import { computed } from 'vue'

import { GisError, createUserMessage } from '~/common/GisError'
import { SimpleDataFormat } from '~/components/data/DataFormat'
import { useGisDataStore } from '~/composables/gisDataStore'

defineEmits<{
  'open-import': []
}>()

const { datasets, activeId, setActive, removeDataset, addDataset } = useGisDataStore()

const activeTab = computed({
  get: () => activeId.value ?? '',
  set: (val: string) => setActive(val),
})

const handleTabRemove = (name: TabPaneName | undefined) => {
  if (!name) return
  removeDataset(name as string)
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const buffer = await readFileAsArrayBuffer(file)
      const simpleDataFormat = new SimpleDataFormat()
      const data = await simpleDataFormat.read(buffer)
      data.name = file.name
      addDataset(data)
    } catch (err: unknown) {
      let msg = createUserMessage(err)
      if (err instanceof GisError) {
        msg = `[${err.code}]\n\n${msg}`
      }
      ElMessageBox.alert(msg, '解析失败', { type: 'error' })
    }
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
</script>

<template>
  <div
    class="gis-data-set-tabs"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <!-- 空状态 -->
    <div v-if="datasets.length === 0" class="empty-state">
      <div class="empty-content">
        <el-icon :size="48" color="var(--el-color-info-light-3)">
          <upload-filled />
        </el-icon>
        <p class="empty-title">暂无数据</p>
        <p class="empty-desc">拖拽文件到此处导入</p>
      </div>
    </div>

    <!-- 数据Tab -->
    <el-tabs
      v-else
      v-model="activeTab"
      type="card"
      editable
      class="dataset-tabs"
      @edit="handleTabRemove"
    >
      <template #add-icon>
        <span />
      </template>
      <el-tab-pane
        v-for="entry in datasets"
        :key="entry.id"
        :label="entry.name"
        :name="entry.id"
      >
        <gis-data-transformer :data="entry.data" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-data-set-tabs {
  width: 100%;
  height: 100%;
}

.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--el-border-color-lighter);
  border-radius: 8px;
  box-sizing: border-box;
  background: var(--el-fill-color-lighter);
  transition: border-color 0.3s, background 0.3s;
}

.empty-state:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin: 8px 0 0 0;
}

.empty-desc {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin: 0;
}

.dataset-tabs {
  height: 100%;
}

.dataset-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
}

.dataset-tabs :deep(.el-tabs__content .el-tab-pane) {
  height: 100%;
  overflow: auto;
}
</style>
