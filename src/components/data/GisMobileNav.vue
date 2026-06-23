<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Compass, MapLocation, CircleCheck, Download } from '@element-plus/icons-vue'

import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataExport from '~/components/data/GisDataExport.vue'
import GisDataTransformer from '~/components/data/GisDataTransformer.vue'
import GisDataValidator from '~/components/data/GisDataValidator.vue'
import GisFeatureTree from '~/components/data/GisFeatureTree.vue'

const props = defineProps({
  data: {
    type: Object as () => GisDataInfo,
    default: () => new GisDataInfo()
  },
  instanceId: {
    type: [Number, String],
    default: 0
  },
  mapReady: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'open-import': []
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
  'enter-edit-mode': []
  'exit-edit-mode': []
  'read': [data: unknown]
  'error': [err: Error]
}>()

const activeTab = ref<string>('')
const drawerVisible = ref(false)

const tabs = [
  { name: 'crs', label: '坐标系', icon: Compass },
  { name: 'feature', label: '要素', icon: MapLocation },
  { name: 'validate', label: '校验', icon: CircleCheck },
  { name: 'export', label: '导出', icon: Download },
]

const handleTabClick = (tabName: string) => {
  if (activeTab.value === tabName && drawerVisible.value) {
    drawerVisible.value = false
    activeTab.value = ''
  } else {
    activeTab.value = tabName
    drawerVisible.value = true
  }
}

const handleDrawerClose = () => {
  activeTab.value = ''
}

// 当前活跃数据
const activeData = ref<GisDataInfo>(props.data)
const activeTransformChain = ref<number[]>([])

watch(() => props.data, (newData) => {
  activeData.value = newData
  activeTransformChain.value = newData?.crs?.epsgCode ? [newData.crs.epsgCode] : []
}, { immediate: true })

const handleActiveDataChange = (data: GisDataInfo, transformChain: number[]) => {
  activeData.value = data
  activeTransformChain.value = transformChain
  emit('active-data-change', data, transformChain)
}

const handleRead = (data: unknown) => emit('read', data)
const handleError = (err: Error) => emit('error', err)
const handleEnterEditMode = () => emit('enter-edit-mode')
const handleExitEditMode = () => emit('exit-edit-mode')

const hasData = computed(() => !!props.data?.features?.length)
const hasActiveData = computed(() => !!activeData.value?.features?.length)
</script>

<template>
  <div class="gis-mobile-nav">
    <!-- 上滑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      direction="btt"
      size="35%"
      :show-close="false"
      :with-header="false"
      class="mobile-drawer"
      @close="handleDrawerClose"
    >
      <div class="drawer-content">
        <div class="drawer-handle" />
        <div class="drawer-body">
          <!-- 坐标系 -->
          <div v-if="activeTab === 'crs' && hasData" class="tab-content">
            <gis-data-transformer
              :data="data"
              @active-data-change="handleActiveDataChange"
            />
          </div>

          <!-- 要素 -->
          <div v-else-if="activeTab === 'feature' && hasActiveData" class="tab-content">
            <gis-feature-tree
              :data="activeData"
              :instance-id="instanceId"
              :map-ready="mapReady"
              @enter-edit-mode="handleEnterEditMode"
              @exit-edit-mode="handleExitEditMode"
            />
          </div>

          <!-- 校验 -->
          <div v-else-if="activeTab === 'validate' && hasActiveData" class="tab-content">
            <gis-data-validator
              :data="activeData"
              :instance-id="instanceId"
              :tree-height="400"
            />
          </div>

          <!-- 导出 -->
          <div v-else-if="activeTab === 'export' && hasActiveData" class="tab-content">
            <gis-data-export :data="activeData" />
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 底部 Tab 导航 -->
    <div class="mobile-tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.name"
        class="mobile-tab-item"
        :class="{ active: activeTab === tab.name && drawerVisible }"
        @click="handleTabClick(tab.name)"
      >
        <el-icon :size="20"><component :is="tab.icon" /></el-icon>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-mobile-nav {
  width: 100%;
}

.mobile-drawer :deep(.el-drawer) {
  border-radius: 12px 12px 0 0;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-handle {
  width: 36px;
  height: 4px;
  background: var(--el-border-color);
  border-radius: 2px;
  margin: 8px auto 4px;
  flex-shrink: 0;
}

.drawer-body {
  flex: 1;
  overflow: hidden;
  padding: 2px;
}

.tab-content {
  width: 100%;
  height: 100%;
}

.mobile-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.mobile-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mobile-tab-item.active {
  color: var(--el-color-primary);
}

.tab-label {
  font-size: 10px;
  line-height: 1;
}
</style>
