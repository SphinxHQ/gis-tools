<script setup lang="ts">
import {ElMessageBox} from "element-plus";
import type {TabPaneName} from 'element-plus'
import proj4 from "proj4";
import {computed, nextTick, ref, watch} from 'vue'

import {GisError, GisErrorCode, createUserMessage} from "~/common/GisError";
import {logger} from "~/common/logger";
import GisCrs from "~/components/data/GisCrs";
import GisCrsSelector from "~/components/data/GisCrsSelector.vue";
import GisDataInfo from "~/components/data/GisDataInfo";
import {CrsInfo} from "~/components/data/GisProjectedBounds";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const originData = ref<GisDataInfo>(new GisDataInfo())

const transformGeometry = (geoObj: unknown, fromCrs: CrsInfo, toCrs: CrsInfo) => {
  if (!fromCrs || !toCrs) {
    return;
  }
  const arr = geoObj as unknown[];
  if (Array.isArray(arr)) {
    if ((arr.length === 2 || arr.length === 3) && arr.every(p => typeof p === 'number')) {
      const newPt = proj4(proj4.defs(`EPSG:${fromCrs.epsgCode}`), proj4.defs(`EPSG:${toCrs.epsgCode}`), arr as number[]);
      if (newPt[0] === Infinity || newPt[1] === Infinity) {
         throw new GisError(GisErrorCode.COORDINATE_TRANSFORM_FAILED);
      }
      arr[0] = newPt[0];
      arr[1] = newPt[1];
    } else {
      arr.forEach(g => transformGeometry(g, fromCrs, toCrs));
    }
  } else {
    const obj = geoObj as { coordinates?: unknown };
    if (obj?.coordinates) {
      transformGeometry(obj.coordinates, fromCrs, toCrs);
    }
  }
}
const transformData = (data: GisDataInfo, toCrs: CrsInfo | undefined) => {
  if (toCrs) {
    try {
      const fromCrs = data.crs?.crsInfo;
      if (fromCrs && toCrs && fromCrs.epsgCode !== toCrs.epsgCode) {
        data.features.forEach((feature: { geometry: unknown }) => {
          transformGeometry(feature.geometry, fromCrs, toCrs)
        })
        data.crs = new GisCrs(toCrs.epsgCode);
      }
    }catch (e){
      const msg = createUserMessage(e);
      logger.error('坐标转换失败:', e);
      ElMessageBox.alert(msg, "错误", {
        confirmButtonText: '确定',
        type: 'error',
        callback: () => {
          _handleTabsEdit(toCrs.name, 'remove')
        }
      })
    }
  }
}

const originDataCrsTitle = computed(()=>originData.value?.crs?.crsInfo?.name ? `EPSG:${originData.value?.crs?.crsInfo?.epsgCode}` :'（无）',)
const editableTabsValue = ref<string>('origin')
const editableTabs = ref<Array<{title: unknown; name: string; data: GisDataInfo; crs?: CrsInfo}>>([
  {
    title: originDataCrsTitle,
    name: 'origin',
    data: originData.value,
    crs: undefined,
  },
])

const reloadTabsData = () => {
  editableTabs.value.forEach((item, idx) => {
    if (idx > 0) {
      item.data = GisDataInfo.clone(originData.value)
      transformData(item.data, item.crs)
    }
  })
}

// 监听 props.data 变化，更新数据
watch(() => props.data, (newData) => {
  const data = newData as GisDataInfo;
  originData.value = data;
  // 更新第一个标签页的数据引用（关键修复）
  if (editableTabs.value.length > 0) {
    editableTabs.value[0].data = data;
  }
  nextTick(reloadTabsData)
}, {deep: true, immediate: true})
const _handleTabsEdit = (
    targetName: string | undefined,
    _action: 'remove' | 'add', crs?: CrsInfo
) => {
  if (_action === 'add') {
    const newTabName = targetName || ''
    editableTabs.value.push({
      title: newTabName,
      name: newTabName,
      data: new GisDataInfo(),
      crs: crs
    })
    editableTabsValue.value = newTabName
    reloadTabsData();
  } else if (_action === 'remove') {
    const tabs = editableTabs.value
    let activeName = editableTabsValue.value
    if (activeName === targetName) {
      tabs.forEach((tab, index) => {
        if (tab.name === targetName) {
          const nextTab = tabs[index + 1] || tabs[index - 1]
          if (nextTab) {
            activeName = nextTab.name
          }
        }
      })
    }

    editableTabsValue.value = activeName
    editableTabs.value = tabs.filter((tab) => tab.name !== targetName)
  }
}

const handleTabsEdit = (targetName: TabPaneName | undefined, action: 'remove' | 'add') => {
  if (action === 'add') {
  }
  if (action === 'remove') {
    _handleTabsEdit(targetName as string | undefined, action, undefined);
  }
}
const handleCrsChange = (value: CrsInfo) => {
  dialogTableVisible.value = false;
  _handleTabsEdit(value.name, 'add', value);
}
const dialogTableVisible = ref(false)
</script>

<template>
  <div class="gis-data-transformer-container">
    <el-dialog v-model="dialogTableVisible" title="选择坐标系" width="800">
      <gis-crs-selector v-if="dialogTableVisible" :disable-values="editableTabs.map(x => x.data?.crs?.epsgCode)"
                        @change="handleCrsChange"
/>
    </el-dialog>
    <el-tabs
        v-model="editableTabsValue"
        type="card"
        editable
        class="gis-data-transformer-tabs"
        @edit="handleTabsEdit"
    >
      <template #add-icon>
        <div style="margin-right: 10px; color: var(--el-color-primary)" />
      </template>
      <el-tab-pane
          v-for="item in editableTabs"
          :key="item.name"
          :label="item.title && typeof item.title === 'object' ? (item.title as any).value : item.title"
          :name="item.name"
      >
        <gis-data-viewer :data="item.data" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.gis-data-transformer-container {
  width: 100%;
  height: 670px;
  background: #FFF;
  box-sizing: border-box;
}

.gis-data-transformer-tabs {
height: calc(100%);
}


.gis-data-transformer-container :deep(div > div.el-tabs__content) {
  padding: 5px;
  box-sizing: border-box;
}
</style>
<style>

.gis-crs-selector-box .el-message-box__container,
.gis-crs-selector-box .el-message-box__message {
  width: 100%;
}
.gis-data-transformer-tabs,
.gis-data-transformer-tabs .el-tabs__content,
.gis-data-transformer-tabs .el-tabs--border-card {
  border: none;
}

.gis-data-transformer-tabs .el-tabs__content .el-tab-pane {
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: 0;
}

.gis-data-transformer-tabs > .el-tabs__header > .el-tabs__nav-wrap .el-tabs__item:first-child .el-icon.is-icon-close {
  display: none;
}

.gis-data-transformer-tabs.el-tabs--card > .el-tabs__header .el-tabs__item.is-closable:hover {
  padding-left: 20px;
  padding-right: 20px;
}

</style>
