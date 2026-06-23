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
}
</style>

<style>
.import-dialog .el-dialog__body {
  height: calc(96vh - 120px);
  overflow: hidden;
  padding: 0 20px;
}
</style>
