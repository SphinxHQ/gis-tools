<!--
@file Map control panel component
@description 统一地图工具条：图形列表、城市选择、坐标系切换、绘制功能层叠按钮。
             所有地图交互功能集中在工具条，地图区域只保留底图。
@author yuanyu <yuanyu@supermap.com>
@date 2026-04-13
-->
<template>
  <div class="map-control-panel">
    <div class="gismap-btns-wrap">
      <div class="gismap-btns">
        <!-- 1. 图形列表展开按钮（带 badge 显示数量，点击弹出已绘制要素列表） -->
        <gis-action-sheet
          v-model:visible="featureListVisible"
          title="已绘制要素列表"
          :width="320"
          placement="bottom"
          mobile-size="60%"
        >
          <template #reference>
            <el-badge :value="featureList.length" :hidden="featureList.length === 0" class="feature-list-badge">
              <button type="button" class="gismap-btn" title="已绘制要素列表">
                <el-icon><Fold /></el-icon>
                <span>列表</span>
              </button>
            </el-badge>
          </template>
          <!-- 要素列表 -->
          <el-table :data="featureList" size="small" :max-height="280">
            <el-table-column type="index" label="#" width="40" />
            <el-table-column prop="type" label="类型" width="60" />
            <el-table-column label="操作" min-width="80">
              <template #default="{ row }">
                <el-button text size="small" :title="row.hidden ? '显示' : '隐藏'" @click="emit('toggle-feature-visible', row.id)">
                  <el-icon><View v-if="row.hidden" /><Hide v-else /></el-icon>
                </el-button>
                <el-button text size="small" type="danger" title="移除" @click="emit('remove-feature', row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <template #footer>
            <el-button type="primary" size="small" :disabled="featureList.length === 0" @click="handleSubmit">确定</el-button>
          </template>
        </gis-action-sheet>

        <!-- 2. 城市选择下拉框 -->
        <map-city-selector :map-name="mapName" class="city-selector" />

        <!-- 3. 坐标系选择按钮（简化文字：仅显示 EPSG:4490，移动端只显示数字） -->
        <gis-action-sheet
          v-model:visible="crsVisible"
          title="切换坐标系"
          :width="640"
          placement="bottom"
          mobile-size="80%"
          @show="crsSelectorKey++"
        >
          <template #reference>
            <button type="button" class="gismap-btn crs-btn" title="切换坐标系">
              <span class="crs-prefix">EPSG:</span>{{ crsCode }}
            </button>
          </template>
          <gis-crs-selector
            :key="crsSelectorKey"
            mode="all"
            :show-confirm="true"
            @change="handleCrsChange"
            @cancel="handleCrsCancel"
          />
        </gis-action-sheet>

        <!-- 4. 绘制功能层叠按钮（点/线/面/结/清 收进 dropdown） -->
        <el-dropdown trigger="click" @command="handleDrawCommand">
          <button type="button" class="gismap-btn" title="绘制工具">
            <el-icon><EditPen /></el-icon>
            <span>绘制</span>
            <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="Point">点</el-dropdown-item>
              <el-dropdown-item command="LineString">线</el-dropdown-item>
              <el-dropdown-item command="Polygon">面</el-dropdown-item>
              <el-dropdown-item command="None">结</el-dropdown-item>
              <el-dropdown-item divided command="clean">清</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Fold, View, Hide, Delete, EditPen, ArrowDown } from '@element-plus/icons-vue';

import GisCrsSelector from '~/components/data/GisCrsSelector.vue';
import { CrsInfo } from '~/components/data/GisProjectedBounds';
import GisActionSheet from '~/components/common/GisActionSheet.vue';
import MapCitySelector from "~/components/gismap/MapCitySelector.vue";
import { eventBus } from '~/composables/eventBus';

import { GisMapDrawEvent, GisMapCleanDrawEvent, Types as MapTypes } from './events/GisMapEvents';

/** 已绘制要素项类型 */
interface DrawnFeature {
  id: string
  type: string
  feature: Record<string, unknown>
  hidden?: boolean
}

