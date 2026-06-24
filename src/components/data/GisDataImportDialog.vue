<script setup lang="ts">
/**
 * @file GIS data import dialog
 * @description A dialog for importing spatial data files with format selection,
 *              encoding options, and dataset naming.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-13
 */
import { computed, ref } from 'vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import { useGisDataStore } from '~/composables/gisDataStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { addDataSource, appendToDataset, datasets, dataSources } = useGisDataStore()
const appendMode = ref(false)
const appendTargetId = ref<string | null>(null)
const readerRef = ref<InstanceType<typeof import('~/components/data/GisDataReader.vue').default> | null>(null)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const handleRead = (data: GisDataInfo) => {
  if (appendMode.value && appendTargetId.value) {
    appendToDataset(appendTargetId.value, data)
  } else {
    addDataSource(data)
  }
  dialogVisible.value = false
}

const showTextConfirm = computed(() => {
  return readerRef.value?.activeReaderTab === 'text' && readerRef.value?.txt?.trim()
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入数据"
    width="96%"
    top="2vh"
    :close-on-click-modal="false"
    :show-close="false"
    destroy-on-close
    class="import-dialog"
  >
    <gis-data-reader ref="readerRef" @read="handleRead" />
    <template #footer>
      <div class="dialog-footer">
        <div class="dialog-footer-left">
          <el-switch v-model="appendMode" active-text="追加模式" />
          <template v-if="appendMode">
            <el-select
              v-model="appendTargetId"
              placeholder="选择目标数据集"
              size="small"
              style="width: 240px"
              :disabled="datasets.length === 0"
            >
              <el-option-group
                v-for="source in dataSources"
                :key="source.id"
                :label="source.name"
              >
                <el-option
                  v-for="ds in source.datasets"
                  :key="ds.id"
                  :label="`${ds.name} (${ds.data?.features?.length ?? 0} 要素)`"
                  :value="ds.id"
                />
              </el-option-group>
            </el-select>
          </template>
        </div>
        <div class="dialog-footer-right">
          <el-button
            v-if="showTextConfirm"
            type="primary"
            :loading="readerRef?.loading ?? false"
            @click="readerRef?.handleTextConfirm()"
          >确认解析</el-button>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
}

.dialog-footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
</style>

<style>
.import-dialog .el-dialog__body {
  height: calc(96vh - 120px);
  overflow: hidden;
  padding: 0 20px;
}

/* 桌面端弹窗宽度限制（≥768px 时最大宽度 880px，确保 table 6 列不拥挤） */
@media (min-width: 768px) {
  .el-overlay-dialog .import-dialog.el-dialog {
    max-width: 880px;
  }
}

/* 移动端导入弹窗：隐藏 header，完全铺满，所有 padding 清零 */
@media (max-width: 767px) {
  .el-overlay-dialog .import-dialog.el-dialog {
    display: flex;
    flex-direction: column;
    padding: 0 !important;
  }

  /* 隐藏顶部 header */
  .el-overlay-dialog .import-dialog .el-dialog__header {
    display: none !important;
  }

  /* body 完全铺满，padding 清零 */
  .el-overlay-dialog .import-dialog .el-dialog__body {
    flex: 1 !important;
    height: auto !important;
    min-height: 0;
    padding: 0 !important;
  }

  /* footer padding */
  .el-overlay-dialog .import-dialog .el-dialog__footer {
    padding: 10px !important;
    flex-shrink: 0;
  }

  .import-dialog .dialog-footer {
    gap: 6px;
    padding: 6px 8px;
  }

  .import-dialog .dialog-footer-left {
    gap: 6px;
  }

  .import-dialog .dialog-footer-left .el-select {
    width: 160px !important;
  }

  .import-dialog .dialog-footer-right {
    margin-left: auto;
  }
}
</style>
