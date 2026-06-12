<script setup lang="ts">
import { computed, ref } from 'vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import { useGisDataStore } from '~/composables/gisDataStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { addDataset, appendToDataset, activeId } = useGisDataStore()
const appendMode = ref(false)
const readerRef = ref<InstanceType<typeof import('~/components/data/GisDataReader.vue').default> | null>(null)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const handleRead = (data: GisDataInfo) => {
  if (appendMode.value && activeId.value) {
    appendToDataset(activeId.value, data)
  } else {
    addDataset(data)
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
    destroy-on-close
    class="import-dialog"
  >
    <gis-data-reader ref="readerRef" @read="handleRead" />
    <template #footer>
      <div class="dialog-footer">
        <el-switch v-model="appendMode" active-text="追加模式" />
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
}

.dialog-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

<style>
.import-dialog .el-dialog__body {
  height: calc(96vh - 120px);
  overflow: hidden;
  padding: 0 20px;
}
</style>
