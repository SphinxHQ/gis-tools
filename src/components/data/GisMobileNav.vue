<script setup lang="ts">
/**
 * @file Mobile navigation component (Phase 2 rewrite)
 * @description Bottom navigation bar for mobile layout. Uses GisBottomSheet instead
 *              of el-drawer for proper snap points and drag affordance. Tab content
 *              uses v-show instead of v-if to preserve component state across switches.
 *              Shares Tab state logic with GisDataPanel via useDataPanelTabs composable
 *              (single code path, no isMobile branching).
 *
 * @theory Norman《Design of Everyday Things》: Bottom Sheet handle is a signifier
 *         for drag affordance; snap points provide clear mapping.
 * @theory Hoober《Designing for Touch》: Tab bar at bottom is in thumb's green zone.
 * @theory Miller's Law: 4 tabs (±2) is within working memory capacity.
 *
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-06-25
 */
import { Compass, MapLocation, CircleCheck, Download } from '@element-plus/icons-vue'
import { ref } from 'vue'

import GisBottomSheet from '~/components/data/GisBottomSheet.vue'
import GisDataExport from '~/components/data/GisDataExport.vue'
import GisDataInfo from '~/components/data/GisDataInfo'
import GisDataTransformer from '~/components/data/GisDataTransformer.vue'
import GisDataValidator from '~/components/data/GisDataValidator.vue'
import GisFeatureTree from '~/components/data/GisFeatureTree.vue'
import { useDataPanelTabs, type DataPanelTab } from '~/composables/useDataPanelTabs'

// 对外 props 接口保持不变（与一期一致）
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

// 对外 events 接口保持不变
const emit = defineEmits<{
  'open-import': []
  'active-data-change': [data: GisDataInfo, transformChain: number[]]
  'enter-edit-mode': []
  'exit-edit-mode': []
  'read': [data: unknown]
  'error': [err: Error]
}>()

// 复用共享 Tab 状态逻辑（与 GisDataPanel 同一代码路径）
const {
  activeTab,
  activeData,
  hasData,
  hasActiveData,
  handleActiveDataChange,
  handleEnterEditMode,
  handleExitEditMode,
} = useDataPanelTabs(props, emit, '')

// Bottom Sheet 可见性
const sheetVisible = ref(false)

// Tab 定义（图标 + 标签）
const tabs = [
  { name: 'crs' as DataPanelTab, label: '坐标系', icon: Compass },
  { name: 'feature' as DataPanelTab, label: '要素', icon: MapLocation },
  { name: 'validate' as DataPanelTab, label: '校验', icon: CircleCheck },
  { name: 'export' as DataPanelTab, label: '导出', icon: Download },
]

/**
 * 点击 Tab：同 Tab 再次点击则关闭 Sheet，否则切换并打开
 * @param tabName - Tab 标识
 */
const handleTabClick = (tabName: DataPanelTab) => {
  if (activeTab.value === tabName && sheetVisible.value) {
    sheetVisible.value = false
  } else {
    activeTab.value = tabName
    sheetVisible.value = true
  }
}

/**
 * Sheet 关闭时重置 activeTab（与一期行为一致）
 */
const handleSheetClose = (visible: boolean) => {
  if (!visible) {
    activeTab.value = ''
  }
}
</script>

<template>
  <div class="gis-mobile-nav">
    <!-- Bottom Sheet（替代 el-drawer） -->
    <GisBottomSheet
      :visible="sheetVisible"
      :snap-points="[25, 40, 80]"
      :default-snap="1"
      @update:visible="handleSheetClose"
    >
      <!-- Tab 内容区：使用 v-show 保留组件状态，避免重挂载 -->
      <div class="sheet-body">
        <!-- 坐标系 -->
        <div v-show="activeTab === 'crs'" class="tab-content">
          <gis-data-transformer
            v-if="hasData"
            :data="data"
            @active-data-change="handleActiveDataChange"
          />
          <div v-else class="tab-empty">
            <el-icon :size="32" color="var(--el-text-color-placeholder)"><Compass /></el-icon>
            <p>请先导入数据</p>
          </div>
        </div>

        <!-- 要素 -->
        <div v-show="activeTab === 'feature'" class="tab-content">
          <gis-feature-tree
            v-if="hasActiveData"
            :data="activeData"
            :instance-id="instanceId"
            :map-ready="mapReady"
            @enter-edit-mode="handleEnterEditMode"
            @exit-edit-mode="handleExitEditMode"
          />
          <div v-else class="tab-empty">
            <el-icon :size="32" color="var(--el-text-color-placeholder)"><MapLocation /></el-icon>
            <p>暂无要素数据</p>
          </div>
        </div>

        <!-- 校验 -->
        <div v-show="activeTab === 'validate'" class="tab-content">
          <gis-data-validator
            v-if="hasActiveData"
            :data="activeData"
            :instance-id="instanceId"
            :tree-height="400"
          />
          <div v-else class="tab-empty">
            <el-icon :size="32" color="var(--el-text-color-placeholder)"><CircleCheck /></el-icon>
            <p>暂无校验数据</p>
          </div>
        </div>

        <!-- 导出 -->
        <div v-show="activeTab === 'export'" class="tab-content">
          <gis-data-export
            v-if="hasActiveData"
            :data="activeData"
          />
          <div v-else class="tab-empty">
            <el-icon :size="32" color="var(--el-text-color-placeholder)"><Download /></el-icon>
            <p>暂无导出数据</p>
          </div>
        </div>
      </div>
    </GisBottomSheet>

    <!-- 底部 Tab 导航栏（56px 高度，拇指热区） -->
    <div class="mobile-tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.name"
        class="mobile-tab-item"
        :class="{ active: activeTab === tab.name && sheetVisible }"
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
  /* 在父级 .mobile-nav-area (display: flex) 中占满主轴宽度（row 方向） */
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Sheet 内容区 */
.sheet-body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tab-content {
  width: 100%;
  height: 100%;
}

/* 空状态提示 */
.tab-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
}

.tab-empty p {
  margin: 0;
  font-size: 13px;
}

/* 底部 Tab 导航栏：56px 高度（含 border），符合拇指热区 */
.mobile-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  box-sizing: border-box;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

/* Tab 项：触控热区 ≥48dp */
.mobile-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mobile-tab-item.active {
  color: var(--el-color-primary);
}

/* Tab 标签字号：11px（符合移动端最小字号规范 L4-09） */
.tab-label {
  font-size: 11px;
  line-height: 1;
}
</style>