const props = defineProps({
  mapName: {
    type: String,
    default: 'main'
  },
  /** 已绘制要素列表（由父组件 MapDrawer 管理，传入供工具条展示） */
  featureList: {
    type: Array as () => DrawnFeature[],
    default: () => []
  }
})
const emit = defineEmits<{
  'crs-change': [epsgCode: number]
  'remove-feature': [id: string]
  'toggle-feature-visible': [id: string]
  'submit': []
}>()

const crsCode = ref<number>(4490)
const crsSelectorKey = ref(0)
// GisActionSheet 显隐控制（替代原 el-popover ref）
const featureListVisible = ref(false)
const crsVisible = ref(false)

const cleanBefore = ref<boolean>(true)
const once = ref<boolean>(false)
const keep = ref<boolean>(true)

/** 绘制工具命令处理（来自 dropdown） */
const handleDrawCommand = (command: string) => {
  if (command === 'clean') {
    handleCleanDraw()
    return
  }
  handleDrawTool(command as 'Polygon' | 'Point' | 'LineString' | 'None')
}

const handleDrawTool = (type: ('Polygon' | 'Point' | 'LineString' | 'None')) => {
  eventBus.emit(props.mapName, new GisMapDrawEvent({ type, cleanBefore, once, keep }))
}

const handleCleanDraw = () => {
  eventBus.emit(props.mapName, new GisMapCleanDrawEvent())
}

const handleCrsChange = (crs: CrsInfo) => {
  crsCode.value = crs.epsgCode
  emit('crs-change', crs.epsgCode)
  crsVisible.value = false
}

const handleCrsCancel = () => {
  crsVisible.value = false
}

/** 提交绘制结果 */
const handleSubmit = () => {
  emit('submit')
  featureListVisible.value = false
}

const drawEndHandler = async (data: unknown) => {
  // 绘制结束事件由父组件 MapDrawer 通过 eventBus 处理 featureList 更新
  void data
}

onMounted(() => {
  eventBus.on(props.mapName, MapTypes.DRAWEND, drawEndHandler)
})
onBeforeUnmount(() => {
  eventBus.off(props.mapName, MapTypes.DRAWEND, drawEndHandler)
})
</script>

<style scoped>
.map-control-panel {
  padding: 10px 0 0 40px;
}

/* 图形列表 badge 样式 */
.feature-list-badge :deep(.el-badge__content) {
  z-index: 4;
}

/* 图形列表按钮内含图标+文字 */
.feature-list-badge .gismap-btn,
.gismap-btns .gismap-btn:has(.el-icon) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 城市选择器宽度 */
.city-selector {
  width: 140px;
}

/* dropdown 箭头 */
.dropdown-arrow {
  margin-left: 2px;
  font-size: 10px;
}

/* 坐标系按钮：禁止换行和压缩，确保完整文字显示 */
.crs-btn {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  min-width: auto;
  padding: 0 8px;
}

/* 移动端（xs/sm <768px）：压缩工具条元素，避免溢出 */
@media (max-width: 767px) {
  .map-control-panel {
    padding: 4px 0 0 4px;
  }

  /* 城市选择器收窄 */
  .city-selector {
    width: 70px;
  }

  /* 移动端按钮隐藏文字只保留图标，减小 padding */
  .gismap-btns .gismap-btn span {
    display: none;
  }

  /* 坐标系按钮：移动端隐藏 "EPSG:" 前缀，只显示数字，宽度自适应 */
  .crs-btn .crs-prefix {
    display: none;
  }

  .gismap-btns .gismap-btn {
    padding: 0 6px;
    min-width: 32px;
  }

  /* 坐标系按钮覆盖 min-width，让数字完整显示，禁止 flex 压缩 */
  .gismap-btns .crs-btn {
    min-width: auto;
    padding: 0 8px;
    flex-shrink: 0;
  }

  /* 减小元素间距 */
  .gismap-btns {
    gap: 4px;
  }
}
</style>
